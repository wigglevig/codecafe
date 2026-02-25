import * as monaco from "monaco-editor";
import { editor } from "monaco-editor";
import { CodeEditorProps } from "../types/props";
import { offsetToPosition } from "../ot/TextOperationSystem";

export const editorOptions: editor.IStandaloneEditorConstructionOptions = {
  fontSize: 14, // Default font size
  wordWrap: "off", // Default word wrap
  lineNumbers: "on", // Default line numbers
  glyphMargin: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  readOnly: false,
  automaticLayout: true,
  scrollbar: {
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
  },
  tabSize: 2,
  insertSpaces: true,
  detectIndentation: false,
  renderLineHighlight: "none",
  quickSuggestions: { other: false, comments: false, strings: false },
  parameterHints: { enabled: false },
  codeLens: false,
  hover: { enabled: true, delay: 300 },
  find: {
    addExtraSpaceOnTop: false,
  },
};

// Decoration Helper Functions
type UserType = CodeEditorProps["users"] extends (infer U)[] | undefined
  ? U
  : never;

export const createCursorDecoration = (
  user: UserType,
  model: monaco.editor.ITextModel
): monaco.editor.IModelDeltaDecoration | null => {
  let position: monaco.IPosition | null = null;

  if (user.cursorPosition) {
    position = user.cursorPosition;
  } else if (
    user.selection &&
    user.selection.ranges &&
    user.selection.ranges.length > 0
  ) {
    const primaryRange = user.selection.ranges[0];
    if (primaryRange) {
      try {
        position = offsetToPosition(model, primaryRange.head);
      } catch (error) {
        console.error(
          "[createCursorDecoration] Error inferring cursor from selection:",
          error
        );
      }
    }
  }

  if (!position) {
    // console.log(
    // `[createCursorDecoration] User ${user.id} - No cursor position found or inferrable.`
    // );
    return null;
  }

  // console.log(
  // `[createCursorDecoration] User ${user.id} - Rendering cursor decoration for position:`,
  // position
  // );

  const cursorPosRange = new monaco.Range(
    position.lineNumber,
    position.column,
    position.lineNumber,
    position.column
  );

  return {
    range: cursorPosRange,
    options: {
      className: `user-${user.id}-cursor`,
      beforeContentClassName: "cursor-label",
      before: {
        content: user.name,
        inlineClassName: `user-${user.id}-label`,
      },
    },
  };
};

export const createSelectionDecoration = (
  user: UserType,
  model: monaco.editor.ITextModel
): monaco.editor.IModelDeltaDecoration | null => {
  if (
    !user.selection ||
    !user.selection.ranges ||
    user.selection.ranges.length === 0
  ) {
    return null;
  }

  const primaryRange = user.selection.ranges[0];
  if (!primaryRange) {
    return null;
  }

  // console.log(
  // `[createSelectionDecoration] User ${user.id} - Checking selection:`,
  // primaryRange
  // );

  try {
    const anchorPos = offsetToPosition(model, primaryRange.anchor);
    const headPos = offsetToPosition(model, primaryRange.head);

    // Only create decoration if selection is non-empty
    if (
      anchorPos.lineNumber === headPos.lineNumber &&
      anchorPos.column === headPos.column
    ) {
      return null;
    }

    // console.log(
    // `[createSelectionDecoration] User ${user.id} - Creating selection decoration for non-empty range`
    // );

    const monacoRange = new monaco.Range(
      anchorPos.lineNumber,
      anchorPos.column,
      headPos.lineNumber,
      headPos.column
    );

    return {
      range: monacoRange,
      options: {
        className: `user-${user.id}-selection`,
        hoverMessage: { value: `Selected by ${user.name}` },
      },
    };
  } catch (error) {
    console.error(
      "[createSelectionDecoration] Error converting selection offsets:",
      error,
      primaryRange
    );
    return null;
  }
};
