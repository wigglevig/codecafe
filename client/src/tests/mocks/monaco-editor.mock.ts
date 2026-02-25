/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  editor,
  Position,
  Range,
  Selection as MonacoSelection,
  ISelection as MonacoISelection,
  Uri,
} from "monaco-editor";
import * as monaco from "monaco-editor"; // Keep this for other types if needed

export class Selection {
  constructor(
    public startLineNumber: number,
    public startColumn: number,
    public endLineNumber: number,
    public endColumn: number
  ) {}

  public getPosition(): monaco.Position {
    return new monaco.Position(this.startLineNumber, this.startColumn);
  }

  isEmpty(): boolean {
    return (
      this.startLineNumber === this.endLineNumber &&
      this.startColumn === this.endColumn
    );
  }

  equals(other: Selection | monaco.Selection): boolean {
    return (
      this.startLineNumber === other.startLineNumber &&
      this.startColumn === other.startColumn &&
      this.endLineNumber === other.endLineNumber &&
      this.endColumn === other.endColumn
    );
  }

  getDirection(): monaco.SelectionDirection {
    return monaco.SelectionDirection.LTR;
  }

  getEndPosition(): monaco.Position {
    return new monaco.Position(this.endLineNumber, this.endColumn);
  }

  getSelectionStart(): monaco.Position {
    return new monaco.Position(this.startLineNumber, this.startColumn);
  }

  getStartPosition(): monaco.Position {
    return new monaco.Position(this.startLineNumber, this.startColumn);
  }
}

export interface IRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export class MockTextModel {
  private value: string;
  private listeners: ((e: editor.IModelContentChangedEvent) => void)[] = [];

  constructor(initialValue: string = "") {
    this.value = initialValue;
  }

