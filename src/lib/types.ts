export type BlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "todo"
  | "bullet"
  | "numbered"
  | "quote"
  | "code"
  | "divider"
  | "callout";

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
  lang?: string;
}

export interface Page {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  cover?: string | null;
  blocks: Block[];
  favorite: boolean;
  trashed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  emoji: string;
}
