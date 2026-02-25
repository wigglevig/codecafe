package com.codecafe.backend.dto;

// DTO matching the nested userInfo structure in frontend's CursorMessage
// Note: This is separate from UserInfoDTO which is used for *storing* in Redis
public class UserInfo {
    private String id;
    private String name;
    private String color;
    private Position cursorPosition; // Use Position DTO
    private SelectionInfo selection; // Use SelectionInfo DTO

    // No-arg constructor
    public UserInfo() {}

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

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

    public Position getCursorPosition() {
        return cursorPosition;
    }

    public void setCursorPosition(Position cursorPosition) {
        this.cursorPosition = cursorPosition;
    }

    public SelectionInfo getSelection() {
        return selection;
    }

    public void setSelection(SelectionInfo selection) {
        this.selection = selection;
    }

    @Override
    public String toString() {
        return "UserInfo{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", color='" + color + '\'' +
                ", cursorPosition=" + cursorPosition +
                ", selection=" + selection +
                '}';
    }
}


