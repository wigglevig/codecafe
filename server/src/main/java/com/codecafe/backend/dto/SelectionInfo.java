package com.codecafe.backend.dto;

import java.util.List;

// DTO representing the overall selection, containing a list of ranges
public class SelectionInfo {

    private List<RangeInfo> ranges;

    // No-argument constructor for Jackson
    public SelectionInfo() {
    }

    public SelectionInfo(List<RangeInfo> ranges) {
        this.ranges = ranges;
    }

    // Getter and Setter
    public List<RangeInfo> getRanges() {
        return ranges;
    }

    public void setRanges(List<RangeInfo> ranges) {
        this.ranges = ranges;
    }

    @Override
    public String toString() {
        return "SelectionInfo{" +
               "ranges=" + ranges +
               '}';
    }
} 