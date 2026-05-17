/** Shared static metadata for ticket UI — kind labels + colors,
 *  status badges, priority badges. Consumed by user-facing
 *  `UserTicketsList` AND the admin-panel feedback view. */

export type TicketKind = "bug" | "idea" | "praise" | "other";
export type TicketStatus = "open" | "in_review" | "resolved" | "closed";
export type TicketPriority = "low" | "med" | "high";

export const KIND_META: Record<TicketKind, { label: string; emoji: string; description: string }> = {
  bug: { label: "Bug", emoji: "🐞", description: "Something is broken or not working as expected" },
  idea: { label: "Feature request", emoji: "💡", description: "Suggest a new capability" },
  praise: { label: "Praise", emoji: "🙌", description: "Tell us what's working well" },
  other: { label: "Other", emoji: "💬", description: "Anything else" },
};

export const STATUS_META: Record<TicketStatus, { label: string; className: string }> = {
  open:       { label: "Open",        className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  in_review:  { label: "In review",   className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  resolved:   { label: "Resolved",    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  closed:     { label: "Closed",      className: "bg-muted text-muted-foreground" },
};

export const PRIORITY_META: Record<TicketPriority, { label: string; className: string }> = {
  low:  { label: "Low",    className: "bg-muted text-muted-foreground" },
  med:  { label: "Medium", className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300" },
  high: { label: "High",   className: "bg-red-500/15 text-red-700 dark:text-red-300" },
};

export const KIND_ORDER: TicketKind[] = ["bug", "idea", "praise", "other"];
export const STATUS_ORDER: TicketStatus[] = ["open", "in_review", "resolved", "closed"];
export const PRIORITY_ORDER: TicketPriority[] = ["low", "med", "high"];
