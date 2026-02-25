import {
  editor,
  Position,
  Selection,
  IDisposable,
  Range as MonacoRange,
} from "monaco-editor";

// #############################################################################
// ## Core TextOperation Logic (Special thanks to ot.js for the original implementation!)
// #############################################################################

export class TextOperation {
  ops: (string | number)[];
  baseLength: number;
  targetLength: number;

  // Constructor.
  constructor() {
    this.ops = [];
    this.baseLength = 0;
    this.targetLength = 0;
  }

  // Helper to check if an op is retain.
  static isRetain(op: string | number): op is number {
    return typeof op === "number" && op > 0;
  }

  // Helper to check if an op is insert.
  static isInsert(op: string | number): op is string {
    return typeof op === "string";
  }

  // Helper to check if an op is delete.
  static isDelete(op: string | number): op is number {
    return typeof op === "number" && op < 0;
  }

  // Add a retain operation.
  retain(n: number): this {
    if (typeof n !== "number" || n < 0) {
      throw new Error("retain expects a non-negative integer.");
    }
    if (n === 0) return this;
    this.baseLength += n;
    this.targetLength += n;
    const lastOp = this.ops[this.ops.length - 1];
    if (TextOperation.isRetain(lastOp)) {
      // Combine consecutive retains.
      this.ops[this.ops.length - 1] = lastOp + n;
    } else {
      this.ops.push(n);
    }
    return this;
  }

  // Add an insert operation.
  insert(str: string): this {
    if (typeof str !== "string") {
      throw new Error("insert expects a string.");
    }
    if (str === "") return this;
    this.targetLength += str.length;
    const ops = this.ops;
    const lastOp = ops[ops.length - 1];
    const secondLastOp = ops[ops.length - 2];

    if (TextOperation.isInsert(lastOp)) {
      // Combine consecutive inserts.
      ops[ops.length - 1] = lastOp + str;
    } else if (TextOperation.isDelete(lastOp)) {
      // It doesn't matter when an insert occurs between retain and delete,
      // so push it before the delete.
      if (TextOperation.isInsert(secondLastOp)) {
        ops[ops.length - 2] = secondLastOp + str;
      } else {
        ops[ops.length] = lastOp;
        ops[ops.length - 2] = str;
      }
    } else {
      ops.push(str);
    }
    return this;
  }

  // Add a delete operation.
  delete(n: number | string): this {
    let length;
    if (typeof n === "string") {
      length = n.length;
    } else if (typeof n === "number") {
      length = n;
    } else {
      throw new Error("delete expects an integer or a string.");
    }
    if (length === 0) return this;
    if (length > 0) {
      length = -length;
    }
    this.baseLength -= length; // baseLength increases
    const lastOp = this.ops[this.ops.length - 1];
    if (TextOperation.isDelete(lastOp)) {
      this.ops[this.ops.length - 1] = lastOp + length;
    } else {
      this.ops.push(length);
    }
    return this;
  }

  // Checks if this operation is a no-op.
  isNoop(): boolean {
    return (
      this.ops.length === 0 ||
      (this.ops.length === 1 && TextOperation.isRetain(this.ops[0]))
    );
  }

  // Converts operation into a JSON serializable representation.
  toJSON(): (string | number)[] {
    return this.ops;
  }