  onDidChangeContent(listener: (e: editor.IModelContentChangedEvent) => void): {
    dispose: () => void;
  } {
    this.listeners.push(listener);
    return {
      dispose: () => {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
          this.listeners.splice(index, 1);
        }
      },
    };
  }

  getValueLength(): number {
    return this.value.length;
  }

  getValue(): string {
    return this.value;
  }

  setValue(newValue: string): void {
    const oldValue = this.value;
    this.value = newValue;
    this.triggerContentChange({
      changes: [
        {
          range: this.createFullModelRange(),
          rangeLength: oldValue.length,
          text: newValue,
          rangeOffset: 0,
        },
      ],
      eol: "\n",
      versionId: 1,
      isUndoing: false,
      isRedoing: false,
      isFlush: false,
      isEolChange: false,
    });
  }

  getPositionAt(offset: number): monaco.Position {
    if (offset <= 0) {
      return new monaco.Position(1, 1);
    }
    const textBefore = this.value.substring(0, offset);
    const lines = textBefore.split("\n");
    const lineNumber = lines.length;
    const column = lines[lines.length - 1].length + 1;
    return new monaco.Position(lineNumber, column);
  }

  getOffsetAt(position: monaco.IPosition): number {
    const lines = this.value.split("\n");
    let offset = 0;
    for (let i = 0; i < position.lineNumber - 1; i++) {
      offset += lines[i].length + 1;
    }
    offset += position.column - 1;
    return Math.min(offset, this.value.length);
  }

  getLastPosition(): monaco.Position {
    const lines = this.value.split("\n");
    const lineNumber = lines.length;
    const column = lines[lines.length - 1].length + 1;
    return new monaco.Position(lineNumber, column);
  }

  createFullModelRange(): IRange {
    const lastPos = this.getLastPosition();
    return {
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: lastPos.lineNumber,
      endColumn: lastPos.column,
    };
  }

  applyEdits(edits: editor.IIdentifiedSingleEditOperation[]): void {
    let newText = this.value;
    const sortedEdits = [...edits].sort((a, b) => {
      const rangeA = a.range;
      const rangeB = b.range;
      if (rangeA.startLineNumber !== rangeB.startLineNumber) {
        return rangeB.startLineNumber - rangeA.startLineNumber;
      }
      return rangeB.startColumn - rangeA.startColumn;
    });

    for (const edit of sortedEdits) {
      const startOffset = this.getOffsetAt({
        lineNumber: edit.range.startLineNumber,
        column: edit.range.startColumn,
      });
      const endOffset = this.getOffsetAt({
        lineNumber: edit.range.endLineNumber,
        column: edit.range.endColumn,
      });

      newText =
        newText.substring(0, startOffset) +
        (edit.text || "") +
        newText.substring(endOffset);
    }

    if (newText !== this.value) {
      this.value = newText;
      this.triggerContentChange({
        changes: edits.map((edit) => ({
          range: edit.range,
          rangeLength:
            this.getOffsetAt({
              lineNumber: edit.range.endLineNumber,
              column: edit.range.endColumn,
            }) -
            this.getOffsetAt({
              lineNumber: edit.range.startLineNumber,
              column: edit.range.startColumn,
            }),
          text: edit.text || "",
          rangeOffset: this.getOffsetAt({
            lineNumber: edit.range.startLineNumber,
            column: edit.range.startColumn,
          }),
        })),
        eol: "\n",
        versionId: 1,
        isUndoing: false,
        isRedoing: false,
        isFlush: false,
        isEolChange: false,
      });
    }
  }

  private triggerContentChange(event: editor.IModelContentChangedEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  getLineCount(): number {
    return this.value.split("\n").length;
  }

  getLineContent(lineNumber: number): string {
    return this.value.split("\n")[lineNumber - 1] || "";
  }

  getLinesContent(): string[] {
    return this.value.split("\n");
  }
  getVersionId(): number {
    return 1;
  }
  getAlternativeVersionId(): number {
    return 1;
  }
  dispose(): void {}
  getFullModelRange(): monaco.Range {
    const lastPos = this.getLastPosition();
    return new monaco.Range(1, 1, lastPos.lineNumber, lastPos.column);
  }
  getWordAtPosition(
    position: monaco.IPosition
  ): monaco.editor.IWordAtPosition | null {
    return null;
  }
  getWordUntilPosition(
    position: monaco.IPosition
  ): monaco.editor.IWordAtPosition {
    return {
      word: "",
      startColumn: position.column,
      endColumn: position.column,
    };
  }
  findMatches(
    searchString: string,
    searchScope: any,
    isRegex: boolean,
    matchCase: boolean,
    wordSeparators: string | null,
    captureMatches: boolean,
    limitResultCount?: number
  ): monaco.editor.FindMatch[] {
    return [];
  }
  findNextMatch(
    searchString: string,
    searchStart: monaco.IPosition,
    isRegex: boolean,
    matchCase: boolean,
    wordSeparators: string | null,
    captureMatches: boolean
  ): monaco.editor.FindMatch | null {
    return null;
  }
  findPreviousMatch(
    searchString: string,
    searchStart: monaco.IPosition,
    isRegex: boolean,
    matchCase: boolean,
    wordSeparators: string | null,
    captureMatches: boolean
  ): monaco.editor.FindMatch | null {
    return null;
  }
  getLineLength(lineNumber: number): number {
    const lines = this.value.split("\n");
    return lines[lineNumber - 1]?.length || 0;
  }
  getLineMaxColumn(lineNumber: number): number {
    return this.getLineLength(lineNumber) + 1;
  }
  validatePosition(position: monaco.IPosition): monaco.Position {
    return new monaco.Position(position.lineNumber, position.column);
  }
  normalizeIndentation(str: string): string {
    return str;
  }
  pushStackElement(): void {}
  pushEditOperations(
    beforeCursorState: monaco.Selection[] | null,
    editOperations: monaco.editor.IIdentifiedSingleEditOperation[],
    cursorStateComputer: monaco.editor.ICursorStateComputer | null
  ): monaco.Selection[] | null {
    return null;
  }
}

export class MockEditor {
  private decorations: string[] = [];
  private selections: Selection[] = [new Selection(1, 1, 1, 1)];
  public model: MockTextModel = new MockTextModel("");
  private cursorStateListeners: ((
    e: editor.ICursorPositionChangedEvent
  ) => void)[] = [];
  private listeners: { [key: string]: unknown[] } = {
    onDidChangeCursorPosition: [],
    onDidChangeModelContent: [],
    onDidFocusEditorText: [],
    onDidBlurEditorText: [],
  };

  constructor(initialContent: string = "") {
    this.model = new MockTextModel(initialContent);
  }

  getModel(): MockTextModel {
    return this.model;
  }

  getPosition(): monaco.Position | null {
    const sel = this.getSelection();
    return sel ? sel.getPosition() : new monaco.Position(1, 1);
  }

