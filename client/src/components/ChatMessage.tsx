import React from "react";
import { ChatMessageProps } from "../types/chat";

const ChatMessage: React.FC<ChatMessageProps> = ({
  userName,
  message,
  userColor,
  timestamp,
}) => {
  const firstLetter = userName ? userName[0].toUpperCase() : "?";

  return (
    <div className="py-3 border-b border-stone-600 hover:bg-stone-800/40">
      <div className="pl-4 pr-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center">
            {/* User Avatar/Icon */}
            <div
              className="flex-shrink-0 w-6 h-6 rounded-full mr-2 flex items-center justify-center text-xs font-medium shadow-sm"
              style={{ backgroundColor: userColor }}
            >
              <span className="text-white/90 select-none">{firstLetter}</span>
            </div>

            <span className="font-medium text-xs text-stone-300">
              {userName}
            </span>
          </div>

          {timestamp && (
            <span className="text-xs text-stone-500">{timestamp}</span>
          )}
        </div>

        <p className="text-sm text-stone-400 break-words">{message}</p>
      </div>
    </div>
  );
};

export default ChatMessage;