  // Creates an operation from a JSON representation.
  static fromJSON(ops: (string | number)[]): TextOperation {
    const o = new TextOperation();
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      if (TextOperation.isRetain(op)) {
        o.retain(op as number);
      } else if (TextOperation.isInsert(op)) {
        o.insert(op as string);
      } else if (TextOperation.isDelete(op)) {
        o.delete(op as number);
      } else {
        throw new Error("unknown operation type: " + JSON.stringify(op));
      }
    }
    return o;
  }

  // Apply the operation to a string, returning a new string.
  apply(str: string): string {
    const newStr = [];
    let strIndex = 0;
    for (let i = 0; i < this.ops.length; i++) {
      const op = this.ops[i];
      if (TextOperation.isRetain(op)) {
        if (strIndex + op > str.length) {
          throw new Error(
            "Operation check error: Retain length should not exceed string length."
          );
        }
        newStr.push(str.slice(strIndex, strIndex + op));
        strIndex += op;
      } else if (TextOperation.isInsert(op)) {
        newStr.push(op);
      } else {
        strIndex -= op;
        if (strIndex > str.length) {
          throw new Error(
            "Operation check error: Delete length should not exceed string length."
          );
        }
      }
    }
    return newStr.join("");
  }

  // Computes the inverse of an operation.
  invert(str: string): TextOperation {
    const inverse = new TextOperation();
    let strIndex = 0;
    for (let i = 0; i < this.ops.length; i++) {
      const op = this.ops[i];
      if (TextOperation.isRetain(op)) {
        inverse.retain(op);
        strIndex += op;
      } else if (TextOperation.isInsert(op)) {
        inverse.delete(op.length);
      } else {
        // delete op
        // Check boundary condition before substring
        if (strIndex > str.length) {
          throw new Error(
            `Cannot invert delete (${-op}) starting past end of document (${
              str.length
            }) at index ${strIndex}. Original Op: ${this.toString()}`
          );
        }
        const endIndex = Math.min(strIndex - op, str.length);
        inverse.insert(str.slice(strIndex, endIndex));
        strIndex -= op;
      }
    }
    return inverse;
  }

  // Compose merges two consecutive operations into one.
  compose(operation2: TextOperation): TextOperation {
    // Use a different approach to avoid 'this' aliasing
    if (this.targetLength !== operation2.baseLength) {
      throw new Error(
        "The base length of the second operation has to be the target length of the first operation"
      );
    }

    const operation = new TextOperation(); // the combined operation
    const ops1 = this.ops;
    const ops2 = operation2.ops;
    let i1 = 0,
      i2 = 0; // current index into ops1/ops2
    let op1 = ops1[i1++];
    let op2 = ops2[i2++];
    while (true) {
      // Dispatch on the type of op1 and op2
      if (typeof op1 === "undefined" && typeof op2 === "undefined") {
        // end condition: both operations have been processed
        break;
      }

      if (TextOperation.isDelete(op1)) {
        operation.delete(op1 as number);
        op1 = ops1[i1++];
        continue;
      }
      if (TextOperation.isInsert(op2)) {
        operation.insert(op2 as string);
        op2 = ops2[i2++];
        continue;
      }

      if (typeof op1 === "undefined") {
        throw new Error(
          "Cannot compose operations: first operation is too short."
        );
      }
      if (typeof op2 === "undefined") {
        throw new Error(
          "Cannot compose operations: second operation is too short."
        );
      }

      if (TextOperation.isRetain(op1) && TextOperation.isRetain(op2)) {
        const op1Retain = op1 as number;
        const op2Retain = op2 as number;
        if (op1Retain > op2Retain) {
          operation.retain(op2Retain);
          op1 = op1Retain - op2Retain;
          op2 = ops2[i2++];
        } else if (op1Retain === op2Retain) {
          operation.retain(op1Retain);
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          operation.retain(op1Retain);
          op2 = op2Retain - op1Retain;
          op1 = ops1[i1++];
        }
      } else if (TextOperation.isInsert(op1) && TextOperation.isDelete(op2)) {
        const op1Insert = op1 as string;
        const op2Delete = op2 as number;
        if (op1Insert.length > -op2Delete) {
          op1 = op1Insert.slice(0, op1Insert.length + op2Delete);
          op2 = ops2[i2++];
        } else if (op1Insert.length === -op2Delete) {
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          op2 = op2Delete + op1Insert.length;
          op1 = ops1[i1++];
        }
      } else if (TextOperation.isInsert(op1) && TextOperation.isRetain(op2)) {
        const op1Insert = op1 as string;
        const op2Retain = op2 as number;
        if (op1Insert.length > op2Retain) {
          operation.insert(op1Insert.slice(0, op2Retain));
          op1 = op1Insert.slice(op2Retain);
          op2 = ops2[i2++];
        } else if (op1Insert.length === op2Retain) {
          operation.insert(op1Insert);
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          operation.insert(op1Insert);
          op2 = op2Retain - op1Insert.length;
          op1 = ops1[i1++];
        }
      } else if (TextOperation.isRetain(op1) && TextOperation.isDelete(op2)) {
        const op1Retain = op1 as number;
        const op2Delete = op2 as number;
        if (op1Retain > -op2Delete) {
          operation.delete(op2Delete);
          op1 = op1Retain + op2Delete;
          op2 = ops2[i2++];
        } else if (op1Retain === -op2Delete) {
          operation.delete(op2Delete);
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          operation.delete(-op1Retain);
          op2 = op2Delete + op1Retain;
          op1 = ops1[i1++];
        }
      } else {
        throw new Error(
          "This shouldn't happen: op1: " +
            JSON.stringify(op1) +
            ", op2: " +
            JSON.stringify(op2)
        );
      }
    }

    return operation;
  }

  // Transform takes two operations A and B that happened concurrently and
  // produces two operations A' and B' (in an array) such that
  // apply(apply(S, A), B') = apply(apply(S, B), A').
  static transform(
    operation1: TextOperation,
    operation2: TextOperation
  ): [TextOperation, TextOperation] {
    // Add detailed logging before the check
    // console.log(
    // `[Transform Check] Op1 Base: ${operation1.baseLength}, Op2 Base: ${operation2.baseLength}`,
    // {
    // op1_ops: operation1.toJSON(),
    // op2_ops: operation2.toJSON(),
    // // Log the full objects for inspection in console
    // op1_object: operation1,
    // op2_object: operation2,
    // }
    // );

    const operation1prime = new TextOperation();
    const operation2prime = new TextOperation();
    const ops1 = operation1.ops;
    const ops2 = operation2.ops;
    let i1 = 0,
      i2 = 0;
    let op1 = ops1[i1++];
    let op2 = ops2[i2++];
    while (true) {
      // At every iteration of the loop, the imaginary cursor that both
      // operation1 and operation2 have that operates on the input string must
      // have the same position in the input string.

      if (typeof op1 === "undefined" && typeof op2 === "undefined") {
        // end condition: both operations have been processed
        break;
      }

      // next two cases: one operation is insert, the other is retain/delete
      // the insert operations have to be fitted in first
      if (TextOperation.isInsert(op1)) {
        operation1prime.insert(op1 as string);
        operation2prime.retain((op1 as string).length);
        op1 = ops1[i1++];
        continue;
      }
      if (TextOperation.isInsert(op2)) {
        operation1prime.retain((op2 as string).length);
        operation2prime.insert(op2 as string);
        op2 = ops2[i2++];
        continue;
      }

      if (typeof op1 === "undefined") {
        throw new Error(
          "Cannot transform operations: first operation is too short."
        );
      }
      if (typeof op2 === "undefined") {
        throw new Error(
          "Cannot transform operations: second operation is too short."
        );
      }

      let minLength;
      if (TextOperation.isRetain(op1) && TextOperation.isRetain(op2)) {
        // Simple case: retain/retain
        const op1Retain = op1 as number;
        const op2Retain = op2 as number;
        if (op1Retain > op2Retain) {
          minLength = op2Retain;
          op1 = op1Retain - op2Retain;
          op2 = ops2[i2++];
        } else if (op1Retain === op2Retain) {
          minLength = op2Retain;
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          minLength = op1Retain;
          op2 = op2Retain - op1Retain;
          op1 = ops1[i1++];
        }
        operation1prime.retain(minLength);
        operation2prime.retain(minLength);
      } else if (TextOperation.isDelete(op1) && TextOperation.isDelete(op2)) {
        // Both operations delete the same string
        const op1Delete = op1 as number;
        const op2Delete = op2 as number;
        if (-op1Delete > -op2Delete) {
          op1 = op1Delete - op2Delete;
          op2 = ops2[i2++];
        } else if (-op1Delete === -op2Delete) {
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          op2 = op2Delete - op1Delete;
          op1 = ops1[i1++];
        }
      } else if (TextOperation.isDelete(op1) && TextOperation.isRetain(op2)) {
        const op1Delete = op1 as number;
        const op2Retain = op2 as number;
        if (-op1Delete > op2Retain) {
          minLength = op2Retain;
          op1 = op1Delete + op2Retain;
          op2 = ops2[i2++];
        } else if (-op1Delete === op2Retain) {
          minLength = op2Retain;
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          minLength = -op1Delete;
          op2 = op2Retain + op1Delete;
          op1 = ops1[i1++];
        }
        operation1prime.delete(minLength);
      } else if (TextOperation.isRetain(op1) && TextOperation.isDelete(op2)) {
        const op1Retain = op1 as number;
        const op2Delete = op2 as number;
        if (op1Retain > -op2Delete) {
          minLength = -op2Delete;
          op1 = op1Retain + op2Delete;
          op2 = ops2[i2++];
        } else if (op1Retain === -op2Delete) {
          minLength = op1Retain;
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          minLength = op1Retain;
          op2 = op2Delete + op1Retain;
          op1 = ops1[i1++];
        }
        operation2prime.delete(minLength);
      } else {
        // This console.error should ideally not be reachable now if the "too short" checks are correct
        console.error(
          "Unrecognized transform case hit! Should have been caught by 'too short' checks.",
          {
            current_op1: op1,
            current_op2: op2,
            index1: i1,
            index2: i2,
            initial_ops1: ops1,
            initial_ops2: ops2,
            prime1_so_far: operation1prime.toJSON(),
            prime2_so_far: operation2prime.toJSON(),
          }
        );
        throw new Error("Unrecognized case in transform.");
      }
    }
    return [operation1prime, operation2prime];
  }

  // Pretty printing.
  toString(): string {
    return this.ops
      .map((op) => {
        if (TextOperation.isRetain(op)) {
          return "retain " + op;
        } else if (TextOperation.isInsert(op)) {
          return "insert '" + op + "'";
        } else {
          return "delete " + -op;
        }
      })
      .join(", ");
  }
}

