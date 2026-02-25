import {
  TextOperation,
  Client,
  OTSelection,
  MonacoAdapter,
  IClientCallbacks,
} from "../../ot/TextOperationSystem";
import { MockEditor } from "../mocks/monaco-editor.mock";
import "@testing-library/jest-dom";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

describe("TextOperation", () => {
  describe("Basic Operations", () => {
    test("should create a valid empty operation", () => {
      const op = new TextOperation();
      expect(op.ops).toEqual([]);
      expect(op.baseLength).toBe(0);
      expect(op.targetLength).toBe(0);
      expect(op.isNoop()).toBe(true);
    });

    test("should handle retain operations", () => {
      const op = new TextOperation().retain(5);
      expect(op.ops).toEqual([5]);
      expect(op.baseLength).toBe(5);
      expect(op.targetLength).toBe(5);
    });

    test("should handle insert operations", () => {
      const op = new TextOperation().insert("hello");
      expect(op.ops).toEqual(["hello"]);
      expect(op.baseLength).toBe(0);
      expect(op.targetLength).toBe(5);
    });

    test("should handle delete operations", () => {
      const op = new TextOperation().delete(5);
      expect(op.ops).toEqual([-5]);
      expect(op.baseLength).toBe(5);
      expect(op.targetLength).toBe(0);
    });

    test("should combine consecutive retains", () => {
      const op = new TextOperation().retain(2).retain(3);
      expect(op.ops).toEqual([5]);
      expect(op.baseLength).toBe(5);
      expect(op.targetLength).toBe(5);
    });

    test("should combine consecutive inserts", () => {
      const op = new TextOperation().insert("hello").insert(" world");
      expect(op.ops).toEqual(["hello world"]);
      expect(op.baseLength).toBe(0);
      expect(op.targetLength).toBe(11);
    });

    test("should combine consecutive deletes", () => {
      const op = new TextOperation().delete(2).delete(3);
      expect(op.ops).toEqual([-5]);
      expect(op.baseLength).toBe(5);
      expect(op.targetLength).toBe(0);
    });
  });

  describe("Apply Operation", () => {
    test("should apply insert operations", () => {
      const op = new TextOperation().insert("hello");
      expect(op.apply("")).toBe("hello");
    });

    test("should apply retain and insert operations", () => {
      const op = new TextOperation().retain(5).insert(" world");
      expect(op.apply("hello")).toBe("hello world");
    });

    test("should apply delete operations", () => {
      const op = new TextOperation().retain(5).delete(6);
      expect(op.apply("hello world")).toBe("hello");
    });

    test("should apply complex operations", () => {
      const op = new TextOperation().retain(5).delete(1).insert("!").retain(5);
      expect(op.apply("hello world")).toBe("hello!world");
    });

    test("should throw error if baseLength doesn't match string length", () => {
      const op = new TextOperation().retain(10);
      expect(() => op.apply("short")).toThrow();
    });
  });

  describe("Invert Operation", () => {
    test("should invert insert operations", () => {
      const op = new TextOperation().insert("hello");
      const inverse = op.invert("");
      expect(inverse.ops).toEqual([-5]);
      expect(inverse.apply("hello")).toBe("");
    });

    test("should invert delete operations", () => {
      const op = new TextOperation().delete("hello");
      const inverse = op.invert("hello");
      expect(inverse.ops).toEqual(["hello"]);
      expect(inverse.apply("")).toBe("hello");
    });

    test("should invert complex operations", () => {
      const original = "hello world";
      const op = new TextOperation().retain(5).delete(1).insert("!").retain(5);
      const modified = op.apply(original);
      const inverse = op.invert(original);
      expect(inverse.apply(modified)).toBe(original);
    });
  });

  describe("Compose Operations", () => {
    test("should compose two insert operations", () => {
      const op1 = new TextOperation().insert("hello");
      const op2 = new TextOperation().retain(5).insert(" world");
      const composed = op1.compose(op2);
      expect(composed.ops).toEqual(["hello world"]);
      expect(composed.apply("")).toBe("hello world");
    });

    test("should compose two delete operations", () => {
      const op1 = new TextOperation().retain(5).delete(1);
      const op2 = new TextOperation().retain(4).delete(1);
      const composed = op1.compose(op2);
      expect(composed.ops).toEqual([4, -2]);
      expect(composed.apply("hello!")).toBe("hell");
    });

    test("should compose insert and delete operations", () => {
      // Simple test with exact lengths
      const op1 = new TextOperation().insert("abc");
      const op2 = new TextOperation().retain(3).delete(2);

      expect(op1.baseLength).toBe(0);
      expect(op1.targetLength).toBe(3);
      expect(op2.baseLength).toBe(5); // Must be 3 + 2

      // This should fail
      try {
        op1.compose(op2);
        expect("This should have thrown an error").toBe("But it didn't");
      } catch (error) {
        expect(String(error)).toMatch(/base length/);
      }

      // Create a valid composition
      const op3 = new TextOperation().insert("abc");
      const op4 = new TextOperation().retain(3).insert("def");
      const composed = op3.compose(op4);

      expect(composed.baseLength).toBe(0);
      expect(composed.targetLength).toBe(6); // abc + def
      expect(composed.ops).toEqual(["abcdef"]);
    });

    test("should compose operations that cancel out", () => {
      const op1 = new TextOperation().retain(5).insert("temp");
      const op2 = new TextOperation().retain(5).delete(4);
      const composed = op1.compose(op2);
      expect(composed.ops).toEqual([5]);
      expect(composed.apply("hello")).toBe("hello");
    });

    test("should throw when composing operations with mismatched lengths", () => {
      const op1 = new TextOperation().retain(5);
      const op2 = new TextOperation().retain(10);
      expect(() => op1.compose(op2)).toThrow();
    });
  });

  describe("Transform Operations", () => {
    test("should transform two insert operations at same position", () => {
      const op1 = new TextOperation().retain(5).insert("A");
      const op2 = new TextOperation().retain(5).insert("B");

      const [op1prime, op2prime] = TextOperation.transform(op1, op2);

      const s = "hello world";
      const s1 = op1.apply(s);
      const s2 = op2.apply(s);

      expect(op2prime.apply(s1)).toBe(op1prime.apply(s2));
    });

    test("should transform insert and delete at different positions", () => {
      const op1 = new TextOperation().retain(3).insert("XXX").retain(5);
      const op2 = new TextOperation().retain(7).delete(1);

      const [op1prime, op2prime] = TextOperation.transform(op1, op2);

      const s = "abcdefgh";
      const s1 = op1.apply(s);
      const s2 = op2.apply(s);

      expect(op2prime.apply(s1)).toBe(op1prime.apply(s2));
    });

    test("should transform two delete operations with partial overlap", () => {
      const s = "abcdefghijk";

      const op1 = new TextOperation().retain(3).delete(3).retain(5);
      const op2 = new TextOperation().retain(5).delete(3).retain(3);

      const [op1prime, op2prime] = TextOperation.transform(op1, op2);

      const s1 = op1.apply(s);
      const s2 = op2.apply(s);

      expect(op2prime.apply(s1)).toBe(op1prime.apply(s2));
    });

    test("should handle complex transformation scenarios", () => {
      const s = "abcdefghij";

      const op1 = new TextOperation()
        .retain(3)
        .delete(2)
        .insert("XYZ")
        .retain(5);
      const op2 = new TextOperation().retain(7).insert("ABC").retain(3);

      const [op1prime, op2prime] = TextOperation.transform(op1, op2);

      const s1 = op1.apply(s);
      const s2 = op2.apply(s);

      expect(op2prime.apply(s1)).toBe(op1prime.apply(s2));
    });
  });
});

