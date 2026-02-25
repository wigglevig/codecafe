import { create } from "zustand";
import {
  OpenFile,
  EditorLanguageKey,
  SearchOptions,
  MatchInfo,
} from "../types/editor";
import { MOCK_FILES } from "../constants/mockFiles";

const initialOpenFileIds = ["index.html", "style.css", "script.js"];

const initialOpenFilesData = initialOpenFileIds.map((id): OpenFile => {
  const fileData = MOCK_FILES[id];
  if (!fileData) {
    console.error(`Initial file ${id} not found in MOCK_FILES!`);
    return { id, name: "Error", language: "plaintext" as EditorLanguageKey };
  }
  return {
    id: id,
    name: fileData.name,
    language: fileData.language as EditorLanguageKey,
  };
});

const initialFileContents: { [id: string]: string } = {};
initialOpenFileIds.forEach((id) => {
  const fileData = MOCK_FILES[id];
  if (fileData) {
    initialFileContents[id] = fileData.content;
  } else {
    initialFileContents[id] = `// Error: Content for ${id} not found`;
  }
});

const initialActiveFileId = initialOpenFileIds[0] || null;

const initialSearchOptions: SearchOptions = {
  matchCase: false,
  wholeWord: false,
  isRegex: false,
  preserveCase: false,
};

interface FileState {
  openFiles: OpenFile[];
  activeFileId: string | null;
  fileContents: { [id: string]: string };

  draggingId: string | null;
  dropIndicator: { tabId: string | null; side: "left" | "right" | null };

  // Search State
  searchTerm: string;
  replaceTerm: string;
  searchOptions: SearchOptions;
  matchInfo: MatchInfo | null;
}

interface FileActions {
  setOpenFiles: (
    files: OpenFile[] | ((prev: OpenFile[]) => OpenFile[])
  ) => void;
  setActiveFileId: (id: string | null) => void;
  setFileContent: (id: string, content: string) => void;
  setDraggingId: (id: string | null) => void;
  setDropIndicator: (indicator: FileState["dropIndicator"]) => void;
  openFile: (fileId: string, isSessionActive: boolean) => void;
  closeFile: (fileIdToClose: string) => void;
  switchTab: (fileId: string) => void;

  // Search Actions
  setSearchTerm: (term: string) => void;
  setReplaceTerm: (term: string) => void;
  toggleSearchOption: (option: keyof SearchOptions) => void;
  setMatchInfo: (info: MatchInfo | null) => void;
  resetSearch: () => void;
}

export const useFileStore = create<FileState & FileActions>((set, get) => ({
  openFiles: initialOpenFilesData,
  activeFileId: initialActiveFileId,
  fileContents: initialFileContents,
  draggingId: null,
  dropIndicator: { tabId: null, side: null },

  // Initial Search State
  searchTerm: "",
  replaceTerm: "",
  searchOptions: initialSearchOptions,
  matchInfo: null,

  setOpenFiles: (files) =>
    set((state) => ({
      openFiles: typeof files === "function" ? files(state.openFiles) : files,
    })),
  setActiveFileId: (id) => set({ activeFileId: id }),
  setFileContent: (id, content) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [id]: content },
    })),
  setDraggingId: (id) => set({ draggingId: id }),
  setDropIndicator: (indicator) => set({ dropIndicator: indicator }),

  switchTab: (fileId) => {
    set({ activeFileId: fileId });
  },

  openFile: (fileId) => {
    const fileData = MOCK_FILES[fileId];
    if (!fileData) {
      console.error(`Cannot open file: ${fileId} not found in MOCK_FILES.`);
      return;
    }

    const state = get();
    const fileAlreadyOpen = state.openFiles.some((f) => f.id === fileId);

    if (!fileAlreadyOpen) {
      const newOpenFile: OpenFile = {
        id: fileId,
        name: fileData.name,
        language: fileData.language as EditorLanguageKey,
      };

      const newStateUpdate: Partial<FileState> = {
        openFiles: [...state.openFiles, newOpenFile],
        activeFileId: fileId,
      };

      // Initialize content for files that don't have content yet
      if (state.fileContents[fileId] === undefined) {
        newStateUpdate.fileContents = {
          ...state.fileContents,
          [fileId]: fileData.content,
        };
      }

      set(newStateUpdate);
    } else {
      // File is already open, just switch to it
      set({ activeFileId: fileId });
    }
  },

  closeFile: (fileIdToClose) => {
    const state = get();
    const indexToRemove = state.openFiles.findIndex(
      (f) => f.id === fileIdToClose
    );

    if (indexToRemove === -1) return;

    let nextActiveId: string | null = state.activeFileId;

    if (state.activeFileId === fileIdToClose) {
      if (state.openFiles.length > 1) {
        const newIndex = Math.max(0, indexToRemove - 1);
        nextActiveId =
          state.openFiles[newIndex]?.id ?? state.openFiles[0]?.id ?? null;
        const remainingFiles = state.openFiles.filter(
          (f) => f.id !== fileIdToClose
        );
        nextActiveId =
          remainingFiles[Math.max(0, indexToRemove - 1)]?.id ??
          remainingFiles[0]?.id ??
          null;
      } else {
        nextActiveId = null;
      }
    }

    // Update state: filter closed file and set new active ID
    set({
      openFiles: state.openFiles.filter((f) => f.id !== fileIdToClose),
      activeFileId: nextActiveId,
    });
  },

  // Search Action Implementations
  setSearchTerm: (term) => set({ searchTerm: term }),
  setReplaceTerm: (term) => set({ replaceTerm: term }),
  toggleSearchOption: (option) =>
    set((state) => ({
      searchOptions: {
        ...state.searchOptions,
        [option]: !state.searchOptions[option],
      },
    })),
  setMatchInfo: (info) => set({ matchInfo: info }),
  resetSearch: () =>
    set({
      searchTerm: "",
      replaceTerm: "",
      matchInfo: null,
      // searchOptions are intentionally not reset here, user might want to keep them
    }),
}));