// #############################################################################
// ## Monaco Adapter Logic
// #############################################################################

// Helper functions to convert between Monaco Position and document offset
export function positionToOffset(
  model: editor.ITextModel,
  position: Position
): number {
  return model.getOffsetAt(position);
}

export function offsetToPosition(
  model: editor.ITextModel,
  offset: number
): Position {
  const maxOffset = getModelLength(model);
  const clampedOffset = Math.max(0, Math.min(offset, maxOffset));
  // if (offset !== clampedOffset) {
  //     console.warn(`Clamped offset from ${offset} to ${clampedOffset}`);
  // }
  return model.getPositionAt(clampedOffset);
}

function getModelLength(model: editor.ITextModel): number {
  const lastLine = model.getLineCount();
  const lastCol = model.getLineMaxColumn(lastLine);
  return model.getOffsetAt(new Position(lastLine, lastCol));
}

interface MonacoAdapterEvents {
  change?: (operation: TextOperation, inverse: TextOperation) => void;
  selectionChange?: () => void;
  blur?: () => void;
  focus?: () => void;
}

export class MonacoAdapter {
  private editor: editor.IStandaloneCodeEditor;
  private model: editor.ITextModel;
  public ignoreNextChange: boolean = false;
  private changeInProgress: boolean = false;
  private selectionChanged: boolean = false;
  private callbacks: MonacoAdapterEvents = {};
  private lastValue: string = ""; // Restore lastValue
  private contentChangeListener: IDisposable | null = null;
  private cursorChangeListener: IDisposable | null = null;
  private focusListener: IDisposable | null = null;
  private blurListener: IDisposable | null = null;