describe("OTSelection", () => {
  test("should create cursor selection", () => {
    const selection = OTSelection.createCursor(5);
    expect(selection.ranges.length).toBe(1);
    expect(selection.ranges[0].anchor).toBe(5);
    expect(selection.ranges[0].head).toBe(5);
  });

  test("should detect if something is selected", () => {
    const cursor = OTSelection.createCursor(5);
    expect(cursor.somethingSelected()).toBe(false);

    const range = new OTSelection([new OTSelection.SelectionRange(5, 10)]);
    expect(range.somethingSelected()).toBe(true);
  });

  test("should transform selection when text is inserted before", () => {
    const selection = new OTSelection([new OTSelection.SelectionRange(5, 10)]);

    const op = new TextOperation().insert("abc");
    const transformed = selection.transform(op);

    expect(transformed.ranges[0].anchor).toBe(8);
    expect(transformed.ranges[0].head).toBe(13);
  });

  test("should transform selection when text is deleted before", () => {
    const selection = new OTSelection([new OTSelection.SelectionRange(10, 15)]);

    const op = new TextOperation().delete(5);
    const transformed = selection.transform(op);

    expect(transformed.ranges[0].anchor).toBe(5);
    expect(transformed.ranges[0].head).toBe(10);
  });

  test("should serialize to JSON and back", () => {
    const selection = new OTSelection([
      new OTSelection.SelectionRange(5, 10),
      new OTSelection.SelectionRange(15, 20),
    ]);

    const json = selection.toJSON();
    const restored = OTSelection.fromJSON(json);

    expect(restored.equals(selection)).toBe(true);
  });
});

