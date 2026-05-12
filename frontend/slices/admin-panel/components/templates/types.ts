import type { Doc } from "@convex/_generated/dataModel";

export type Template = Doc<"pageTemplates">;
export type Status = "all" | "published" | "draft" | "seed";

export interface Handlers {
  onPreview: (t: Template) => void;
  onEdit: (t: Template) => void;
  onTogglePublish: (t: Template) => void | Promise<void>;
  onDuplicate: (t: Template) => void | Promise<void>;
  onDelete: (t: Template) => void;
}
