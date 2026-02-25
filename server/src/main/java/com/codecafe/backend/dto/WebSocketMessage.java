package com.codecafe.backend.dto;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;

public class WebSocketMessage implements Serializable {
    @JsonProperty("code")
    private String code;

    @JsonProperty("user")
    private UserData user;

    // Default constructor needed for Jackson
    public WebSocketMessage() {}

    // Getters and setters
    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public UserData getUser() {
        return user;
    }

    public void setUser(UserData user) {
        this.user = user;
    }

    public static class UserData implements Serializable {
        @JsonProperty("name")
        private String name;

        @JsonProperty("color")
        private String color;

        @JsonProperty("cursor")
        private CursorData cursor;

        // Default constructor
        public UserData() {}

        // Getters and setters
        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getColor() {
            return color;
        }

        public void setColor(String color) {
            this.color = color;
        }

        public CursorData getCursor() {
            return cursor;
        }

        public void setCursor(CursorData cursor) {
            this.cursor = cursor;
        }
    }

    public static class CursorData implements Serializable {
        @JsonProperty("cursorPosition")
        private Position cursorPosition;

        @JsonProperty("selection")
        private Selection selection;

        // Default constructor
        public CursorData() {}

        // Getters and setters
        public Position getCursorPosition() {
            return cursorPosition;
        }

        public void setCursorPosition(Position cursorPosition) {
            this.cursorPosition = cursorPosition;
        }

        public Selection getSelection() {
            return selection;
        }

        public void setSelection(Selection selection) {
            this.selection = selection;
        }
    }

    public static class Position implements Serializable {
        @JsonProperty("lineNumber")
        private int lineNumber;

        @JsonProperty("column")
        private int column;

        // Default constructor
        public Position() {}

        // Getters and setters
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
    }

    public static class Selection implements Serializable {
        @JsonProperty("startLineNumber")
        private int startLineNumber;

        @JsonProperty("startColumn")
        private int startColumn;

        @JsonProperty("endLineNumber")
        private int endLineNumber;

        @JsonProperty("endColumn")
        private int endColumn;

        // Default constructor
        public Selection() {}

        // Getters and setters
        public int getStartLineNumber() {
            return startLineNumber;
        }

        public void setStartLineNumber(int startLineNumber) {
            this.startLineNumber = startLineNumber;
        }

        public int getStartColumn() {
            return startColumn;
        }

        public void setStartColumn(int startColumn) {
            this.startColumn = startColumn;
        }

        public int getEndLineNumber() {
            return endLineNumber;
        }

        public void setEndLineNumber(int endLineNumber) {
            this.endLineNumber = endLineNumber;
        }

        public int getEndColumn() {
            return endColumn;
        }

        public void setEndColumn(int endColumn) {
            this.endColumn = endColumn;
        }
    }
}