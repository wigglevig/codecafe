package com.codecafe.backend.dto;

public class DocumentContentPayload {
    private String documentId;
    private String content;

    // Getters
    public String getDocumentId() {
        return documentId;
    }

    public String getContent() {
        return content;
    }

    // Setters (needed for Jackson deserialization)
    public void setDocumentId(String documentId) {
        this.documentId = documentId;
    }

    public void setContent(String content) {
        this.content = content;
    }

    // Optional: toString, equals, hashCode
    @Override
    public String toString() {
        return "DocumentContentPayload{" +
                "documentId='" + documentId + '\'' +
                ", content='" + (content != null ? content.substring(0, Math.min(content.length(), 50)) + "..." : "null") + '\'' +
                '}';
    }
}