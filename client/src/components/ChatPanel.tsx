import React, { useState, useEffect, useRef } from "react";
import ChatMessageComponent from "./ChatMessage";
import { IoSend } from "react-icons/io5";
import { ChatPanelProps } from "../types/chat";

const ChatPanel = ({
  isSessionActive,
  onSendMessage,
  messages,
}: ChatPanelProps) => {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);

    // Only adjust height if content exceeds one line
    const textarea = e.target;
    if (textarea.scrollHeight > 36 && textarea.scrollHeight <= 150) {
      textarea.style.height = `${textarea.scrollHeight}px`;
    } else if (textarea.scrollHeight <= 36) {
      textarea.style.height = "36px";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || !isSessionActive) return;

    // Send the message
    onSendMessage(inputMessage.trim());

    // Clear input
    setInputMessage("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "36px";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="pl-4 py-2 text-xs text-stone-400 sticky top-0 bg-stone-800 z-10">
        CHAT
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto divide-stone-600 overscroll-y-none">
        {messages.length > 0 ? (
          <>
            {messages.map((msg, index) => (
              <ChatMessageComponent
                key={`${msg.userId}-${index}`}
                userName={msg.userName}
                message={msg.message}
                userColor={msg.userColor}
                timestamp={msg.formattedTimestamp || msg.timestamp}
                isFirstMessage={index === 0}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="text-center py-10 text-stone-500 text-sm">
            {isSessionActive
              ? "No messages yet."
              : "Join a session to start chatting."}
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleInputChange}
            placeholder={
              isSessionActive ? "Type a message..." : "Join a session to chat"
            }
            disabled={!isSessionActive}
            style={{ height: "36px" }}
            className={`w-full bg-stone-800 border border-stone-600 text-stone-200 placeholder-stone-500 px-3 py-2 text-sm leading-4 focus:outline-none focus:border-stone-500 pr-10 resize-none overflow-y-auto box-border rounded-sm ${
              !isSessionActive ? "opacity-50 cursor-not-allowed" : ""
            }`}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || !isSessionActive}
            className={`absolute right-0 h-8 flex items-center justify-center px-3 ${
              inputMessage.trim() && isSessionActive
                ? "text-stone-300 hover:text-stone-100"
                : "text-stone-600 cursor-not-allowed"
            }`}
          >
            <IoSend />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
