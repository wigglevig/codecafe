import { EditorLanguageKey, ExecutableLanguageKey } from "../types/editor";
import { LANGUAGE_VERSIONS } from "../constants/languageVersions";

// Helper function to check if a language is executable
export const isExecutableLanguage = (
  lang: EditorLanguageKey
): lang is ExecutableLanguageKey => {
  return lang in LANGUAGE_VERSIONS;
};