  constructor(editorInstance: editor.IStandaloneCodeEditor) {
    this.editor = editorInstance;
    this.model = editorInstance.getModel()!;
    this.lastValue = this.model.getValue(); // Initialize lastValue

    this.onDidContentChange = this.onDidContentChange.bind(this);
    this.onDidCursorPositionChange = this.onDidCursorPositionChange.bind(this);
    this.onDidFocusEditorText = this.onDidFocusEditorText.bind(this);
    this.onDidBlurEditorText = this.onDidBlurEditorText.bind(this);

    // Debounce content change handler to aggregate rapid changes
    // const debouncedHandler = debounce(this.onDidContentChange, 50); // 50ms debounce window

    this.contentChangeListener =
      // this.editor.onDidChangeModelContent(debouncedHandler);
      this.editor.onDidChangeModelContent(this.onDidContentChange); // Remove debounce
    // No debounce for cursor needed, handled by Client state/debounced sender
    this.cursorChangeListener = this.editor.onDidChangeCursorPosition(
      this.onDidCursorPositionChange
    );
    this.focusListener = this.editor.onDidFocusEditorText(
      this.onDidFocusEditorText
    );
    this.blurListener = this.editor.onDidBlurEditorText(
      this.onDidBlurEditorText
    );
  }

  detach(): void {
    this.contentChangeListener?.dispose();
    this.cursorChangeListener?.dispose();
    this.focusListener?.dispose();
    this.blurListener?.dispose();
    // console.log("MonacoAdapter detached listeners.");
  }

  // Convert Monaco change events to a TextOperation
  // Attempts to derive old value for inverse calculation
  static operationFromMonacoChanges(
    changes: editor.IModelContentChangedEvent["changes"],
    previousDocValue: string // Doc state BEFORE the change
  ): [TextOperation, TextOperation] {
    const oldDocLength = previousDocValue.length; // Calculate from previous value

    // Reconstruct approximate old value by reversing changes (VERY HARD TO GET RIGHT)
    // For simplicity, we'll use the *current* value to generate the inverse later.
    // This means the `invert` function needs the *current* doc state, not the old one.
    const valueForInvert = previousDocValue; // Let's try using the previous value for invert too

    // Sort changes by offset for sequential processing
    const sortedChanges = [...changes].sort(
      (a, b) => a.rangeOffset - b.rangeOffset
    );

    const forwardOperation = new TextOperation();
    let runningOffset = 0; // Tracks position in the *old* document state

    for (const change of sortedChanges) {
      const retainLength = change.rangeOffset - runningOffset;
      if (retainLength < 0) {
        console.error(
          "Negative retain detected in operationFromMonacoChanges",
          { change, runningOffset, oldDocLength }
        );
        throw new Error("Negative retain in forward operation calculation");
      }
      if (retainLength > 0) forwardOperation.retain(retainLength);

      const deletedLength = change.rangeLength;
      const insertedText = change.text;

      if (deletedLength > 0) {
        forwardOperation.delete(deletedLength);
      }
      if (insertedText.length > 0) {
        forwardOperation.insert(insertedText);
      }
      // Advance offset based on the length processed in the *old* document
      runningOffset += retainLength + deletedLength;
    }

    const finalRetain = oldDocLength - runningOffset;
    if (finalRetain < 0) {
      console.error(
        "Negative final retain detected in operationFromMonacoChanges",
        { oldDocLength, runningOffset, previousDocValue, changes }
      );
      throw new Error("Negative final retain in forward operation calculation");
    }
    if (finalRetain > 0) forwardOperation.retain(finalRetain);

    // Add sanity check:
    if (forwardOperation.baseLength !== oldDocLength) {
      console.error(
        `CALCULATION MISMATCH in operationFromMonacoChanges! forwardOp.baseLength=${forwardOperation.baseLength}, calcOldDocLength=${oldDocLength}`,
        {
          changes: changes,
          previousDocValue: previousDocValue,
        }
      );

      // throw new Error("Internal error: Mismatch in operation baseLength calculation.");
    }

    // Generate inverse based on the value BEFORE the change
    const inverseOperation = forwardOperation.invert(valueForInvert);

    return [forwardOperation, inverseOperation];
  }

