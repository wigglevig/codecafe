import * as monaco from "monaco-editor";

export type ThemeKey = keyof typeof THEMES;

export const THEMES = {
  codeCafeTheme: {
    label: "CodeCafe",
    config: {
      base: "vs-dark",
      inherit: true,
      rules: [
        {
          background: "1e1e1e",
          token: "",
        },
        {
          foreground: "d4d4d4",
          token: "text",
        },
        {
          foreground: "6a9955",
          fontStyle: "italic",
          token: "comment",
        },
        {
          foreground: "569cd6",
          token: "meta.tag",
        },
        {
          foreground: "dcdcaa",
          token: "entity.name",
        },
        {
          foreground: "9cdcfe",
          token: "variable.other",
        },
        {
          foreground: "4fc1ff",
          token: "constant",
        },
        {
          foreground: "c586c0",
          token: "keyword",
        },
        {
          foreground: "ce9178",
          token: "string",
        },
        {
          fontStyle: "underline",
          token: "entity.name.class",
        },
      ],
      colors: {
        "editor.background": "#171717",
        "editor.foreground": "#d4d4d4",
        "editorLineNumber.foreground": "#6b6b6b",
        "editorGutter.background": "#171717",
        "minimap.background": "#00000000",
        "editor.selectionBackground": "#264f78",
        "editor.inactiveSelectionBackground": "#3a3d41",
        "editorIndentGuide.background": "#404040",
        "editor.lineHighlightBackground": "#2a2a2a",
        "editor.lineHighlightBorder": "#454545",
      },
    } as monaco.editor.IStandaloneThemeData,
  },
  transparentTheme: {
    label: "VS Code",
    config: {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#00000000",
        "editorGutter.background": "#00000000",
        "minimap.background": "#00000000",
      },
    } as monaco.editor.IStandaloneThemeData,
  },
};
