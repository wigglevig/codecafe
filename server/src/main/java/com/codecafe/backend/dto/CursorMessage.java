package com.codecafe.backend.dto;

// DTO matching the top-level structure sent to /app/selection
public class CursorMessage {
    private String documentId;
    private String sessionId;
    private UserInfo userInfo; // Use UserInfo DTO

    // No-arg constructor
    public CursorMessage() {}

    // Getters and Setters
    public String getDocumentId() {
        return documentId;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public UserInfo getUserInfo() {
        return userInfo;
    }

    public void setUserInfo(UserInfo userInfo) {
        this.userInfo = userInfo;
    }

    @Override
    public String toString() {
        return "CursorMessage{" +
                "userInfo=" + userInfo +
                ", documentId='" + documentId + "\'" +
                ", sessionId='" + sessionId + "\'" +
                '}';
    }
}

