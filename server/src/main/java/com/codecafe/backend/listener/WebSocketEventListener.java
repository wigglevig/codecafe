package com.codecafe.backend.listener;

import com.codecafe.backend.dto.DocumentState;
import com.codecafe.backend.dto.UserInfoDTO;
import com.codecafe.backend.service.OtService;
import com.codecafe.backend.service.SessionRegistryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.messaging.MessageHeaders; 
import org.springframework.data.redis.core.StringRedisTemplate; 
import org.springframework.data.redis.core.SetOperations; 
import java.security.Principal;
import java.util.List;
import java.util.Set; 
import java.util.Collections; 

@Component
public class WebSocketEventListener {

    private static final Logger log = LoggerFactory.getLogger(WebSocketEventListener.class);

    private final SessionRegistryService sessionRegistryService;
    private final SimpMessagingTemplate messagingTemplate;
    private final OtService otService;
    private final StringRedisTemplate stringRedisTemplate; 
    private final SetOperations<String, String> setOperations;

    private static final String USER_ACTIVE_DOCS_KEY_PREFIX = "user:active_docs:"; // Match prefix in EditorController

    @Autowired
    public WebSocketEventListener(SessionRegistryService sessionRegistryService,
                                  SimpMessagingTemplate messagingTemplate,
                                  OtService otService,
                                  StringRedisTemplate stringRedisTemplate) { // Inject StringRedisTemplate
        this.sessionRegistryService = sessionRegistryService;
        this.messagingTemplate = messagingTemplate;
        this.otService = otService;
        this.stringRedisTemplate = stringRedisTemplate;
        this.setOperations = stringRedisTemplate.opsForSet(); 
    }

    // Helper to get the tracking key for a user
    private String getUserTrackingKey(String userId) {
        return USER_ACTIVE_DOCS_KEY_PREFIX + userId;
    }

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        MessageHeaders headers = event.getMessage().getHeaders();
        Principal userPrincipal = SimpMessageHeaderAccessor.getUser(headers);
        String simpSessionId = SimpMessageHeaderAccessor.getSessionId(headers);

