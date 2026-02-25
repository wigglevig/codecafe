package com.codecafe.backend.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Represents an operation on a text document, similar to ot.js TextOperation.
 * Operations consist of a list of ops:
 * - Positive integer: Retain (skip) characters.
 * - String: Insert characters.
 * - Negative integer: Delete characters.
 */
public class TextOperation {

    // List of operations: Integer (retain > 0, delete < 0) or String (insert)
    private List<Object> ops;
    private int baseLength;
    private int targetLength;

    // Helper static methods for op types

    public static boolean isRetain(Object op) {
        return op instanceof Integer && (Integer) op > 0;
    }

    public static boolean isInsert(Object op) {
        return op instanceof String;
    }

    public static boolean isDelete(Object op) {
        return op instanceof Integer && (Integer) op < 0;
    }

    // Constructors 

    public TextOperation() {
        this.ops = new ArrayList<>();
        this.baseLength = 0;
        this.targetLength = 0;
    }

    // Constructor for potentially deserializing from JSON (e.g., List<Object>)
    // Note: Direct deserialization of List<Object> needs careful handling in frameworks like Jackson.
    // This constructor provides a way to build from an existing list.
    @JsonCreator
    public TextOperation(List<Object> ops) {
        this(); // Initialize lists and lengths
        // Rebuild the operation using builder methods to ensure correctness
        for (Object op : ops) {
            if (isRetain(op)) {
                this.retain((Integer) op);
            } else if (isInsert(op)) {
                this.insert((String) op);
            } else if (isDelete(op)) {
                this.delete((Integer) op); // Use the negative value directly
            } else {
                throw new IllegalArgumentException("Unknown operation type in list: " + op);
            }
        }
    }

    // --- Builder Methods (similar to ot.js) ---

    public TextOperation retain(int n) {
        if (n < 0) {
            throw new IllegalArgumentException("Retain count must be non-negative.");
        }
        if (n == 0) {
            return this;
        }
        this.baseLength += n;
        this.targetLength += n;
        if (!this.ops.isEmpty() && isRetain(this.ops.get(this.ops.size() - 1))) {
            int lastOp = (Integer) this.ops.get(this.ops.size() - 1);
            this.ops.set(this.ops.size() - 1, lastOp + n);
        } else {
            this.ops.add(n);
        }
        return this;
    }

    public TextOperation insert(String str) {
        if (str == null || str.isEmpty()) {
            return this;
        }
        this.targetLength += str.length();
        if (!this.ops.isEmpty() && isInsert(this.ops.get(this.ops.size() - 1))) {
            String lastOp = (String) this.ops.get(this.ops.size() - 1);
            this.ops.set(this.ops.size() - 1, lastOp + str);
        } else if (!this.ops.isEmpty() && isDelete(this.ops.get(this.ops.size() - 1))) {
            // Enforce insert before delete
            if (this.ops.size() >= 2 && isInsert(this.ops.get(this.ops.size() - 2))) {
                String secondLastOp = (String) this.ops.get(this.ops.size() - 2);
                this.ops.set(this.ops.size() - 2, secondLastOp + str);
            } else {
                Object lastOp = this.ops.remove(this.ops.size() - 1);
                this.ops.add(str);
                this.ops.add(lastOp);
            }
        } else {
            this.ops.add(str);
        }
        return this;
    }

    public TextOperation delete(int n) {
        if (n == 0) {
            return this;
        }
        // Store deletes as negative numbers
        int deleteCount = (n > 0) ? -n : n;

        this.baseLength -= deleteCount; // baseLength increases since deleteCount is negative

        if (!this.ops.isEmpty() && isDelete(this.ops.get(this.ops.size() - 1))) {
            int lastOp = (Integer) this.ops.get(this.ops.size() - 1);
            this.ops.set(this.ops.size() - 1, lastOp + deleteCount);
        } else {
            this.ops.add(deleteCount);
        }
        return this;
    }

    // Getters

    @JsonValue
    public List<Object> getOps() {
        // Return a copy to prevent external modification
        return new ArrayList<>(ops);
    }

    public int getBaseLength() {
        return baseLength;
    }

    public int getTargetLength() {
        return targetLength;
    }

    // Utility Methods

    public boolean isNoop() {
        return ops.isEmpty() || (ops.size() == 1 && isRetain(ops.get(0)));
    }

    // Overrides

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TextOperation that = (TextOperation) o;
        return baseLength == that.baseLength &&
                targetLength == that.targetLength &&
                Objects.equals(ops, that.ops);
    }

    @Override
    public int hashCode() {
        return Objects.hash(ops, baseLength, targetLength);
    }

    @Override
    public String toString() {
        // Explicitly type the stream elements for clarity if needed, though usually inferred.
        // Stream<Object> stream = ops.stream();
        return ops.stream().<String>map(op -> { // Specify String as the map result type
            if (isRetain(op)) return "retain(" + op + ")";
            if (isInsert(op)) return "insert(\"" + op + "\")"; // Correct string concatenation
            if (isDelete(op)) return "delete(" + (- (Integer) op) + ")";
            return "unknown";
        }).collect(Collectors.joining(", ", "TextOperation[", "]"));
    }

    // Setters 

    public void setOps(List<Object> ops) {
        // WARNING: This bypasses the length calculations done by builder methods.
        // Consider using the @JsonCreator constructor or builder methods instead.
        this.ops = new ArrayList<>(ops); // Use a copy
        // TODO: Optionally recalculate baseLength and targetLength here if needed.
        // this.recalculateLengths();
    }

    public void setBaseLength(int baseLength) {
        this.baseLength = baseLength;
    }

    public void setTargetLength(int targetLength) {
        this.targetLength = targetLength;
    }


    // Optional: Add a method to recalculate lengths based on ops
    // private void recalculateLengths() {
    //     this.baseLength = 0;
    //     this.targetLength = 0;
    //     for (Object op : this.ops) {
    //         if (isRetain(op)) {
    //             int n = (Integer) op;
    //             this.baseLength += n;
    //             this.targetLength += n;
    //         } else if (isInsert(op)) {
    //             this.targetLength += ((String) op).length();
    //         } else if (isDelete(op)) {
    //             this.baseLength -= (Integer) op; // op is negative
    //         }
    //     }
    // }

}