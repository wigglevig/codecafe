import { User } from "./user";
// import { CursorData } from "./cursorData";
import * as monaco from "monaco-editor";
import { editor } from "monaco-editor";
import { OTSelection, TextOperation } from "../ot/TextOperationSystem";

export interface ShareProfileProps {
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  users: User[];
  onStartSession: () => void;
  isSessionActive: boolean;
  sessionId: string | null;
  isJoiningSession: boolean;
  sessionCreatorName: string;
  onJoinSession: () => void;
  isSessionCreator: boolean;
  currentUserName: string;
  currentUserColor: string;
}

export interface SettingsWindowProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
  availableLanguages: Array<{ value: string; label: string }>;
  currentTheme: "codeCafeTheme" | "transparentTheme";
  onThemeChange: (theme: "codeCafeTheme" | "transparentTheme") => void;
  currentFontSize: string;
  onFontSizeChange: (fontSize: string) => void;
  currentWordWrap: boolean;
  onWordWrapChange: (wordWrap: boolean) => void;
  currentShowLineNumbers: boolean;
  onShowLineNumbersChange: (showLineNumbers: boolean) => void;
}

export interface UserInfo {
  id: string;
  name: string;
  color: string;
  cursorPosition: { lineNumber: number; column: number } | null;
  selection: OTSelection | null;
}

// Changed to a type alias to avoid no-empty-object-type error
export type RemoteUser = UserInfo;

// Define the props for the CodeEditor component
export interface CodeEditorProps {
  code?: string;
  language?: string;
  theme?: string;
  fontSize?: number;
  wordWrap?: boolean;
  showLineNumbers?: boolean;
  onCodeChange: (
    value: string,
    changes: monaco.editor.IModelContentChange[]
  ) => void;
  onCursorPositionChange?: (lineNumber: number) => void;
  sendSelectionData?: (data: {
    cursorPosition: { lineNumber: number; column: number } | null;
    selection: OTSelection | null;
  }) => void;
  users?: RemoteUser[];
  onEditorDidMount?: (editor: editor.IStandaloneCodeEditor) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  localUserId?: string;
  isSessionActive?: boolean;
}

// Props for WebViewPanel component
export interface WebViewPanelProps {
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  onClose?: () => void;
}

// Props for TerminalComponent component
export interface TerminalComponentProps {
  height: number;
}

// Props for JoinSessionPanel component
export interface JoinSessionPanelProps {
  userName: string;
  userColor: string;
  isColorPickerOpen: boolean;
  colors: string[];
  onNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onColorSelect: (color: string) => void;
  onToggleColorPicker: () => void;
  onConfirmJoin: () => void;
}

// Props for Header component
export interface HeaderProps {
  isViewMenuOpen: boolean;
  setIsViewMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleWebView: () => void;
  toggleTerminalVisibility: () => void;
  isWebViewVisible: boolean;
  isTerminalCollapsed: boolean;
  handleRunCode: () => void;
  isShareMenuOpen: boolean;
  toggleShareMenu: () => void;
  shareMenuView: "initial" | "link";
  userName: string;
  userColor: string;
  handleNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleColorSelect: (color: string) => void;
  isColorPickerOpen: boolean;
  handleToggleColorPicker: () => void;
  handleStartSession: () => Promise<void>;
  generatedShareLink: string | null;
  handleCopyShareLink: () => void;
  isSessionActive: boolean;
  uniqueRemoteParticipants: RemoteUser[];
  setIsColorPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// Status Bar Component Types
export type ConnectionStatus = "connected" | "disconnected" | "connecting";

export interface StatusBarProps {
  connectionStatus?: ConnectionStatus;
  language?: string;
  line?: number;
  column?: number;
}

// Chat Message Type
export interface ChatMessageType {
  sessionId: string;
  userId: string;
  userName: string;
  userColor: string;
  message: string;
  timestamp: string;
  formattedTimestamp?: string;
}

// Props for useCollaborationSession hook
export interface UseCollaborationSessionProps {
  sessionId: string | null;
  userId: string;
  userInfo: Pick<UserInfo, "name" | "color">;
  activeFileId: string | null;
  editorInstance: editor.IStandaloneCodeEditor | null;
  isSessionActive: boolean;
  onStateReceived: (
    fileId: string,
    content: string,
    revision: number,
    participants: RemoteUser[]
  ) => void;
  onOperationReceived: (fileId: string, operation: TextOperation) => void;
  onRemoteUsersUpdate: (fileId: string, users: RemoteUser[]) => void;
  onConnectionStatusChange?: (isConnected: boolean) => void;
  onError?: (error: Error | string) => void;
  onChatMessageReceived?: (message: ChatMessageType) => void;
  webViewFileIds?: string[];
}

// Return type for useCollaborationSession hook
export interface UseCollaborationSessionReturn {
  isConnected: boolean;
  sendChatMessage?: (message: string) => boolean;
}

// Props for useResizablePanel hook
export interface UseResizablePanelOptions {
  initialSize: number | (() => number);
  minSize?: number;
  maxSize?: number;
  direction: "horizontal-right" | "horizontal-left" | "vertical";
  containerRef: React.RefObject<HTMLElement>;
  panelRef?: React.RefObject<HTMLElement>;
  handleRef?: React.RefObject<HTMLElement>;
  onResizeStart?: () => void;
  onResizeEnd?: (finalSize: number) => void;
  onToggle?: (isOpen: boolean) => void;
  collapseThreshold?: number;
  storageKey?: string;
  defaultOpenSize?: number | (() => number);
}

// Return type for useResizablePanel hook
export interface UseResizablePanelReturn {
  size: number;
  setSize: React.Dispatch<React.SetStateAction<number>>;
  isResizing: boolean;
  previousSize: number;
  isCollapsed: boolean;
  handleMouseDown: (event: React.MouseEvent<HTMLElement>) => void;
  togglePanel: () => void;
}

// Props for SessionParticipantsPanel component
export interface SessionParticipantsPanelProps {
  participants: RemoteUser[];
  localUser: { name: string; color: string };
  activeIcon: string | null;
}