class EnhancedMockEditor extends MockEditor {
  onDidFocusEditorText(_callback: () => void) {
    return { dispose: () => {} };
  }

  onDidBlurEditorText(_callback: () => void) {
    return { dispose: () => {} };
  }
}

describe("MonacoAdapter", () => {
  let editor: EnhancedMockEditor;
  let adapter: MonacoAdapter;

  beforeEach(() => {
    editor = new EnhancedMockEditor("hello world");
    adapter = new MonacoAdapter(
      editor as unknown as import("monaco-editor").editor.IStandaloneCodeEditor
    );
  });

  test("should register callbacks", () => {
    const callbacks = {
      change: jest.fn(),
      selectionChange: jest.fn(),
      blur: jest.fn(),
      focus: jest.fn(),
    } as MonacoAdapterEvents;

    adapter.registerCallbacks(callbacks);
    expect(adapter["callbacks"]).toEqual(callbacks);
  });

  test("should trigger callbacks", () => {
    const mockOperation = new TextOperation().insert("testOp");
    const mockInverse = new TextOperation().delete("testOp");
    const changeCallback = jest.fn();

    adapter.registerCallbacks({ change: changeCallback });

    adapter.trigger("change", mockOperation, mockInverse);
    expect(changeCallback).toHaveBeenCalledWith(mockOperation, mockInverse);
  });

  test("should convert Monaco changes to operations", () => {
    const changes = [
      {
        range: {
          startLineNumber: 1,
          startColumn: 6,
          endLineNumber: 1,
          endColumn: 6,
        },
        rangeOffset: 5,
        rangeLength: 0,
        text: " awesome",
      },
    ];

    const [operation, inverse] = MonacoAdapter.operationFromMonacoChanges(
      changes,
      "hello world"
    );

    expect(operation.ops.length).toBeGreaterThan(0);
    expect(inverse.ops.length).toBeGreaterThan(0);
  });
});

interface MonacoAdapterEvents {
  change?: (operation: TextOperation, inverse: TextOperation) => void;
  selectionChange?: () => void;
  blur?: () => void;
  focus?: () => void;
}

describe("Client", () => {
  let mockCallbacks: IClientCallbacks;
  let client: Client;

  beforeEach(() => {
    mockCallbacks = {
      sendOperation: jest.fn(),
      applyOperation: jest.fn(),
      sendSelection: jest.fn(),
      getSelection: jest.fn(() => null),
      setSelection: jest.fn(),
    };

    client = new Client(0, "user1", mockCallbacks);
  });

  test("should initialize in synchronized state", () => {
    expect(client["state"].constructor.name).toBe("Synchronized");
  });

  test("should apply client operation and send to server", () => {
    const op = new TextOperation().insert("hello");

    client.applyClient(op);

    expect(mockCallbacks.sendOperation).toHaveBeenCalledWith(0, op);
    expect(client["state"].constructor.name).toBe("AwaitingConfirm");
  });

  test("should apply server operation", () => {
    const op = new TextOperation().insert("hello");

    client.applyServer(op);

    expect(mockCallbacks.applyOperation).toHaveBeenCalledWith(op);
    expect(client.revision).toBe(1);
  });

  test("should handle server acknowledgment", () => {
    const op = new TextOperation().insert("hello");
    client.applyClient(op);

    client.serverAck();

    expect(client.revision).toBe(1);
    expect(client["state"].constructor.name).toBe("Synchronized");
  });

  test("should buffer operations while awaiting confirmation", () => {
    // First operation
    const op1 = new TextOperation().insert("hello");
    client.applyClient(op1);

    // Second operation before ack
    const op2 = new TextOperation().retain(5).insert(" world");
    client.applyClient(op2);

    expect(client["state"].constructor.name).toBe("AwaitingWithBuffer");

    // Server acks first operation
    client.serverAck();

    expect(client["state"].constructor.name).toBe("AwaitingConfirm");
    expect(mockCallbacks.sendOperation).toHaveBeenCalledTimes(2);
  });
});