  applyOperation(operation: TextOperation): void {
    if (operation.isNoop()) return;

    this.ignoreNextChange = true;
    const model = this.editor.getModel();
    if (!model) {
      console.error("Cannot apply operation: Monaco model not found.");
      this.ignoreNextChange = false; // Reset flag if we can't apply
      return;
    }

    const edits: editor.IIdentifiedSingleEditOperation[] = [];
    let currentIndex = 0;

    try {
      for (const op of operation.ops) {
        if (TextOperation.isRetain(op)) {
          currentIndex += op;
        } else if (TextOperation.isInsert(op)) {
          const pos = offsetToPosition(model, currentIndex);
          edits.push({
            range: new MonacoRange(
              pos.lineNumber,
              pos.column,
              pos.lineNumber,
              pos.column
            ),
            text: op,
            forceMoveMarkers: true,
          });
        } else if (TextOperation.isDelete(op)) {
          const deleteCount = -op;
          const startPos = offsetToPosition(model, currentIndex);
          const endPos = offsetToPosition(model, currentIndex + deleteCount);
          edits.push({
            range: new MonacoRange(
              startPos.lineNumber,
              startPos.column,
              endPos.lineNumber,
              endPos.column
            ),
            text: "",
            forceMoveMarkers: true,
          });
          currentIndex += deleteCount;
        } else {
          throw new Error("Invalid OP type in applyOperation");
        }
      }

      model.pushEditOperations([], edits, () => null);
    } catch (e) {
      console.error(
        "Error applying operation:",
        e,
        "Op:",
        operation.toString(),
        "Edits:",
        edits
      );
      this.ignoreNextChange = false; // Reset on error
    }
    // ignoreNextChange is reset in the change handler
  }

  registerCallbacks(cb: MonacoAdapterEvents): void {
    this.callbacks = cb;
  }

  trigger(event: keyof MonacoAdapterEvents, ...args: unknown[]): void {
    const action = this.callbacks[event];
    if (action) {
      (action as (...a: unknown[]) => void)(...args);
    }
  }

  private onDidContentChange({
    changes,
  }: editor.IModelContentChangedEvent): void {
    const currentValue = this.model.getValue(); // Get value AFTER the change

    if (this.ignoreNextChange) {
      // console.log("Adapter: Ignoring change caused by applyOperation.");
      this.ignoreNextChange = false;
      // Update lastValue to reflect the state AFTER the ignored server change
      this.lastValue = currentValue;
      if (this.selectionChanged) {
        // console.log(
        // "Adapter: Triggering deferred selectionChange after ignored content change."
        // );
        this.trigger("selectionChange");
        this.selectionChanged = false;
      }
      return;
    }

    // console.log("Adapter: Processing user change event.");

    const valueBeforeChange = this.lastValue;
    // console.log(
    // "Calling operationFromMonacoChanges with previousDocValue:",
    // JSON.stringify(valueBeforeChange)
    // );

    try {
      // Use the reliable previous value
      const [operation, inverse] = MonacoAdapter.operationFromMonacoChanges(
        changes, // Use destructured 'changes'
        // currentLength, // Not needed
        valueBeforeChange // Pass the value *before* this change
      );

      // Update lastValue for the *next* change event AFTER successfully processing this one
      this.lastValue = currentValue;

      // console.log(
      // "Local change -> Op:",
      // operation.toString(),
      // "Inverse:",
      // inverse.toString()
      // );
      if (!operation.isNoop()) {
        this.trigger("change", operation, inverse);
      }
    } catch (err) {
      console.error(
        "Error creating operation from Monaco changes:",
        err,
        changes // Use destructured 'changes'
      );
    }

    if (this.selectionChanged) {
      // console.log(
      // "Adapter: Triggering deferred selectionChange after user content change."
      // );
      this.trigger("selectionChange");
      this.selectionChanged = false;
    }
    this.changeInProgress = false;
  }

  private onDidCursorPositionChange(): void {
    if (this.ignoreNextChange) {
      // console.log("Adapter: Ignoring cursor change during programmatic update.");
      this.selectionChanged = true;
      return;
    }
    // console.log("Adapter: User cursor/selection change detected.");
    if (this.changeInProgress) {
      // Should not happen if debounced
      this.selectionChanged = true;
    } else {
      this.trigger("selectionChange");
      this.selectionChanged = false;
    }
  }

  private onDidFocusEditorText(): void {
    // console.log("Adapter: Editor focused.");
    this.onDidCursorPositionChange();
  }

  private onDidBlurEditorText(): void {
    // console.log("Adapter: Editor blurred.");
    const selection = this.editor.getSelection();
    if (!selection || selection.isEmpty()) {
      this.trigger("blur");
    }
  }

  getSelection(): OTSelection | null {
    const selections = this.editor.getSelections();
    if (!selections || selections.length === 0) return null;

    const model = this.model;
    if (!model) return null;

    try {
      const ranges = selections.map((sel) => {
        const startOffset = positionToOffset(model, sel.getStartPosition());
        const endOffset = positionToOffset(model, sel.getEndPosition());
        // Use const for anchor and head based on conditional assignment
        const anchor = sel.getSelectionStart().equals(sel.getStartPosition())
          ? startOffset
          : endOffset;
        const head = sel.getSelectionStart().equals(sel.getStartPosition())
          ? endOffset
          : startOffset;
        return new OTSelection.SelectionRange(anchor, head);
      });
      return new OTSelection(ranges);
    } catch (e) {
      console.error("Error getting selection:", e);
      return null;
    }
  }

