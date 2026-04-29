import { BlockType } from "@/lib/types";
import {
  Type, Heading1, Heading2, Heading3, ListTodo, List, ListOrdered,
  Quote, Code, Minus, Lightbulb, FileText, Database,
} from "lucide-react";

export interface BlockSpec {
  type: BlockType;
  label: string;
  hint: string;
  icon: any;
  keywords: string[];
}

export const BLOCK_SPECS: BlockSpec[] = [
  { type: "paragraph", label: "Text", hint: "Just start writing with plain text", icon: Type, keywords: ["text", "paragraph", "p"] },
  { type: "page", label: "Page", hint: "Embed or create a sub-page", icon: FileText, keywords: ["page", "subpage", "doc"] },
  { type: "database", label: "Database", hint: "Inline database with multiple views", icon: Database, keywords: ["database", "table", "db", "kanban", "board"] },
  { type: "h1", label: "Heading 1", hint: "Big section heading", icon: Heading1, keywords: ["h1", "heading", "title"] },
  { type: "h2", label: "Heading 2", hint: "Medium section heading", icon: Heading2, keywords: ["h2", "heading"] },
  { type: "h3", label: "Heading 3", hint: "Small section heading", icon: Heading3, keywords: ["h3", "heading"] },
  { type: "todo", label: "To-do", hint: "Track tasks with a checkbox", icon: ListTodo, keywords: ["todo", "task", "check"] },
  { type: "bullet", label: "Bulleted list", hint: "Create a simple list", icon: List, keywords: ["bullet", "list", "ul"] },
  { type: "numbered", label: "Numbered list", hint: "Create an ordered list", icon: ListOrdered, keywords: ["numbered", "ol"] },
  { type: "quote", label: "Quote", hint: "Capture a quote", icon: Quote, keywords: ["quote"] },
  { type: "code", label: "Code", hint: "Code block with monospace", icon: Code, keywords: ["code"] },
  { type: "callout", label: "Callout", hint: "Make writing stand out", icon: Lightbulb, keywords: ["callout", "info"] },
  { type: "divider", label: "Divider", hint: "Visual separator", icon: Minus, keywords: ["divider", "hr"] },
];
