import { useState, useEffect } from "react";
import axios from "axios";
import { JoinStateType } from "../types/editor";
import { useFileStore } from "../store/useFileStore";
import { COLORS } from "../constants/colors";
import {
  DEFAULT_EXPLORER_WIDTH,
  MIN_JOIN_PANEL_WIDTH,
} from "../constants/layout";

export interface SessionManagerHookProps {
  initialUserName?: string;
  initialUserColor?: string;
  activeIcon: string | null;
  setActiveIcon: (icon: string | null) => void;
  explorerPanelSize: number;
  setExplorerPanelSize: (size: number) => void;
  // userId: string;
}

export interface SessionManagerHookResult {
  sessionId: string | null;
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  isSessionActive: boolean;
  setIsSessionActive: React.Dispatch<React.SetStateAction<boolean>>;
  joinState: JoinStateType;
  setJoinState: React.Dispatch<React.SetStateAction<JoinStateType>>;
  userName: string;
  setUserName: React.Dispatch<React.SetStateAction<string>>;
  userColor: string;
  setUserColor: React.Dispatch<React.SetStateAction<string>>;
  isColorPickerOpen: boolean;
  setIsColorPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  shareMenuView: "initial" | "link";
  setShareMenuView: React.Dispatch<React.SetStateAction<"initial" | "link">>;
  generatedShareLink: string | null;
  setGeneratedShareLink: React.Dispatch<React.SetStateAction<string | null>>;
  hasShownInitialParticipants: boolean;
  setHasShownInitialParticipants: React.Dispatch<React.SetStateAction<boolean>>;
  handleStartSession: () => Promise<void>;
  handleCopyShareLink: () => void;
  handleConfirmJoin: () => void;
}

export const useSessionManager = ({
  initialUserName = "",
  initialUserColor = COLORS[0],
  setActiveIcon,
  explorerPanelSize,
  setExplorerPanelSize,
}: SessionManagerHookProps): SessionManagerHookResult => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [joinState, setJoinState] = useState<JoinStateType>("idle");

  const [userName, setUserName] = useState<string>(initialUserName);
  const [userColor, setUserColor] = useState<string>(initialUserColor);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [shareMenuView, setShareMenuView] = useState<"initial" | "link">(
    "initial"
  );
  const [generatedShareLink, setGeneratedShareLink] = useState<string | null>(
    null
  );
  const [hasShownInitialParticipants, setHasShownInitialParticipants] =
    useState(false);

  const handleStartSession = async () => {
    if (!userName.trim()) return;
    setIsColorPickerOpen(false);

    try {
      const apiUrl = `${import.meta.env.VITE_BACKEND_URL}/api/sessions/create`;
      const createResponse = await axios.post<{ sessionId: string }>(apiUrl, {
        creatorName: userName.trim(),
      });
      const newSessionId = createResponse.data.sessionId;
      const currentFileContents = useFileStore.getState().fileContents;
      const keyFiles = ["index.html", "style.css", "script.js"];
      const initialContentPromises = keyFiles.map((fileId) => {
        const currentContent = currentFileContents[fileId];
        if (currentContent !== undefined) {
          const setDocumentUrl = `${
            import.meta.env.VITE_BACKEND_URL
          }/api/sessions/${newSessionId}/set-document`;
          return axios
            .post(setDocumentUrl, {
              documentId: fileId,
              content: currentContent,
            })
            .catch((err) => {
              console.error(
                `[useSessionManager] Failed to set initial content for ${fileId}:`,
                err
              );
              return null;
            });
        }
        return Promise.resolve(null);
      });

      await Promise.all(initialContentPromises);

      const shareLink = `${window.location.origin}${window.location.pathname}?session=${newSessionId}`;
      setSessionId(newSessionId);
      setGeneratedShareLink(shareLink);
      setShareMenuView("link");
      setIsSessionActive(true); // Activate session state AFTER setting session ID
    } catch (error) {
      console.error(
        "[useSessionManager] Error creating session or setting initial content:",
        error
      );
      alert("Failed to create session. Please try again.");
      setIsSessionActive(false);
    }
  };

  const handleCopyShareLink = () => {
    if (generatedShareLink) {
      navigator.clipboard
        .writeText(generatedShareLink)
        .then(() => {
          // console.log("Link copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy link: ", err);
        });
    }
  };

  const handleConfirmJoin = () => {
    if (!userName.trim()) {
      alert("Please enter your name.");
      return;
    }
    setJoinState("joined");
    setIsSessionActive(true); // This will trigger effects in App.tsx or collaboration hook
  };

  // Effect to handle joining via URL parameter
  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionIdFromUrl = url.searchParams.get("session");

    if (sessionIdFromUrl && !isSessionActive && joinState === "idle") {
      setSessionId(sessionIdFromUrl);
      setJoinState("prompting");
      setActiveIcon("share");

      const shareLink = `${window.location.origin}${window.location.pathname}?session=${sessionIdFromUrl}`;
      setGeneratedShareLink(shareLink);

      let targetWidth = DEFAULT_EXPLORER_WIDTH;
      if (explorerPanelSize > 0) {
        targetWidth = Math.max(targetWidth, explorerPanelSize);
      } else if (explorerPanelSize > MIN_JOIN_PANEL_WIDTH / 2) {
        // Corrected condition slightly based on original logic
        targetWidth = Math.max(targetWidth, explorerPanelSize);
      }
      targetWidth = Math.max(targetWidth, MIN_JOIN_PANEL_WIDTH);
      setExplorerPanelSize(targetWidth);

      const updatedUrl = new URL(window.location.href);
      updatedUrl.searchParams.delete("session");
      window.history.replaceState({}, "", updatedUrl.toString());
    }
  }, [
    isSessionActive,
    joinState,
    setActiveIcon,
    explorerPanelSize,
    setExplorerPanelSize,
    // setSessionId, setJoinState, setGeneratedShareLink are stable setters
  ]);

  // Effect to handle UI changes after a session is joined
  useEffect(() => {
    if (
      isSessionActive &&
      joinState === "joined" &&
      !hasShownInitialParticipants
    ) {
      // Close the sidebar after joining instead of opening participants panel
      setActiveIcon(null);
      setHasShownInitialParticipants(true);
    }
  }, [
    isSessionActive,
    joinState,
    hasShownInitialParticipants,
    setActiveIcon,
    setHasShownInitialParticipants,
  ]);

  // Effect to reset hasShownInitialParticipants when session ends
  useEffect(() => {
    if (!isSessionActive) {
      setHasShownInitialParticipants(false);
    }
  }, [isSessionActive, setHasShownInitialParticipants]);

  return {
    sessionId,
    setSessionId,
    isSessionActive,
    setIsSessionActive,
    joinState,
    setJoinState,
    userName,
    setUserName,
    userColor,
    setUserColor,
    isColorPickerOpen,
    setIsColorPickerOpen,
    shareMenuView,
    setShareMenuView,
    generatedShareLink,
    setGeneratedShareLink,
    hasShownInitialParticipants,
    setHasShownInitialParticipants,
    handleStartSession,
    handleCopyShareLink,
    handleConfirmJoin,
  };
};
