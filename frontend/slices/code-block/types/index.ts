import type { KeyboardEvent } from "react";

export interface CodeBlockProps {
  text: string;
  lang?: string;
  registerRef: (el: HTMLElement | null) => void;
  onText: (next: string) => void;
  onLang: (next: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}

export interface CodeLanguage {
  value: string;
  label: string;
  aliases?: readonly string[];
}
