package com.codecafe.backend.dto;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * DTO representing the payload sent from the client for a selection change.
 * Contains the client's persistent ID and the selection data (as a Map for flexibility).
 */
public class IncomingSelectionPayload {

    private String clientId;
    private Map<String, List<Map<String, Integer>>> selection; // Example: { ranges: [{ anchor: 0, head: 5 }] }
    private String documentId;

    // Default constructor for Jackson
    public IncomingSelectionPayload() {
    }

    public IncomingSelectionPayload(String clientId, Map<String, List<Map<String, Integer>>> selection, String documentId) {
        this.clientId = clientId;
        this.selection = selection;
        this.documentId = documentId;
    }

    // Getters and Setters

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public Map<String, List<Map<String, Integer>>> getSelection() {
        return selection;
    }

    public void setSelection(Map<String, List<Map<String, Integer>>> selection) {
        this.selection = selection;
    }

    public String getDocumentId() {
        return documentId;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
    }

    // equals, hashCode, toString

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        IncomingSelectionPayload that = (IncomingSelectionPayload) o;
        return Objects.equals(clientId, that.clientId) && Objects.equals(selection, that.selection) && Objects.equals(documentId, that.documentId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(clientId, selection, documentId);
    }

    @Override
    public String toString() {
        return "IncomingSelectionPayload{" +
                "clientId='" + clientId + '\'' +
                ", selection=" + selection +
                ", documentId='" + documentId + '\'' +
                '}';
    }
} 