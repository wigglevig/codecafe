package com.codecafe.backend.controller;

import com.codecafe.backend.dto.UserInfo;
import com.codecafe.backend.dto.UserInfoDTO;
import com.codecafe.backend.dto.CursorMessage;
import com.codecafe.backend.dto.Position;
import com.codecafe.backend.dto.DocumentState;
import com.codecafe.backend.service.SessionRegistryService;
import com.codecafe.backend.service.OtService;
import com.codecafe.backend.dto.JoinPayload;
import com.codecafe.backend.dto.SelectionInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Controller
public class EditorController {

    private static final Logger log = LoggerFactory.getLogger(EditorController.class);

    // Inject the messaging template and session registry
    private final SimpMessagingTemplate messagingTemplate;
    private final SessionRegistryService sessionRegistryService;
    private final OtService otService;
    private final StringRedisTemplate stringRedisTemplate;
    private final SetOperations<String, String> setOperations;

    private static final String USER_ACTIVE_DOCS_KEY_PREFIX = "user:active_docs:";
    private static final long USER_TRACKING_EXPIRY_HOURS = 24; // Expire user tracking info after a day of inactivity

    @Autowired
    public EditorController(SimpMessagingTemplate messagingTemplate, SessionRegistryService sessionRegistryService, OtService otService, StringRedisTemplate stringRedisTemplate) {
        this.messagingTemplate = messagingTemplate;
        this.sessionRegistryService = sessionRegistryService;
        this.otService = otService;
        this.stringRedisTemplate = stringRedisTemplate;
        this.setOperations = stringRedisTemplate.opsForSet();
    }

    // Helper to get the tracking key for a user
    private String getUserTrackingKey(String userId) {
        return USER_ACTIVE_DOCS_KEY_PREFIX + userId;
    }

