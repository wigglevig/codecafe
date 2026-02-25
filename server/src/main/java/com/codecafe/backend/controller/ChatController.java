package com.codecafe.backend.controller;

import com.codecafe.backend.dto.ChatMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

@Controller
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public ChatController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Handles incoming chat messages and broadcasts them to all clients in the session.
     * Client sends to /app/chat
     * Message is broadcast to /topic/sessions/{sessionId}/chat
     */
    @MessageMapping("/chat")
    public void handleChatMessage(@Payload ChatMessage chatMessage) {
        String sessionId = chatMessage.getSessionId();
        
        if (sessionId == null || chatMessage.getUserId() == null || chatMessage.getMessage() == null) {
            log.warn("Invalid chat message received: {}", chatMessage);
            return;
        }
        
        // Ensure the timestamp is set
        if (chatMessage.getTimestamp() == null) {
            chatMessage.setTimestamp(LocalDateTime.now());
        }
        
        log.info("Received chat message in session [{}] from user [{}]: {}", 
                sessionId, 
                chatMessage.getUserName(), 
                chatMessage.getMessage().substring(0, Math.min(50, chatMessage.getMessage().length())));
        
        // Broadcast to all clients in the session
        String destination = String.format("/topic/sessions/%s/chat", sessionId);
        messagingTemplate.convertAndSend(destination, chatMessage);
        log.debug("Sent chat message to {}", destination);
    }
} 