  setSelection(selection: OTSelection | null): void {
    this.ignoreNextChange = true; // Ignore potential cursor change event
    try {
      const model = this.model;
      if (!model) return;

      if (!selection || selection.ranges.length === 0) {
        const currentPos = this.editor.getPosition() || new Position(1, 1);
        this.editor.setSelection(
          new Selection(
            currentPos.lineNumber,
            currentPos.column,
            currentPos.lineNumber,
            currentPos.column
          )
        );
        // console.log("Adapter: Cleared selection / collapsed cursor.");
        return;
      }

      const monacoSelections = selection.ranges.map((range) => {
        const anchorPos = offsetToPosition(model, range.anchor);
        const headPos = offsetToPosition(model, range.head);
        return new Selection(
          anchorPos.lineNumber,
          anchorPos.column,
          headPos.lineNumber,
          headPos.column
        );
      });
      // console.log("Adapter: Setting Monaco selections:", monacoSelections);
      this.editor.setSelections(monacoSelections);
    } catch (e) {
      console.error("Error setting selection:", e, selection);
    } finally {
      setTimeout(() => {
        this.ignoreNextChange = false;
        this.selectionChanged = false; // Clear deferred flag
        // console.log("Adapter: Reset ignoreNextChange after setSelection timeout.");
      }, 0);
    }
  }

  setOtherSelection(): { clear: () => void } {
    // ... (implementation requires CSS and decoration management) ...
    // console.warn("setOtherSelection not fully implemented for Monaco");
    return { clear: () => {} }; // Placeholder
  }
}

// #############################################################################
// ## Selection Logic (based on ot.js Selection)
// #############################################################################

export class OTSelection {
  static SelectionRange = class SelectionRange {
    anchor: number;
    head: number;

    constructor(anchor: number, head: number) {
      this.anchor = anchor;
      this.head = head;
    }

    static fromJSON(obj: { anchor: number; head: number }): SelectionRange {
      return new SelectionRange(obj.anchor, obj.head);
    }

    equals(other: SelectionRange): boolean {
      return this.anchor === other.anchor && this.head === other.head;
    }

    isEmpty(): boolean {
      return this.anchor === this.head;
    }

    private transformIndex(index: number, operation: TextOperation): number {
      let newIndex = index;
      let currentOffset = 0;
      for (const op of operation.ops) {
        if (TextOperation.isRetain(op)) {
          if (index <= currentOffset + op) {
            return newIndex;
          }
          currentOffset += op;
        } else if (TextOperation.isInsert(op)) {
          if (currentOffset <= index) {
            newIndex += op.length;
          }
        } else if (TextOperation.isDelete(op)) {
          const deleteCount = -op;
          if (index <= currentOffset) {
            /* Before delete */
          } else if (index <= currentOffset + deleteCount) {
            return currentOffset; /* Within delete */
          } else {
            newIndex -= deleteCount; /* After delete */
          }
          currentOffset += deleteCount;
        } else {
          throw new Error("Invalid op type during selection index transform");
        }
      }
      return newIndex;
    }

    transform(operation: TextOperation): SelectionRange {
      // Renamed Range to SelectionRange
      const newAnchor = this.transformIndex(this.anchor, operation);
      const newHead =
        this.anchor === this.head
          ? newAnchor
          : this.transformIndex(this.head, operation);
      return new SelectionRange(newAnchor, newHead); // Renamed Range to SelectionRange
    }
  }; // End of static SelectionRange class definition

  ranges: InstanceType<typeof OTSelection.SelectionRange>[];

  constructor(ranges?: InstanceType<typeof OTSelection.SelectionRange>[]) {
    this.ranges =
      ranges && ranges.length > 0
        ? ranges.map((r) => new OTSelection.SelectionRange(r.anchor, r.head))
        : [new OTSelection.SelectionRange(0, 0)];
  }

  static createCursor(position: number): OTSelection {
    return new OTSelection([
      new OTSelection.SelectionRange(position, position),
    ]);
  }

  static fromJSON(
    obj: { ranges?: { anchor: number; head: number }[] } | null
  ): OTSelection {
    if (!obj || !obj.ranges || obj.ranges.length === 0) {
      return new OTSelection([new OTSelection.SelectionRange(0, 0)]);
    }

    return new OTSelection(
      obj.ranges.map((r) => new OTSelection.SelectionRange(r.anchor, r.head))
    );
  }

  equals(other: OTSelection | null): boolean {
    if (!other) return false;
    if (this.ranges.length !== other.ranges.length) return false;
    for (let i = 0; i < this.ranges.length; i++) {
      if (!this.ranges[i].equals(other.ranges[i])) return false;
    }
    return true;
  }

