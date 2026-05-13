import type { Id } from "@convex/_generated/dataModel";

export type Status = "open" | "resolved" | "all";

export type Row = {
  _id: Id<"feedbackEntries">;
  userId: Id<"users">;
  userEmail?: string;
  kind: "bug" | "idea" | "praise" | "other";
  message: string;
  status: "open" | "resolved";
  createdAt: number;
  resolvedAt?: number;
};

export const KIND_LABEL: Record<string, string> = { bug: "🐞", idea: "💡", praise: "🙌", other: "💬" };
