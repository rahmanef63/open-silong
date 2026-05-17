import type { Id } from "@convex/_generated/dataModel";

export type StatusFilter = "open" | "in_review" | "resolved" | "closed" | "all";
export type TicketStatus = "open" | "in_review" | "resolved" | "closed";
export type TicketPriority = "low" | "med" | "high";

/** Back-compat alias for legacy callers expecting the old binary filter. */
export type Status = StatusFilter;

export type Row = {
  _id: Id<"feedbackEntries">;
  userId: Id<"users">;
  userEmail?: string;
  kind: "bug" | "idea" | "praise" | "other";
  title?: string;
  message: string;
  status: TicketStatus;
  priority?: TicketPriority;
  adminReply?: string;
  repliedAt?: number;
  repliedBy?: Id<"users">;
  createdAt: number;
  resolvedAt?: number;
};

export const KIND_LABEL: Record<string, string> = { bug: "🐞", idea: "💡", praise: "🙌", other: "💬" };
