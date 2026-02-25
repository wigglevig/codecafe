package com.codecafe.backend.controller;

import com.codecafe.backend.dto.DocumentContentPayload;
import com.codecafe.backend.service.OtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final OtService otService;
    private static final Logger logger = Logger.getLogger(SessionController.class.getName());

    // TODO: In-memory storage for sessions (replace with database in production) IMPORTANT!!!
    private static final Map<String, SessionInfo> activeSessions = new ConcurrentHashMap<>();

    static class SessionInfo {
        private final String id;
        private final String creatorName;
        private final Instant createdAt;

        public SessionInfo(String id, String creatorName) {
            this.id = id;
            this.creatorName = creatorName;
            this.createdAt = Instant.now();
        }

        public String getId() {
            return id;
        }

        public String getCreatorName() {
            return creatorName;
        }

        public Instant getCreatedAt() {
            return createdAt;
        }
    }

    // Constructor injection for dependencies
    public SessionController(OtService otService) {
        this.otService = otService;
    }

    @PostMapping("/create")
    public ResponseEntity<Map<String, String>> createSession(@RequestBody Map<String, String> request) {
        String creatorName = request.getOrDefault("creatorName", "Anonymous");
        
        // Generate a unique session ID
        String sessionId = UUID.randomUUID().toString();
        SessionInfo sessionInfo = new SessionInfo(sessionId, creatorName);
        activeSessions.put(sessionId, sessionInfo);
        
        logger.info("Created session: " + sessionId + " by " + creatorName);
        
        return ResponseEntity.ok(Map.of("sessionId", sessionId));
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<SessionInfo> getSessionInfo(@PathVariable String sessionId) {
        SessionInfo sessionInfo = activeSessions.get(sessionId);
        
        if (sessionInfo == null) {
            logger.warning("Session info requested for non-existent session: " + sessionId);
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(sessionInfo);
    }

    @PostMapping("/{sessionId}/set-document")
    public ResponseEntity<Void> setDocumentContent(
            @PathVariable String sessionId,
            @RequestBody DocumentContentPayload payload) {

        logger.info(String.format("Received request to set content for doc [%s] in session [%s]", payload.getDocumentId(), sessionId));

        if (payload.getDocumentId() == null || payload.getDocumentId().isEmpty()) {
            logger.warning("Request to set document content is missing documentId.");
            return ResponseEntity.badRequest().build();
        }

        if (!activeSessions.containsKey(sessionId)) {
           logger.warning("Attempted to set document content for non-existent session: " + sessionId);
           return ResponseEntity.notFound().build();
        }

        try {
            otService.setDocumentContent(sessionId, payload.getDocumentId(), payload.getContent());
            logger.info(String.format("Successfully set initial content for doc [%s] in session [%s]", payload.getDocumentId(), sessionId));
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.log(Level.SEVERE, String.format("Error setting document content for doc [%s] in session [%s]", payload.getDocumentId(), sessionId), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
