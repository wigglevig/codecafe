export interface ChatMessage {
  userId: string;
  userName: string;
  userColor: string;
  message: string;
  timestamp: string;
  formattedTimestamp?: string;
}

export interface ChatPanelProps {
  userName: string;
  userColor: string;
  sessionId: string | null;
  isSessionActive: boolean;
  userId: string;
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
}

export interface ChatMessageProps {
  userName: string;
  message: string;
  userColor: string;
  timestamp?: string;
  isFirstMessage?: boolean;
}