    /**
     * Handles a client explicitly joining a session/document.
     * Registers the user and broadcasts the updated state immediately.
     */
    @MessageMapping("/join")
    public void handleJoin(@Payload JoinPayload payload,
                           SimpMessageHeaderAccessor headerAccessor) {

        String sessionId = payload.getSessionId();
        String documentId = payload.getDocumentId();
        String userId = payload.getUserId();
        String userName = payload.getUserName();
        String userColor = payload.getUserColor();

        log.info("Received join request: {}", payload);

        if (sessionId == null || documentId == null || userId == null || userName == null || userColor == null) {
            log.warn("Invalid join payload received. Missing required fields. Payload: {}", payload);
            
            return;
        }

        
        UserInfoDTO userInfoDTO = new UserInfoDTO();
        userInfoDTO.setId(userId);
        userInfoDTO.setName(userName);
        userInfoDTO.setColor(userColor);
        
        userInfoDTO.setCursorPosition(null); 
        userInfoDTO.setSelection(null);

        try {
            
            sessionRegistryService.userJoined(sessionId, documentId, userInfoDTO);
            log.info("User [{}] registered in session [{}], doc [{}] via /app/join", userId, sessionId, documentId);

            String trackingKey = getUserTrackingKey(userId);
            String documentEntry = sessionId + ":" + documentId;
            try {
                setOperations.add(trackingKey, documentEntry);
                stringRedisTemplate.expire(trackingKey, USER_TRACKING_EXPIRY_HOURS, TimeUnit.HOURS);
                log.info("Added entry '{}' to user tracking set '{}' for user [{}]", documentEntry, trackingKey, userId);
            } catch (Exception redisEx) {
                log.error("Redis error adding entry '{}' to tracking set '{}' for user [{}]: {}",
                          documentEntry, trackingKey, userId, redisEx.getMessage(), redisEx);
            }

            broadcastFullDocumentState(sessionId, documentId, userId);

        } catch (Exception e) {
            log.error("Error processing join request for user [{}] in session [{}], doc [{}]: {}", 
                      userId, sessionId, documentId, e.getMessage(), e);
            
        }
    }

    
    @MessageMapping("/selection")
    public void handleSelectionUpdate(@Payload CursorMessage message,
                                      SimpMessageHeaderAccessor headerAccessor) {

        String sessionId = message.getSessionId();
        String documentId = message.getDocumentId();
        UserInfo senderUserInfo = message.getUserInfo();

        if (sessionId == null || documentId == null || senderUserInfo == null || senderUserInfo.getId() == null) {
            log.warn("Received invalid selection message (missing session, doc, or user info/id): {}", message);
            return;
        }
        String senderClientId = senderUserInfo.getId();

        try {
            // Convert Position to Map<String, Integer> or null
            Map<String, Integer> cursorPositionMap = null;
            Position cursorPosition = senderUserInfo.getCursorPosition();
            if (cursorPosition != null) {
                cursorPositionMap = new HashMap<>();
                cursorPositionMap.put("lineNumber", cursorPosition.getLineNumber());
                cursorPositionMap.put("column", cursorPosition.getColumn());
            }

            SelectionInfo selectionInfo = senderUserInfo.getSelection();

            // Call the service layer to update the state in Redis
            sessionRegistryService.updateUserState(sessionId, documentId, senderClientId, cursorPositionMap, selectionInfo);
            log.debug("[Session: {}] Updated user state for [{}] in doc [{}] via /app/selection", sessionId, senderClientId, documentId);

        } catch (Exception e) {
            // Log error during state update, but still attempt to broadcast
            log.error("[Session: {}] Error persisting selection update for user [{}] in doc [{}]: {}", sessionId, senderClientId, documentId, e.getMessage(), e);
        }

        String selectionDestination = String.format("/topic/sessions/%s/selections/document/%s", sessionId, documentId);

        log.info("Attempting to broadcast selection for session '{}', doc '{}' from client '{}' to {}", sessionId, documentId, senderClientId, selectionDestination);
        try {
             messagingTemplate.convertAndSend(selectionDestination, message); // Broadcast original message
             log.info("Successfully broadcasted selection update to {} for session '{}', doc '{}'", selectionDestination, sessionId, documentId);
        } catch (Exception e) {
            log.error("Error broadcasting selection update to {} for session '{}', doc '{}'", selectionDestination, sessionId, documentId, e);
        }

        // if (registryUpdated) {
        //    broadcastFullDocumentState(sessionId, documentId, senderClientId);
        // }
    }

    /**
     * Broadcasts the full document state (content, revision, participants)
     * to all clients subscribed to the specific session/document state topic.
     * Typically called after a user joins, leaves, or a significant state change occurs.
     *
     * @param sessionId The ID of the session.
     * @param documentId The ID of the document within the session.
     * @param updatedByClientId The client ID that triggered this broadcast (used for logging).
     */
    private void broadcastFullDocumentState(String sessionId, String documentId, String updatedByClientId) {
        log.info("Broadcasting full document state for session [{}], doc [{}] triggered by user [{}]", sessionId, documentId, updatedByClientId);
        try {
            List<UserInfoDTO> participants = sessionRegistryService.getActiveParticipantsForDocument(sessionId, documentId, null);
            
            String currentContent = otService.getDocumentContent(sessionId, documentId);
            int currentRevision = otService.getRevision(sessionId, documentId);

            DocumentState fullState = new DocumentState();
            fullState.setSessionId(sessionId);
            fullState.setDocumentId(documentId);
            fullState.setDocument(currentContent);
            fullState.setRevision(currentRevision);
            fullState.setParticipants(participants);

            String stateDestination = String.format("/topic/sessions/%s/state/document/%s", sessionId, documentId);
            messagingTemplate.convertAndSend(stateDestination, fullState);
            log.info("Successfully broadcasted full document state to {} for session [{}], doc [{}]", stateDestination, sessionId, documentId);

        } catch (Exception e) {
            log.error("Error broadcasting full document state for session [{}], doc [{}]: {}", sessionId, documentId, e.getMessage(), e);
        }
    }
}