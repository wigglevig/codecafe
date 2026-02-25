package com.codecafe.backend.dto;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

public class ChatMessage {
    private String sessionId;
    private String userId;
    private String userName;
    private String userColor;
    private String message;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp;

    // Add a string representation of timestamp for frontend
    @JsonProperty("formattedTimestamp")
    public String getFormattedTimestamp() {
        if (timestamp != null) {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
            return timestamp.format(formatter);
        }
        return "";
    }

    // Default constructor for Jackson
    public ChatMessage() {
    }

    public ChatMessage(String sessionId, String userId, String userName, String userColor, String message) {
        this.sessionId = sessionId;
        this.userId = userId;
        this.userName = userName;
        this.userColor = userColor;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }

    // Getters and setters
    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getUserColor() {
        return userColor;
    }

    public void setUserColor(String userColor) {
        this.userColor = userColor;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
} 