        if (userPrincipal != null) {
            log.info("WebSocket Connected: User={}, WebSocket SessionId={}", userPrincipal.getName(), simpSessionId);
        } else {
             log.warn("WebSocket Connected: No user principal found. WebSocket SessionId={}", simpSessionId);
        }
    }

    @EventListener
    public void handleWebSocketSubscribeListener(SessionSubscribeEvent event) {
        MessageHeaders headers = event.getMessage().getHeaders();
        Principal userPrincipal = SimpMessageHeaderAccessor.getUser(headers);
        String simpSessionId = SimpMessageHeaderAccessor.getSessionId(headers);
        String destination = SimpMessageHeaderAccessor.getDestination(headers);

        if (userPrincipal != null) {
            log.info("WebSocket Subscribed: User={}, WebSocket SessionId={}, Destination={}", userPrincipal.getName(), simpSessionId, destination);
        } else {
            log.warn("WebSocket Subscribed: No user principal found. WebSocket SessionId={}, Destination={}", simpSessionId, destination);
        }
    }


    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
         MessageHeaders headers = event.getMessage().getHeaders();
         Principal userPrincipal = SimpMessageHeaderAccessor.getUser(headers);
         String simpSessionId = SimpMessageHeaderAccessor.getSessionId(headers); 

         if (userPrincipal != null) {
            String userId = userPrincipal.getName(); 
            log.info("WebSocket Disconnected: User={}, WebSocket SessionId={}", userId, simpSessionId);

            String trackingKey = getUserTrackingKey(userId);
            Set<String> activeDocuments = null;
            try {
                activeDocuments = setOperations.members(trackingKey);
            } catch (Exception e) {
                log.error("Redis error retrieving active documents for user [{}], key [{}]: {}", userId, trackingKey, e.getMessage(), e);
                 log.warn("Could not retrieve active documents for user [{}], unable to perform targeted cleanup.", userId);
                 activeDocuments = Collections.emptySet(); 
            }

            if (activeDocuments != null && !activeDocuments.isEmpty()) {
                 log.info("Processing disconnect for user [{}]. Found {} active document entries in tracking set [{}].", 
                         userId, activeDocuments.size(), trackingKey);
                 
                 activeDocuments.forEach(docEntry -> {
                     String[] parts = docEntry.split(":", 2);
                     if (parts.length == 2) {
                         String sessionId = parts[0];
                         String documentId = parts[1];
                         log.info("Attempting to remove user [{}] from session [{}], doc [{}] based on tracking info.", 
                                 userId, sessionId, documentId);
                         try {
                            boolean removed = sessionRegistryService.userLeftDocument(sessionId, documentId, userId);
                            if (removed) {
                                log.info("User [{}] successfully removed from session [{}], doc [{}]. Triggering state broadcast.", 
                                        userId, sessionId, documentId);
                                // Pass userId of the user who left as the trigger user
                                broadcastFullDocumentState(sessionId, documentId, userId);
                            } else {
                                 log.warn("Call to userLeftDocument for user [{}], session [{}], doc [{}] returned false (user might have already been removed?).", 
                                         userId, sessionId, documentId);
                            }
                         } catch (Exception e) {
                             log.error("Error calling userLeftDocument or broadcasting state for user [{}], session [{}], doc [{}]: {}", 
                                     userId, sessionId, documentId, e.getMessage(), e);
                         }
                     } else {
                         log.warn("Invalid document entry format '{}' found in tracking set '{}' for user [{}]", 
                                 docEntry, trackingKey, userId);
                     }
                 });

                 try {
                     stringRedisTemplate.delete(trackingKey);
                     log.info("Deleted user tracking set '{}' for user [{}]", trackingKey, userId);
                 } catch (Exception e) {
                     log.error("Redis error deleting tracking key [{}] for user [{}]: {}", trackingKey, userId, e.getMessage(), e);
                 }
            } else {
                 log.info("No active document entries found in tracking set [{}] for disconnected user [{}]. No specific cleanup needed based on tracking.", trackingKey, userId);
                 // This might happen if the user connected but never joined a document, or if the tracking key expired/failed.
            }

         } else {
            log.warn("WebSocket Disconnected: No user principal found. WebSocket SessionId={}. Cannot clean up registry.", simpSessionId);
         }
    }

    // Helper method to broadcast the full document state 
    private void broadcastFullDocumentState(String sessionId, String documentId, String triggerUserId) {
         log.info("Broadcasting full document state for session [{}], doc [{}] triggered by user action (disconnect/activity) of user [{}]", sessionId, documentId, triggerUserId);
         try {
            // Fetch current participants (excluding no one, we want the full list)
            List<UserInfoDTO> participants = sessionRegistryService.getActiveParticipantsForDocument(sessionId, documentId, null);
            
            String currentContent = otService.getDocumentContent(sessionId, documentId);
            int currentRevision = otService.getRevision(sessionId, documentId);

            DocumentState fullState = new DocumentState();
            fullState.setSessionId(sessionId); // Ensure this is set
            fullState.setDocumentId(documentId);
            fullState.setDocument(currentContent);
            fullState.setRevision(currentRevision);
            fullState.setParticipants(participants);

            // Send to the specific state topic
            String stateDestination = String.format("/topic/sessions/%s/state/document/%s", sessionId, documentId);
            messagingTemplate.convertAndSend(stateDestination, fullState);
            log.info("Successfully broadcasted full document state to {} for session [{}], doc [{}]", stateDestination, sessionId, documentId);

         } catch (Exception e) {
             log.error("Error broadcasting full document state for session [{}], doc [{}]: {}", sessionId, documentId, e.getMessage(), e);
         }
    }

} 