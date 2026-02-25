package com.codecafe.backend.dto;


import java.util.List;

public class DocumentState {
    private String documentId;
    private String document;
    private int revision;
    private String sessionId;

    private List<UserInfoDTO> participants;

    public DocumentState() {
    }

    public String getDocumentId() {
        return documentId;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
    }

    public String getDocument() {
        return document;
    }

    public void setDocument(String document) {
        this.document = document;
    }

    public int getRevision() {
        return revision;
    }

    public void setRevision(int revision) {
        this.revision = revision;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public List<UserInfoDTO> getParticipants() {
        return participants;
    }

    public void setParticipants(List<UserInfoDTO> participants) {
        this.participants = participants;
    }
}