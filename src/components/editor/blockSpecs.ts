import { BlockType } from "@/lib/types";
import {
  Type, Heading1, Heading2, Heading3, ListTodo, List, ListOrdered,
  Quote, Code, Minus, Lightbulb, FileText, Database, Columns2, Columns3,
  ChevronRight, Image, Sigma, Table,
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
  { type: "h1", label: "Heading 1", hint: "Big section heading", icon: Heading1, keywords: ["h1", "heading", "title"] },
  { type: "h2", label: "Heading 2", hint: "Medium section heading", icon: Heading2, keywords: ["h2", "heading"] },
  { type: "h3", label: "Heading 3", hint: "Small section heading", icon: Heading3, keywords: ["h3", "heading"] },
  { type: "todo", label: "To-do", hint: "Track tasks with a checkbox", icon: ListTodo, keywords: ["todo", "task", "check"] },
  { type: "bullet", label: "Bulleted list", hint: "Create a simple list", icon: List, keywords: ["bullet", "list", "ul"] },
  { type: "numbered", label: "Numbered list", hint: "Create an ordered list", icon: ListOrdered, keywords: ["numbered", "ol"] },
  { type: "toggle", label: "Toggle", hint: "Collapsible section with children", icon: ChevronRight, keywords: ["toggle", "collapse", "expand", "accordion"] },
  { type: "columns2", label: "2 Columns", hint: "Side-by-side two-column layout", icon: Columns2, keywords: ["columns", "2 columns", "column", "layout", "side"] },
  { type: "columns3", label: "3 Columns", hint: "Three-column layout", icon: Columns3, keywords: ["columns", "3 columns", "column", "layout"] },
  { type: "quote", label: "Quote", hint: "Capture a quote", icon: Quote, keywords: ["quote"] },
  { type: "callout", label: "Callout", hint: "Make writing stand out", icon: Lightbulb, keywords: ["callout", "info"] },
  { type: "code", label: "Code", hint: "Code block with syntax highlight", icon: Code, keywords: ["code"] },
  { type: "equation", label: "Equation", hint: "Block math (LaTeX/KaTeX)", icon: Sigma, keywords: ["equation", "math", "latex", "katex", "formula"] },
  { type: "image", label: "Image", hint: "Embed an image from a URL", icon: Image, keywords: ["image", "img", "photo", "picture", "url"] },
  { type: "divider", label: "Divider", hint: "Visual separator", icon: Minus, keywords: ["divider", "hr"] },
  { type: "page", label: "Page", hint: "Embed or create a sub-page", icon: FileText, keywords: ["page", "subpage", "doc"] },
  { type: "database", label: "Database", hint: "Inline database with multiple views", icon: Database, keywords: ["database", "db", "kanban", "board"] },
  { type: "table", label: "Simple table", hint: "Plain table — convert to database later", icon: Table, keywords: ["table", "grid", "spreadsheet", "rows", "columns"] },
];
