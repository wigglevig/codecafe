package com.codecafe.backend.util;

import com.codecafe.backend.dto.TextOperation;

import java.util.Arrays;
import java.util.List;

public class OtUtils {

    /**
     * Apply an operation to a string, returning a new string.
     * Based on ot.js TextOperation.prototype.apply
     *
     * @param doc       The document string.
     * @param operation The operation to apply.
     * @return The resulting string.
     * @throws IllegalArgumentException If the operation's base length doesn't match the document length or if the operation is invalid.
     */
    public static String apply(String doc, TextOperation operation) throws IllegalArgumentException {
        StringBuilder newDoc = new StringBuilder();
        int docIndex = 0;

        for (Object op : operation.getOps()) {
            if (TextOperation.isRetain(op)) {
                int retainCount = (Integer) op;
                if (docIndex + retainCount > doc.length()) {
                    throw new IllegalArgumentException("Retain exceeds document length.");
                }
                newDoc.append(doc, docIndex, docIndex + retainCount);
                docIndex += retainCount;
            } else if (TextOperation.isInsert(op)) {
                newDoc.append((String) op);
            } else if (TextOperation.isDelete(op)) {
                int deleteCount = -(Integer) op;
                if (docIndex + deleteCount > doc.length()) {
                    throw new IllegalArgumentException("Delete exceeds document length.");
                }
                docIndex += deleteCount;
            } else {
                throw new IllegalArgumentException("Invalid op type in operation: " + op);
            }
        }

        if (docIndex != doc.length()) {
            throw new IllegalArgumentException("Operation did not consume the entire document.");
        }

        return newDoc.toString();
    }

    /**
     * Computes the inverse of an operation.
     * Based on ot.js TextOperation.prototype.invert
     *
     * @param doc       The original document string (used for inserts in the inverse).
     * @param operation The operation to invert.
     * @return The inverted operation.
     */
    public static TextOperation invert(String doc, TextOperation operation) {
        TextOperation inverse = new TextOperation();
        int docIndex = 0;

        for (Object op : operation.getOps()) {
            if (TextOperation.isRetain(op)) {
                int retainCount = (Integer) op;
                inverse.retain(retainCount);
                docIndex += retainCount;
            } else if (TextOperation.isInsert(op)) {
                inverse.delete(((String) op).length());
            } else if (TextOperation.isDelete(op)) {
                int deleteCount = -(Integer) op;
                inverse.insert(doc.substring(docIndex, docIndex + deleteCount));
                docIndex += deleteCount;
            } else {
                // Should not happen if apply validation passed
                throw new IllegalStateException("Invalid op type during invert: " + op);
            }
        }
        return inverse;
    }