  getSelection(): Selection | null {
    return this.selections[0] || null;
  }

  getSelections(): Selection[] {
    return this.selections;
  }

  setSelections(selections: monaco.ISelection[]): void {
    this.selections = selections.map(
      (s) =>
        new Selection(
          s.selectionStartLineNumber,
          s.selectionStartColumn,
          s.positionLineNumber,
          s.positionColumn
        )
    );
    this.notifyCursorPositionChanged();
  }

  setSelection(selection: monaco.ISelection): void {
    this.setSelections([selection]);
  }

  saveViewState(): editor.ICodeEditorViewState | null {
    return null;
  }

  restoreViewState(state: editor.ICodeEditorViewState | null): void {
    if (state && state.cursorState) {
      this.selections = state.cursorState.map(
        (cs) =>
          new Selection(
            cs.selectionStart.lineNumber,
            cs.selectionStart.column,
            cs.position.lineNumber,
            cs.position.column
          )
      );
    }
  }

  onDidChangeCursorPosition(
    listener: (e: editor.ICursorPositionChangedEvent) => void
  ): { dispose: () => void } {
    const key = "onDidChangeCursorPosition";
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    (
      this.listeners[key] as Array<
        (e: editor.ICursorPositionChangedEvent) => void
      >
    ).push(listener);
    return {
      dispose: () => {
        if (this.listeners[key]) {
          this.listeners[key] = (
            this.listeners[key] as Array<
              (e: editor.ICursorPositionChangedEvent) => void
            >
          ).filter((l) => l !== listener);
        }
      },
    };
  }

  private notifyCursorPositionChanged(): void {
    const key = "onDidChangeCursorPosition";
    if (this.listeners[key]) {
      const selection = this.getSelection();
      const currentPosition = selection
        ? selection.getPosition()
        : new monaco.Position(1, 1);
      const eventArg: editor.ICursorPositionChangedEvent = {
        position: currentPosition,
        reason: monaco.editor.CursorChangeReason.Explicit,
        secondaryPositions: [],
        source: "mock",
      };
      (
        this.listeners[key] as Array<
          (e: editor.ICursorPositionChangedEvent) => void
        >
      ).forEach((listener) => listener(eventArg));
    }
  }

  pushEditOperations(
    _selection: monaco.Selection[] | null,
    editOperations: monaco.editor.IIdentifiedSingleEditOperation[],
    _beforeCursorState:
      | ((ids: string[] | null) => monaco.Selection[] | null)
      | null
  ): null {
    this.model.applyEdits(editOperations);
    return null;
  }

  getValue(): string {
    return this.model.getValue();
  }

  setValue(content: string): void {
    this.model.setValue(content);
  }

