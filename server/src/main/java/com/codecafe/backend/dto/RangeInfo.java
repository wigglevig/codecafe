package com.codecafe.backend.dto;

// DTO representing a single selection range
public class RangeInfo {
    private int anchor;
    private int head;

    // No-argument constructor for Jackson
    public RangeInfo() {
    }

    public RangeInfo(int anchor, int head) {
        this.anchor = anchor;
        this.head = head;
    }

    // Getters and Setters
    public int getAnchor() {
        return anchor;
    }

    public void setAnchor(int anchor) {
        this.anchor = anchor;
    }

    public int getHead() {
        return head;
    }

    public void setHead(int head) {
        this.head = head;
    }

    @Override
    public String toString() {
        return "RangeInfo{" +
               "anchor=" + anchor +
               ", head=" + head +
               '}';
    }
} 