  somethingSelected(): boolean {
    return this.ranges.some((range) => !range.isEmpty());
  }

  compose(other: OTSelection | null): OTSelection | null {
    return other;
  }

  transform(operation: TextOperation): OTSelection {
    const newRanges = this.ranges.map((range) => range.transform(operation));
    return new OTSelection(newRanges);
  }

  toJSON(): { ranges: { anchor: number; head: number }[] } | null {
    return {
      ranges: this.ranges.map((r) => ({ anchor: r.anchor, head: r.head })),
    };
  }
}

// #############################################################################
// ## Client State Machine Logic (based on ot.js Client)
// #############################################################################

export interface IClientCallbacks {
  sendOperation: (revision: number, operation: TextOperation) => void;
  applyOperation: (operation: TextOperation) => void;
  sendSelection?: (selection: OTSelection | null) => void;
  getSelection?: () => OTSelection | null;
  setSelection?: (selection: OTSelection | null) => void;
}

interface IClientState {
  applyClient(_client: Client, operation: TextOperation): IClientState;
  applyServer(client: Client, operation: TextOperation): IClientState;
  serverAck(_client: Client): IClientState;
  transformSelection(selection: OTSelection): OTSelection;
  resend?(client: Client): void;
}

class Synchronized implements IClientState {
  applyClient(_client: Client, operation: TextOperation): IClientState {
    _client.callbacks.sendOperation(_client.revision, operation);
    return new AwaitingConfirm(operation);
  }
  applyServer(client: Client, operation: TextOperation): IClientState {
    client.callbacks.applyOperation(operation);
    return this;
  }
  serverAck(_client: Client): IClientState {
    return this;
  }
  transformSelection(selection: OTSelection): OTSelection {
    return selection;
  }
}
const synchronized_ = new Synchronized();

class AwaitingConfirm implements IClientState {
  outstanding: TextOperation;
  constructor(outstanding: TextOperation) {
    this.outstanding = outstanding;
  }

  applyClient(_client: Client, operation: TextOperation): IClientState {
    // Use a comment to document the purpose rather than using the parameter
    // This is used in other implementations
    return new AwaitingWithBuffer(this.outstanding, operation);
  }
  applyServer(client: Client, operation: TextOperation): IClientState {
    // console.log(`[${client.userId}] AwaitingConfirm -> Applying Server Op & Transforming Outstanding`);
    const [newOutstanding, transformedOperation] = TextOperation.transform(
      this.outstanding,
      operation
    );
    client.callbacks.applyOperation(transformedOperation);
    return new AwaitingConfirm(newOutstanding);
  }
  serverAck(_client: Client): IClientState {
    // Add comment to document purpose
    // This is used in other implementations
    return synchronized_;
  }
  transformSelection(selection: OTSelection): OTSelection {
    return selection.transform(this.outstanding);
  }
  resend(client: Client): void {
    // console.log(`[${client.userId}] AwaitingConfirm -> Resending Outstanding Op (rev ${client.revision})`);
    client.callbacks.sendOperation(client.revision, this.outstanding);
  }
}

class AwaitingWithBuffer implements IClientState {
  outstanding: TextOperation;
  buffer: TextOperation;
  constructor(outstanding: TextOperation, buffer: TextOperation) {
    this.outstanding = outstanding;
    this.buffer = buffer;
  }

  applyClient(_client: Client, operation: TextOperation): IClientState {
    // console.log(`[${client.userId}] AwaitingWithBuffer -> Composing Buffer`);
    // console.log("[AWB ApplyClient] Before Compose:", {
    // buffer_ops: this.buffer.toJSON(),
    // buffer_base: this.buffer.baseLength,
    // buffer_target: this.buffer.targetLength,
    // operation_ops: operation.toJSON(),
    // operation_base: operation.baseLength,
    // operation_target: operation.targetLength,
    // });
    try {
      const newBuffer = this.buffer.compose(operation);
      return new AwaitingWithBuffer(this.outstanding, newBuffer);
    } catch (e) {
      console.error("[AWB ApplyClient] Compose Error:", e, {
        buffer: this.buffer,
        operation: operation,
      });
      throw e; // Rethrow
    }
  }
  applyServer(client: Client, operation: TextOperation): IClientState {
    // console.log(`[AWB ApplyServer] State Before Transform:`, {
    // outstanding_ops: this.outstanding.toJSON(),
    // outstanding_base: this.outstanding.baseLength,
    // outstanding_target: this.outstanding.targetLength,
    // buffer_ops: this.buffer.toJSON(),
    // buffer_base: this.buffer.baseLength,
    // buffer_target: this.buffer.targetLength,
    // server_op_ops: operation.toJSON(),
    // server_op_base: operation.baseLength,
    // server_op_target: operation.targetLength,
    // // Log full objects for deeper inspection
    // outstanding_obj: this.outstanding,
    // buffer_obj: this.buffer,
    // server_op_obj: operation,
    // client_revision: client.revision,
    // });

    // console.log(`[${client.userId}] AwaitingWithBuffer -> Applying Server Op & Transforming Outstanding/Buffer`);
    const [newOutstanding, transformedOperation1] = TextOperation.transform(
      this.outstanding,
      operation
    );
    const [newBuffer, transformedOperation2] = TextOperation.transform(
      this.buffer,
      transformedOperation1
    );
    // console.log(`[AWB ApplyServer] State After Transforms:`, {
    // newOutstanding_ops: newOutstanding.toJSON(),
    // newOutstanding_base: newOutstanding.baseLength,
    // transformedOp1_ops: transformedOperation1.toJSON(),
    // transformedOp1_base: transformedOperation1.baseLength,
    // newBuffer_ops: newBuffer.toJSON(),
    // newBuffer_base: newBuffer.baseLength,
    // transformedOp2_ops: transformedOperation2.toJSON(),
    // transformedOp2_base: transformedOperation2.baseLength,
    // });
    client.callbacks.applyOperation(transformedOperation2);
    return new AwaitingWithBuffer(newOutstanding, newBuffer);
  }
  serverAck(client: Client): IClientState {
    client.callbacks.sendOperation(client.revision, this.buffer);
    return new AwaitingConfirm(this.buffer);
  }
  transformSelection(selection: OTSelection): OTSelection {
    return selection.transform(this.outstanding).transform(this.buffer);
  }
  resend(client: Client): void {
    // console.log(`[${client.userId}] AwaitingWithBuffer -> Resending Outstanding Op (rev ${client.revision})`);
    client.callbacks.sendOperation(client.revision, this.outstanding);
  }
}