  layout(): void {}
  focus(): void {}
  getEditorType(): string {
    return "mock";
  }
  dispose(): void {
    Object.keys(this.listeners).forEach((key) => (this.listeners[key] = []));
    this.cursorStateListeners = [];
  }
  onDidChangeModelContent(
    listener: (e: editor.IModelContentChangedEvent) => void
  ): { dispose: () => void } {
    const key = "onDidChangeModelContent";
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    (
      this.listeners[key] as Array<
        (e: editor.IModelContentChangedEvent) => void
      >
    ).push(listener);
    return {
      dispose: () => {
        if (this.listeners[key]) {
          this.listeners[key] = (
            this.listeners[key] as Array<
              (e: editor.IModelContentChangedEvent) => void
            >
          ).filter((l) => l !== listener);
        }
      },
    };
  }
  updateOptions(newOptions: editor.IEditorOptions): void {}
  getOptions(): editor.IComputedEditorOptions {
    return {
      get: <T extends editor.EditorOption>(
        _id: T
      ): editor.FindComputedEditorOptionValueById<T> => {
        // This is a simplified mock. Real implementation would look up default values.
        // For example: if (_id === editor.EditorOption.tabSize) return 4 as any;
        return undefined as editor.FindComputedEditorOptionValueById<T>;
      },
    } as editor.IComputedEditorOptions; // Cast to satisfy the interface
  }
  getConfiguration(): editor.IEditorOptions {
    return { lineNumbers: "on" } as editor.IEditorOptions; // Minimal mock
  }
  getContentHeight(): number {
    return 0;
  }
  getScrollHeight(): number {
    return 0;
  }
  getScrollWidth(): number {
    return 0;
  }
  getScrollLeft(): number {
    return 0;
  }
  getScrollTop(): number {
    return 0;
  }
  setScrollLeft(newScrollLeft: number): void {}
  setScrollTop(newScrollTop: number): void {}
  setScrollPosition(position: Partial<editor.INewScrollPosition>): void {}
  getAction(actionId: string): editor.IEditorAction | null {
    return null;
  }
  executeCommand(
    source: string | null | undefined,
    command: editor.ICommand
  ): void {}
  executeEdits(
    source: string | null | undefined,
    edits: editor.IIdentifiedSingleEditOperation[],
    endCursorState?:
      | monaco.Selection[]
      | ((
          inverseEditOperations: editor.IValidEditOperation[]
        ) => monaco.Selection[] | null)
  ): boolean {
    return true;
  }
  trigger(
    source: string | null | undefined,
    handlerId: string,
    payload: any
  ): void {}
  getContainerDomNode(): HTMLElement {
    return document.createElement("div");
  }
  getDomNode(): HTMLElement | null {
    return document.createElement("div");
  }
  addAction(descriptor: editor.IActionDescriptor): monaco.IDisposable {
    return { dispose: () => {} };
  }
  createContextKey<
    T extends monaco.editor.ContextKeyValue = monaco.editor.ContextKeyValue
  >(key: string, defaultValue: T | undefined): monaco.editor.IContextKey<T> {
    return {
      get: () => defaultValue,
      set: () => {},
      reset: () => {},
    } as monaco.editor.IContextKey<T>;
  }
  addCommand(
    commandId: string,
    handler: (...args: any[]) => void,
    keybindings?: number | number[]
  ): monaco.IDisposable | null {
    return { dispose: () => {} };
  } // keybindings can be number[]
  addEditorAction(action: editor.IEditorAction): monaco.IDisposable {
    return { dispose: () => {} };
  }
  hasTextFocus(): boolean {
    return true;
  }
  hasWidgetFocus(): boolean {
    return false;
  }
  getId(): string {
    return "mockEditor";
  }
  revealLine(lineNumber: number, scrollType?: editor.ScrollType): void {}
  revealLineInCenter(
    lineNumber: number,
    scrollType?: editor.ScrollType
  ): void {}
  revealLineInCenterIfOutsideViewport(
    lineNumber: number,
    scrollType?: editor.ScrollType
  ): void {}
  revealLineNearTop(lineNumber: number, scrollType?: editor.ScrollType): void {}
  revealPosition(
    position: monaco.IPosition,
    scrollType?: editor.ScrollType
  ): void {}
  revealPositionInCenter(
    position: monaco.IPosition,
    scrollType?: editor.ScrollType
  ): void {}
  revealPositionInCenterIfOutsideViewport(
    position: monaco.IPosition,
    scrollType?: editor.ScrollType
  ): void {}
  revealPositionNearTop(
    position: monaco.IPosition,
    scrollType?: editor.ScrollType
  ): void {}
  getVisibleRanges(): monaco.Range[] {
    return [];
  }
  hasPendingActions(): boolean {
    return false;
  }
  getScrolledVisiblePosition(
    position: monaco.IPosition
  ): { top: number; left: number; height: number } | null {
    return null;
  }
  applyFontInfo(target: HTMLElement): void {}

  onDidFocusEditorText(listener: () => void): monaco.IDisposable {
    const key = "onDidFocusEditorText";
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    (this.listeners[key] as Array<() => void>).push(listener);
    return {
      dispose: () => {
        if (this.listeners[key]) {
          this.listeners[key] = (
            this.listeners[key] as Array<() => void>
          ).filter((l) => l !== listener);
        }
      },
    };
  }

  onDidBlurEditorText(listener: () => void): monaco.IDisposable {
    const key = "onDidBlurEditorText";
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    (this.listeners[key] as Array<() => void>).push(listener);
    return {
      dispose: () => {
        if (this.listeners[key]) {
          this.listeners[key] = (
            this.listeners[key] as Array<() => void>
          ).filter((l) => l !== listener);
        }
      },
    };
  }
}

export const editorMock = {
  IModelContentChangedEvent: {},
  ITextModel: {},
  IStandaloneCodeEditor: {},
  ICursorState: {},
  IIdentifiedSingleEditOperation: {},
};

export default {
  editor: editorMock,
  Selection,
  IRange: {},
};
