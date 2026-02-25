package com.codecafe.backend.util;

import com.codecafe.backend.dto.TextOperation; // Use your actual DTO
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class OtUtilsTest {

    // Helper method to create TextOperations using your DTO's constructor/builders
    private TextOperation createOp() {
        return new TextOperation();
    }

    // Helper to compare TextOperations using the DTO's equals method
    private void assertOpsEquals(TextOperation expected, TextOperation actual, String message) {
        // Use the equals method provided by your TextOperation DTO
        assertEquals(expected, actual, message);
    }

    @Test
    @DisplayName("Transform: Identity")
    void transformIdentity() {
        TextOperation op1 = createOp().insert("abc").retain(5).delete(2); // base 7, target 8
        // Target length of op1 is 3 + 5 = 8. baseLength is 5 + 2 = 7.
        // Identity op MUST have same base length as op1 for transform
        TextOperation op2 = createOp().retain(op1.getBaseLength()); // base 7, target 7

        // Pre-check base lengths
        assertEquals(op1.getBaseLength(), op2.getBaseLength(), "Base lengths must match for transform");

        List<TextOperation> result = OtUtils.transform(op1, op2);

        assertOpsEquals(op1, result.get(0), "Op1' should equal Op1 when transformed against identity");

        // Op2 (identity) transformed by Op1 should become retain(Op1.TargetLength)
        TextOperation expectedOp2Prime = createOp().retain(op1.getTargetLength()); // Should retain 8
        assertOpsEquals(expectedOp2Prime, result.get(1), "Op2' should be retain(op1.targetLength)");
    }

    @Test
    @DisplayName("Transform: Concurrent Inserts at Different Positions")
    void transformConcurrentInsertsDifferentPos() {
        // Base Doc: "HelloWorld" (length 10)
        TextOperation op1 = createOp().retain(5).insert(" Beautiful ").retain(5); // Base 10, Target 10+11=21
        TextOperation op2 = createOp().insert("Hi ").retain(10); // Base 10, Target 3+10=13

        // Pre-check base lengths
        assertEquals(10, op1.getBaseLength());
        assertEquals(10, op2.getBaseLength());

        // Apply op1: "Hello Beautiful World" (length 21)
        // Apply op2: "Hi HelloWorld" (length 13)

        // Expected B' (op2') applied after A (op1): Apply to "Hello Beautiful World"
        // Original op2: insert "Hi " at 0. Needs to be applied to result of op1. Still insert "Hi " at 0.
        // Expected B' = insert("Hi ").retain(21)
        // Let's re-verify ot.js logic: op2' should retain op1's insert.
        // op1' = retain(3).retain(5).insert(" Beautiful ").retain(5) -> Base 13, Target 24? No.
        // op1' = retain(length op2 inserted).retain(original retain).insert(original insert).retain(original retain)
        // op1' = retain(3).retain(5).insert(" Beautiful ").retain(5)
        TextOperation expectedOp1Prime = createOp().retain(3).retain(5).insert(" Beautiful ").retain(5);

        // op2' = retain(original retain before op1's insert).retain(length op1 inserted).retain(original retain after op1's insert)
        // op2' = insert("Hi ").retain(5).retain(11).retain(5)
        TextOperation expectedOp2Prime = createOp().insert("Hi ").retain(5).retain(11).retain(5);


        List<TextOperation> result = OtUtils.transform(op1, op2);

        assertOpsEquals(expectedOp1Prime, result.get(0), "Op1' transformed incorrectly");
        assertOpsEquals(expectedOp2Prime, result.get(1), "Op2' transformed incorrectly");
    }

    @Test
    @DisplayName("Transform: Concurrent Inserts at Same Position")
    void transformConcurrentInsertsSamePos() {
        // Base Doc: "HelloWorld" (length 10)
        TextOperation op1 = createOp().retain(5).insert("A").retain(5); // Base 10, Target 11
        TextOperation op2 = createOp().retain(5).insert("B").retain(5); // Base 10, Target 11

        // Pre-check base lengths
        assertEquals(10, op1.getBaseLength());
        assertEquals(10, op2.getBaseLength());

        // apply(S,A) = "HelloAWorld" (len 11)
        // apply(S,B) = "HelloBWorld" (len 11)

        // `transform` prefers op1 (convention from ot.js)
        // Expected B' to apply to "HelloAWorld": insert B after A => retain(6).insert("B").retain(5)
        // Expected A' to apply to "HelloBWorld": insert A before B => retain(5).insert("A").retain(6)


        // op1' = retain(original retain).insert(A).retain(length B inserted).retain(original retain after)
        TextOperation expectedOp1Prime = createOp().retain(5).insert("A").retain(1).retain(5);
        // op2' = retain(original retain).retain(length A inserted).insert(B).retain(original retain after)
        TextOperation expectedOp2Prime = createOp().retain(5).retain(1).insert("B").retain(5);

        List<TextOperation> result = OtUtils.transform(op1, op2);

        assertOpsEquals(expectedOp1Prime, result.get(0), "Op1' transformed incorrectly");
        assertOpsEquals(expectedOp2Prime, result.get(1), "Op2' transformed incorrectly");
    }

    @Test
    @DisplayName("Transform: Delete vs Insert")
    void transformDeleteInsert() {
        // Base Doc: "HelloWorld" (length 10)
        TextOperation op1 = createOp().retain(2).delete(3).retain(5); // Base 10, Target 7. Delete "llo"
        TextOperation op2 = createOp().retain(5).insert("TEST").retain(5); // Base 10, Target 13. Insert "TEST" at 5

        // Pre-check base lengths
        assertEquals(10, op1.getBaseLength());
        assertEquals(10, op2.getBaseLength());

        // apply(S,A) = "HeWorld" (len 7)
        // apply(S,B) = "HelloTESTWorld" (len 13)

        // B' to apply after A: Apply to "HeWorld". Original op2 inserted at index 5. Op1 deleted 3 chars before that (at index 2). New index is 5-3=2.
        // B' = retain(2).insert("TEST").retain(5) -> Apply to "HeWorld". "HeTESTWorld". Correct.
        TextOperation expectedOp2Prime = createOp().retain(2).insert("TEST").retain(5);

        // A' to apply after B: Apply to "HelloTESTWorld". Original op1 deleted 3 chars at index 2 ("llo"). Op2 inserted "TEST" after that. Deletion is unaffected.
        // A' = retain(2).delete(3).retain(5 + length("TEST")) -> Need to retain over original chars + inserted chars. Retain 5 (World) + 4 (TEST) = 9.
        // A' = retain(2).delete(3).retain(9) -> Apply to "HelloTESTWorld". "HeTESTWorld". Correct.
        TextOperation expectedOp1Prime = createOp().retain(2).delete(3).retain(9);

        List<TextOperation> result = OtUtils.transform(op1, op2);

        assertOpsEquals(expectedOp1Prime, result.get(0), "Op1' (delete) transformed incorrectly");
        assertOpsEquals(expectedOp2Prime, result.get(1), "Op2' (insert) transformed incorrectly");
    }

    @Test
    @DisplayName("Transform: Insert vs Delete")
    void transformInsertDelete() {
        // Base Doc: "HelloWorld" (length 10)
        TextOperation op1 = createOp().retain(5).insert("TEST").retain(5); // Base 10, Target 13. Insert "TEST" at 5
        TextOperation op2 = createOp().retain(2).delete(3).retain(5); // Base 10, Target 7. Delete "llo"

        // Pre-check base lengths
        assertEquals(10, op1.getBaseLength());
        assertEquals(10, op2.getBaseLength());

        // Symmetric to previous test
        // apply(S,A) = "HelloTESTWorld"
        // apply(S,B) = "HeWorld" (len 7)

        // A' to apply after B: Apply to "HeWorld". Original op1 inserted "TEST" at index 5. Op2 deleted 3 chars before that (at index 2). New insert index is 5-3=2.
        // A' = retain(2).insert("TEST").retain(5) -> Apply to "HeWorld". "HeTESTWorld". Correct.
        TextOperation expectedOp1Prime = createOp().retain(2).insert("TEST").retain(5);

        // B' to apply after A: Apply to "HelloTESTWorld". Original op2 deleted 3 chars at index 2 ("llo"). Op1 inserted "TEST" after that. Deletion is unaffected.
        // B' = retain(2).delete(3).retain(5 + length("TEST")) -> Retain over "World" + "TEST".
        // B' = retain(2).delete(3).retain(9) -> Apply to "HelloTESTWorld". "HeTESTWorld". Correct.
        TextOperation expectedOp2Prime = createOp().retain(2).delete(3).retain(9);

        List<TextOperation> result = OtUtils.transform(op1, op2);

        assertOpsEquals(expectedOp1Prime, result.get(0), "Op1' (insert) transformed incorrectly");
        assertOpsEquals(expectedOp2Prime, result.get(1), "Op2' (delete) transformed incorrectly");
    }


    @Test
    @DisplayName("Transform: Concurrent Deletes Overlapping")
    void transformConcurrentDeletesOverlap() {
        // Base Doc: "HelloWorld" (length 10)
        TextOperation op1 = createOp().retain(1).delete(4).retain(5); // Base 10, Target 6. Delete "ello"
        TextOperation op2 = createOp().retain(3).delete(4).retain(3); // Base 10, Target 6. Delete "oWor"

        // Pre-check base lengths
        assertEquals(10, op1.getBaseLength());
        assertEquals(10, op2.getBaseLength());

        // op1 deletes indices 1,2,3,4 -> "HWorld" (len 6)
        // op2 deletes indices 3,4,5,6 -> "Helrld" (len 6)
        // Final expected state: "Hrld" (len 4)

        // A' to apply after B: Apply to "Helrld". Original A deleted indices 1,2,3,4 ("ello"). 'o' is already deleted by B. Need to delete "ell". Indices 1,2.
        // A' = retain(1).delete(2).retain(3) -> Apply to "Helrld". "Hrld" (len 4). Correct.
        TextOperation expectedOp1Prime = createOp().retain(1).delete(2).retain(3);

        // B' to apply after A: Apply to "HWorld". Original B deleted indices 3,4,5,6 ("oWor"). 'o' is already deleted by A. Need to delete "Wor". Indices 1,2,3.
        // B' = retain(1).delete(3).retain(2) -> Apply to "HWorld". "Hld" (len 3). ERROR in manual trace. Let's re-use trace from previous attempt.

        // Previous trace yielded: op1' = [1, -2, 3], op2' = [1, -2, 3]
        // Expected B' = retain 1, delete 2, retain 3. Apply to "HWorld". "Hrld". Correct.
        TextOperation expectedOp2Prime = createOp().retain(1).delete(2).retain(3);


        List<TextOperation> result = OtUtils.transform(op1, op2);

        assertOpsEquals(expectedOp1Prime, result.get(0), "Op1' transformed incorrectly");
        assertOpsEquals(expectedOp2Prime, result.get(1), "Op2' transformed incorrectly");
    }

    @Test
    @DisplayName("Transform: Identity - Op1 vs Retain(Op1.BaseLength)")
    void transformIdentityBase() {
        TextOperation op1 = createOp().insert("abc").retain(5).delete(2); // base=7, target=8
        // Identity op must have SAME base length as op1
        TextOperation op2_identity_base = createOp().retain(op1.getBaseLength()); // base=7, target=7

        // Pre-check base lengths MUST match for transform
        assertEquals(op1.getBaseLength(), op2_identity_base.getBaseLength(), "Identity op baseLength should match op1 baseLength");

        List<TextOperation> result = OtUtils.transform(op1, op2_identity_base);

        // Op1 transformed by identity should be unchanged
        assertEquals(op1, result.get(0), "Op1' should equal Op1 when transformed against identity");
        // Op2 (identity) transformed by Op1 should become retain(Op1.TargetLength)
        TextOperation expectedOp2Prime = createOp().retain(op1.getTargetLength()); // Expect retain(8)
        assertEquals(expectedOp2Prime, result.get(1), "Op2' for base identity incorrect");
    }

    @Test
    @DisplayName("Transform: Should throw for mismatched base lengths")
    void transformMismatchedBaseLengths() {
        TextOperation op1 = createOp().retain(10); // baseLength 10
        TextOperation op2 = createOp().retain(11); // baseLength 11

        // NOTE: Your OtUtils.transform doesn't explicitly check baseLength at the start like ot.js.
        // It throws "Cannot transform operations: first operation is too short." later instead.
        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            // This will now throw IllegalArgumentException immediately due to the added check
            OtUtils.transform(op1, op2);
        }, "Transform should fail immediately if base lengths mismatch");

        // Check the exception message
        assertTrue(exception.getMessage().contains("Both operations have to have the same base length"),
                   "Exception message should indicate base length mismatch");
    }

    @Test
    @DisplayName("Transform: Insert at start vs Delete spanning start")
    void transformInsertStartDeleteSpanningStart() {
        // Base Doc: "ABCDE" (length 5)
        TextOperation op1 = createOp().insert("TEST").retain(5); // Base 5, Target 8. Insert "TEST" at 0
        TextOperation op2 = createOp().delete(2).retain(3); // Base 5, Target 3. Delete "AB"

        // Pre-check base lengths
        assertEquals(5, op1.getBaseLength());
        assertEquals(5, op2.getBaseLength());

        // apply(S, A): "TESTABCDE"
        // apply(S, B): "CDE" (len 3)


        // A' after B: Apply to "CDE". Original A inserted "TEST" at 0. B deleted chars before that. Still insert at 0.
        // A' = insert("TEST").retain(3) -> Apply to "CDE". "TESTCDE". Correct.
        TextOperation expectedOp1Prime = createOp().insert("TEST").retain(3);

        // B' after A: Apply to "TESTABCDE". Original B deleted 2 chars at index 0 ("AB"). A inserted "TEST" before that. Delete should happen after "TEST".
        // B' = retain(length("TEST")).delete(2).retain(3) -> Apply to "TESTABCDE". "TESTCDE". Correct.
        TextOperation expectedOp2Prime = createOp().retain(4).delete(2).retain(3);

        List<TextOperation> result = OtUtils.transform(op1, op2);

        assertOpsEquals(expectedOp1Prime, result.get(0), "Op1' (insert) transformed incorrectly");
        assertOpsEquals(expectedOp2Prime, result.get(1), "Op2' (delete) transformed incorrectly");
    }


    // Add more tests here, focusing on cases revealed by your failing stress tests if possible.
    // Consider cases with multiple ops (retain, insert, delete) within a single TextOperation.
}