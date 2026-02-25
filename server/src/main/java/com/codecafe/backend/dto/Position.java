package com.codecafe.backend.dto;

// DTO matching the structure in frontend/src/hooks/useCollaborationSession.ts
public class Position {
    private int lineNumber;
    private int column;

    // No-arg constructor
    public Position() { }

    // Getters and Setters
    public int getLineNumber() {
        return lineNumber;
    }

    public void setLineNumber(int lineNumber) {
        this.lineNumber = lineNumber;
    }

    public int getColumn() {
        return column;
    }

    public void setColumn(int column) {
        this.column = column;
    }

    @Override
    public String toString() {
        return "Position{" +
                "lineNumber=" + lineNumber +
                ", column=" + column +
                '}';
    }
}