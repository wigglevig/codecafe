package com.codecafe.backend.controller;

import com.codecafe.backend.dto.WebSocketMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class WebSocketController {

    private final RedisTemplate<String, Object> redisTemplate;

    @Autowired
    public WebSocketController(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @MessageMapping("/message")
    @SendTo("/topic/messages")
    public WebSocketMessage broadcastMessage(WebSocketMessage message) {
        redisTemplate.opsForList().rightPush("messages", message);

        // Broadcast message to all clients
//        messagingTemplate.convertAndSend("/topic/messages", message);
        return message;
    }
}