    /**
     * Compose merges two consecutive operations (op1 followed by op2) into one.
     * Based on ot.js TextOperation.prototype.compose
     *
     * @param op1 The first operation.
     * @param op2 The second operation.
     * @return The composed operation.
     * @throws IllegalArgumentException If op1's target length doesn't match op2's base length.
     */
    public static TextOperation compose(TextOperation op1, TextOperation op2) throws IllegalArgumentException {
        if (op1.getTargetLength() != op2.getBaseLength()) {
            throw new IllegalArgumentException("Compose error: op1 target length (" + op1.getTargetLength() +
                    ") must match op2 base length (" + op2.getBaseLength() + ").");
        }

        TextOperation composed = new TextOperation();
        List<Object> ops1 = op1.getOps();
        List<Object> ops2 = op2.getOps();
        int i1 = 0, i2 = 0; // current index into ops1, ops2
        Object currentOp1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
        Object currentOp2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;

        while (currentOp1 != null || currentOp2 != null) {
            if (TextOperation.isDelete(currentOp1)) {
                composed.delete((Integer) currentOp1);
                currentOp1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                continue;
            }
            if (TextOperation.isInsert(currentOp2)) {
                composed.insert((String) currentOp2);
                currentOp2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                continue;
            }

            if (currentOp1 == null) {
                throw new IllegalArgumentException("Cannot compose: op2 is longer than op1 affects.");
            }
            if (currentOp2 == null) {
                throw new IllegalArgumentException("Cannot compose: op1 is longer than op2 affects.");
            }

            if (TextOperation.isRetain(currentOp1) && TextOperation.isRetain(currentOp2)) {
                int retain1 = (Integer) currentOp1;
                int retain2 = (Integer) currentOp2;
                if (retain1 > retain2) {
                    composed.retain(retain2);
                    currentOp1 = retain1 - retain2;
                    currentOp2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else if (retain1 == retain2) {
                    composed.retain(retain1);
                    currentOp1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                    currentOp2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else { // retain1 < retain2
                    composed.retain(retain1);
                    currentOp2 = retain2 - retain1;
                    currentOp1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                }
            } else if (TextOperation.isInsert(currentOp1) && TextOperation.isDelete(currentOp2)) {
                String insertStr = (String) currentOp1;
                int deleteCount = (Integer) currentOp2;
                if (insertStr.length() > -deleteCount) {
                    currentOp1 = insertStr.substring(0, insertStr.length() + deleteCount); // Keep remaining insert
                    currentOp2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else if (insertStr.length() == -deleteCount) {
                    currentOp1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                    currentOp2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else { // insertStr.length() < -deleteCount
                    currentOp2 = deleteCount + insertStr.length(); // Reduce delete amount
                    currentOp1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                }
            } else if (TextOperation.isInsert(currentOp1) && TextOperation.isRetain(currentOp2)) {
                String insertStr = (String) currentOp1;
                int retainCount = (Integer) currentOp2;
                if (insertStr.length() > retainCount) {
                    composed.insert(insertStr.substring(0, retainCount));
                    currentOp1 = insertStr.substring(retainCount);
                    currentOp2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else if (insertStr.length() == retainCount) {
                    composed.insert(insertStr);
                    currentOp1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                    currentOp2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else { // insertStr.length() < retainCount
                    composed.insert(insertStr);
                    currentOp2 = retainCount - insertStr.length();
                    currentOp1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                }
            } else if (TextOperation.isRetain(currentOp1) && TextOperation.isDelete(currentOp2)) {
                int retainCount = (Integer) currentOp1;
                int deleteCount = (Integer) currentOp2;
                if (retainCount > -deleteCount) {
                    composed.delete(deleteCount);
                    currentOp1 = retainCount + deleteCount; // + because deleteCount is negative
                    currentOp2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else if (retainCount == -deleteCount) {
                    composed.delete(deleteCount);
                    currentOp1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                    currentOp2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else { // retainCount < -deleteCount
                    composed.delete(-retainCount);
                    currentOp2 = deleteCount + retainCount;
                    currentOp1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                }
            } else {
                throw new IllegalStateException("Unhandled case in compose: op1=" + currentOp1 + ", op2=" + currentOp2);
            }
        }
        return composed;
    }

    /**
     * Transform takes two operations A and B that happened concurrently and
     * produces two operations A' and B' (in an array) such that
     * apply(apply(S, A), B') = apply(apply(S, B), A').
     * Based on ot.js TextOperation.transform
     *
     * @param operation1 Operation A.
     * @param operation2 Operation B.
     * @return A list containing [A', B'].
     * @throws IllegalArgumentException If the base lengths of op1 and op2 don't match.
     */
    public static List<TextOperation> transform(TextOperation operation1, TextOperation operation2) throws IllegalArgumentException {
        // Add explicit base length check like ot.js
        if (operation1.getBaseLength() != operation2.getBaseLength()) {
            throw new IllegalArgumentException(
                String.format("Both operations have to have the same base length (op1: %d, op2: %d)",
                              operation1.getBaseLength(), operation2.getBaseLength()));
        }

        TextOperation operation1prime = new TextOperation();
        TextOperation operation2prime = new TextOperation();
        List<Object> ops1 = operation1.getOps();
        List<Object> ops2 = operation2.getOps();
        int i1 = 0, i2 = 0;
        Object op1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
        Object op2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;

        while (op1 != null || op2 != null) {
            if (op1 == null && op2 == null) { break; } // Should not happen based on loop condition but safe guard

            // next two cases: one operation is insert, the other is retain/delete
            // the insert operations have to be fitted in first
            if (TextOperation.isInsert(op1)) {
                operation1prime.insert((String) op1);
                operation2prime.retain(((String) op1).length());
                op1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                continue;
            }
            if (TextOperation.isInsert(op2)) {
                operation1prime.retain(((String) op2).length());
                operation2prime.insert((String) op2);
                op2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                continue;
            }

            // Debug checks just before the original failure point
            if (op1 == null) {
                throw new IllegalArgumentException("Cannot transform operations: first operation is too short.");
            }
            if (op2 == null) {
                throw new IllegalArgumentException("Cannot transform operations: second operation is too short."); // Use specific message
            }

            int minLength;
            if (TextOperation.isRetain(op1) && TextOperation.isRetain(op2)) {
                // Simple case: retain/retain
                int op1Retain = (Integer) op1;
                int op2Retain = (Integer) op2;
                if (op1Retain > op2Retain) {
                    minLength = op2Retain;
                    op1 = op1Retain - op2Retain;
                    op2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else if (op1Retain == op2Retain) {
                    minLength = op2Retain; // or op1Retain
                    op1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                    op2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else { // op1Retain < op2Retain
                    minLength = op1Retain;
                    op2 = op2Retain - op1Retain;
                    op1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                }
                operation1prime.retain(minLength);
                operation2prime.retain(minLength);
            } else if (TextOperation.isDelete(op1) && TextOperation.isDelete(op2)) {
                // Both operations delete the same string
                int op1Delete = (Integer) op1; // Is negative
                int op2Delete = (Integer) op2; // Is negative
                if (-op1Delete > -op2Delete) { // Compare positive lengths
                    op1 = op1Delete - op2Delete; // op1 adjusted, still negative
                    op2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else if (-op1Delete == -op2Delete) {
                    op1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                    op2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else { // -op1Delete < -op2Delete
                    op2 = op2Delete - op1Delete; // op2 adjusted, still negative
                    op1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                }
                // No operation added to primes, handled implicitly by not retaining
            } else if (TextOperation.isDelete(op1) && TextOperation.isRetain(op2)) {
                int op1Delete = (Integer) op1; // Is negative
                int op2Retain = (Integer) op2;
                if (-op1Delete > op2Retain) {
                    minLength = op2Retain;
                    op1 = op1Delete + op2Retain; // op1 adjusted, still negative
                    op2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else if (-op1Delete == op2Retain) {
                    minLength = op2Retain; // or -op1Delete
                    op1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                    op2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else { // -op1Delete < op2Retain
                    minLength = -op1Delete;
                    op2 = op2Retain + op1Delete; // op2 adjusted
                    op1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                }
                operation1prime.delete(minLength);
            } else if (TextOperation.isRetain(op1) && TextOperation.isDelete(op2)) {
                int op1Retain = (Integer) op1;
                int op2Delete = (Integer) op2; // Is negative
                if (op1Retain > -op2Delete) {
                    minLength = -op2Delete;
                    op1 = op1Retain + op2Delete; // op1 adjusted
                    op2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else if (op1Retain == -op2Delete) {
                    minLength = op1Retain; // or -op2Delete
                    op1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                    op2 = (i2 < ops2.size()) ? ops2.get(i2++) : null;
                } else { // op1Retain < -op2Delete
                    minLength = op1Retain;
                    op2 = op2Delete + op1Retain; // op2 adjusted, still negative
                    op1 = (i1 < ops1.size()) ? ops1.get(i1++) : null;
                }
                operation2prime.delete(minLength);
            } else {
                throw new IllegalStateException("Unrecognized case in transform: op1=" + op1 + ", op2=" + op2);
            }
        }

        return Arrays.asList(operation1prime, operation2prime);
    }
} 