export class Client {
  revision: number;
  state: IClientState;
  userId: string;
  callbacks: IClientCallbacks;

  constructor(revision: number, userId: string, callbacks: IClientCallbacks) {
    this.revision = revision;
    this.userId = userId;
    this.callbacks = callbacks;
    this.state = synchronized_;
    // console.log(
    // `[${this.userId}] Client initialized with revision ${revision}`
    // );
  }

  setState(newState: IClientState): void {
    const oldStateName = this.state.constructor.name;
    const newStateName = newState.constructor.name;

    // Add specific logging for AWB -> AWB transitions
    if (
      oldStateName === "AwaitingWithBuffer" &&
      newStateName === "AwaitingWithBuffer"
    ) {
      // Type assertion needed to access state-specific properties
      // const oldOutstandingBase = (this.state as AwaitingWithBuffer).outstanding
      // ?.baseLength;
      // const newOutstandingBase = (newState as AwaitingWithBuffer).outstanding
      //   ?.baseLength;
      // console.log(
      // `[AWB->AWB setState] Updating outstanding. Base length: ${oldOutstandingBase} -> ${newOutstandingBase}`
      // );
    }

    // console.log(
    // `[${this.userId}] State transition: ${oldStateName} -> ${newStateName}`
    // );
    this.state = newState;
  }

  applyClient(operation: TextOperation): void {
    if (operation.isNoop()) return;
    // console.log(`[${this.userId}] applyClient called (State: ${this.state.constructor.name}, rev: ${this.revision})`);
    this.setState(this.state.applyClient(this, operation));
  }

  applyServer(operation: TextOperation): void {
    if (operation.isNoop()) return;
    // console.log(`[${this.userId}] applyServer called (State: ${this.state.constructor.name}, rev: ${this.revision})`);
    this.revision++;
    this.setState(this.state.applyServer(this, operation));
  }

  serverAck(): void {
    // console.log(`[${this.userId}] serverAck called (State: ${this.state.constructor.name}, rev: ${this.revision})`);
    this.revision++;
    this.setState(this.state.serverAck(this));
    if (
      this.state instanceof Synchronized ||
      this.state instanceof AwaitingConfirm
    ) {
      this.sendSelection(
        this.callbacks.getSelection ? this.callbacks.getSelection() : null
      );
    }
  }

  serverReconnect(): void {
    // console.log(
    // `[${this.userId}] serverReconnect called (State: ${this.state.constructor.name}, rev: ${this.revision})`
    // );
    if (typeof this.state.resend === "function") {
      this.state.resend(this);
    }
  }

  transformSelection(selection: OTSelection): OTSelection {
    return this.state.transformSelection(selection);
  }

  selectionChanged(): void {
    this.sendSelection(
      this.callbacks.getSelection ? this.callbacks.getSelection() : null
    );
  }

  blur(): void {
    this.sendSelection(null);
  }

  sendSelection(selection: OTSelection | null): void {
    if (
      this.state instanceof Synchronized ||
      this.state instanceof AwaitingConfirm
    ) {
      if (this.callbacks.sendSelection) {
        // console.log(`[${this.userId}] Sending selection (State: ${this.state.constructor.name}):`, selection?.toJSON());
        this.callbacks.sendSelection(selection);
      } else {
        // console.warn(`[${this.userId}] sendSelection callback not provided.`);
      }
    } else {
      // console.log(`[${this.userId}] Selection change suppressed in AwaitingWithBuffer state.`);
    }
  }
}
