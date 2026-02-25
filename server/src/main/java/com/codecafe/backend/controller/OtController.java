package com.codecafe.backend.controller;

import com.codecafe.backend.dto.DocumentState;
import com.codecafe.backend.dto.IncomingOperationPayload;
import com.codecafe.backend.dto.TextOperation;
import com.codecafe.backend.service.OtService;
import com.codecafe.backend.dto.IncomingSelectionPayload;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;
import java.security.Principal;
import java.util.List;
import java.util.Collections;
import com.codecafe.backend.dto.UserInfoDTO;
import com.codecafe.backend.service.SessionRegistryService;

@Controller
public class OtController {
    private final OtService otService;
    private final SimpMessagingTemplate messagingTemplate;
    private final SessionRegistryService sessionRegistryService;
    private static final Logger logger = Logger.getLogger(OtController.class.getName());

    public OtController(OtService otService, SimpMessagingTemplate messagingTemplate, SessionRegistryService sessionRegistryService) {
        this.otService = otService;
        this.messagingTemplate = messagingTemplate;
        this.sessionRegistryService = sessionRegistryService;
    }

    /**
     * Handle incoming operations from clients based on ot.js model.
     * Expects a payload containing the client's revision and the operation.
     *
     * @param payload The incoming operation payload.
     * @param headerAccessor Accessor for STOMP headers (e.g., to get session ID).
     * @param principal Optional principal for user identification.
     */
    @MessageMapping("/operation")
    public void handleOperation(@Payload IncomingOperationPayload payload,
                                SimpMessageHeaderAccessor headerAccessor,
                                Principal principal) {

        String clientId = payload.getClientId();
        String documentId = payload.getDocumentId();
        String sessionId = payload.getSessionId();

        if (clientId == null || documentId == null || sessionId == null) {
            logger.warning("Received operation without clientId, documentId, or sessionId in payload. Discarding.");
            return;
        }

        // Log the incoming payload including selection/cursor if present
        logger.info(String.format("OtController received operation payload from client [%s] for session [%s], doc [%s]: %s",
                 clientId, sessionId, documentId, payload.toString()));

        try {
            // Extract the raw operation data and create a TextOperation
            TextOperation operation = new TextOperation(payload.getOperation()); 
            // Process the operation through the OT service
            TextOperation transformedOp = otService.receiveOperation(sessionId, documentId, payload.getRevision(), operation);

            // Prepare the payload for broadcasting
            Map<String, Object> broadcastPayload = new HashMap<>();
            broadcastPayload.put("documentId", documentId);
            broadcastPayload.put("clientId", clientId); 
            broadcastPayload.put("operation", transformedOp.getOps());
            broadcastPayload.put("sessionId", sessionId);


            if (payload.getSelection() != null) {
                broadcastPayload.put("selection", payload.getSelection());
            }
            if (payload.getCursorPosition() != null) {
                broadcastPayload.put("cursorPosition", payload.getCursorPosition());
            }

            // Broadcast to the session-and-document-specific topic
            String destination = String.format("/topic/sessions/%s/operations/document/%s", sessionId, documentId);
            messagingTemplate.convertAndSend(destination, broadcastPayload);
            logger.fine(String.format("Broadcasted transformed op (with selection/cursor if present) from client [%s] for session [%s], doc [%s] to %s. Payload: %s", clientId, sessionId, documentId, destination, broadcastPayload));

            // Send ACK back to the original sender ONLY
            String ackDestination = "/topic/ack/" + clientId;
            messagingTemplate.convertAndSend(ackDestination, "ack");
            logger.fine("Sent ACK to client [" + clientId + "] at " + ackDestination);

        } catch (IllegalArgumentException e) {
            logger.warning(String.format("Error processing operation from client [%s] for session [%s], doc [%s]: %s", clientId, sessionId, documentId, e.getMessage()));
        } catch (Exception e) {
            logger.severe(String.format("Unexpected error processing operation from client [%s] for session [%s], doc [%s]: %s", clientId, sessionId, documentId, e.getMessage()));
            e.printStackTrace();
        }
    }

    /**
     * DEPRECATED: Selection changes are now handled via the /operation endpoint.
     * Keeping this method temporarily might be useful for debugging or if a fallback is needed.
     *
     * @param payload JSON representation of the selection (e.g., { ranges: [{ anchor: number, head: number }] })
     * @param headerAccessor Accessor for STOMP headers.
     * @param principal Optional principal.
     */
    @Deprecated
    public void handleSelection(@Payload IncomingSelectionPayload payload,
                                SimpMessageHeaderAccessor headerAccessor,
                                Principal principal) {

        logger.warning("Received message on deprecated /selection endpoint. Selection should be bundled with /operation. Payload: " + payload);


        // String clientId = payload.getClientId();
        // String documentId = payload.getDocumentId();
        // ... (rest of the old logic) ...

    }

    /**
     * Handle document state requests.
     * Expects a payload containing the documentId.
     * Returns the current document content, revision number, and active participants for that document.
     */
    @MessageMapping("/get-document-state")
    public void getDocumentState(@Payload Map<String, String> payload, Principal principal) {
        String documentId = payload.get("documentId");
        String sessionId = payload.get("sessionId");

        String requestingUserId = null;
        if (principal != null) {
            requestingUserId = principal.getName();
            // logger.info("Identified requesting user ID: " + requestingUserId); // Can be verbose
        } else {
            logger.warning("Principal not available for get-document-state request. Cannot exclude requester from participant list.");
        }

        if (documentId == null || sessionId == null) {
            logger.warning("Received get-document-state request without documentId or sessionId. Ignoring.");
            return;
        }

        logger.info("Received request for document state for session [" + sessionId + "], doc [" + documentId + "] from user [" + (requestingUserId != null ? requestingUserId : "unknown") + "]");

        // Fetch Participants
        List<UserInfoDTO> participants = Collections.emptyList(); 
        try {
            participants = sessionRegistryService.getActiveParticipantsForDocument(sessionId, documentId, null);
            logger.info(String.format("Fetched %d participants for session [%s], document [%s]", participants.size(), sessionId, documentId));

        } catch (Exception e) {
            logger.severe(String.format("Error fetching participants for session [%s], document [%s]: %s", sessionId, documentId, e.getMessage()));
        }

        DocumentState stateResponse = new DocumentState();
        stateResponse.setSessionId(sessionId); 
        stateResponse.setDocumentId(documentId);
        stateResponse.setDocument(otService.getDocumentContent(sessionId, documentId));
        stateResponse.setRevision(otService.getRevision(sessionId, documentId));

        stateResponse.setParticipants(participants); 


        logger.info("Sending document state: Revision=" + stateResponse.getRevision() +
                    ", Participants Count=" + stateResponse.getParticipants().size() + 
                    " for session [" + sessionId + "], doc [" + documentId + "]");

        // Send the state back to the specific topic for this session/document
        // The client requesting the state should be subscribed to this topic.
        String destination = String.format("/topic/sessions/%s/state/document/%s", sessionId, documentId);
        messagingTemplate.convertAndSend(destination, stateResponse);
        logger.info(String.format("Sent document state for session [%s], doc [%s] to %s", sessionId, documentId, destination));
    }
}