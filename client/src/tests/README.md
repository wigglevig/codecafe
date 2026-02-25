# TextOperationSystem Tests

This directory contains tests for the TextOperationSystem module, which handles operational transformation for collaborative text editing.

## Test Files

1. **TextOperationSystem.test.ts**

   - Comprehensively tests all aspects of the operational transformation system
   - Includes tests for TextOperation, OTSelection, MonacoAdapter, and Client classes
   - Verifies correct behavior for basic operations, compose, transform, selection handling, and client state management

## Running Tests

Run the OT system tests:

```bash
npm test -- src/tests/__tests__/TextOperationSystem.test.ts
```

Run all tests:

```bash
npm test
```

## Key Testing Areas

The test suite covers these key aspects of the OT system:

1. **Basic Operations**

   - Create, retain, insert, delete operations
   - Combining consecutive operations
   - Applying operations to text

2. **Transformation Properties**

   - Compose: Merging consecutive operations
   - Transform: Ensuring concurrent operations can be correctly applied
   - Invert: Creating inverse operations

3. **Selection Handling**

   - Cursor position tracking
   - Selection range transformations

4. **Client State Management**

   - Synchronized, AwaitingConfirm, and AwaitingWithBuffer states
   - Handling of server operations and acknowledgments

5. **Monaco Integration**
   - Converting Monaco editor changes to operations
   - Applying operations back to the editor

## Manual Testing Scenarios

For manual testing of collaborative editing, try these scenarios:

1. **User A and User B editing at the same position**

   - Have two users place cursor at the beginning of a document
   - Let User A type some text
   - Verify User B's cursor is correctly positioned after the inserted text

2. **User A typing and User B deleting text**

   - Have User A and User B open the same document
   - Let User A type several characters
   - Have User B delete a portion of the text
   - Verify both users see the correct final text and cursor positions

3. **User A and User B rapidly typing in different positions**
   - Have User A start typing at the beginning of the document
   - Concurrently have User B start typing elsewhere in the document
   - Verify both changes are properly applied and cursor positions remain correct
