package com.codecafe.backend.dto;

import java.util.List;

public class CodeExecutionRequest {
    private String language;
    private String version;
    private List<File> files;

    // Getters and Setters
    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public List<File> getFiles() {
        return files;
    }

    public void setFiles(List<File> files) {
        this.files = files;
    }

    // Inner class for file representation
    public static class File {
        private String content;

        // Getters and Setters
        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }
}
