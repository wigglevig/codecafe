package com.codecafe.backend.dto;

public class JoinPayload {
    private String sessionId;
    private String documentId; 
    private String userId;
    private String userName;
    private String userColor;

    // Default constructor
    public JoinPayload() {
    }

    // Getters and Setters
    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getDocumentId() {
        return documentId;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
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

    @Override
    public String toString() {
        return "JoinPayload{" +
                "sessionId='" + sessionId + '\'' +
                ", documentId='" + documentId + '\'' +
                ", userId='" + userId + '\'' +
                ", userName='" + userName + '\'' +
                ", userColor='" + userColor + '\'' +
                '}';
    }
} 