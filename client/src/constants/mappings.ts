import { EditorLanguageKey } from "../types/editor";
import { DiJavascript1, DiCss3Full, DiHtml5 } from "react-icons/di";
import React from "react";

// Map Monaco language identifiers if they differ
export const editorLanguageMap: { [key in EditorLanguageKey]: string } = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  c: "c",
  cplusplus: "cpp",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  css: "css",
  html: "html",
  plaintext: "plaintext",
  json: "json",
  markdown: "markdown",
};

// Icon Mapping
export const languageIconMap: {
  [key in EditorLanguageKey]?: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
} = {
  javascript: DiJavascript1,
  css: DiCss3Full,
  html: DiHtml5,
  // json: VscJson,
};

// Language Color Mapping
export const languageColorMap: { [key in EditorLanguageKey]?: string } = {
  javascript: "text-yellow-400",
  css: "text-blue-500",
  html: "text-orange-600",
  // will add more colors as more more languages are added
};

export const defaultIconColor = "text-stone-400";
