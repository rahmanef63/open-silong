import type { NotificationKind } from "../types";
import { Bell, MessageSquare, AtSign, Share2, Sparkles } from "lucide-react";

export const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  mention: AtSign,
  comment: MessageSquare,
  share: Share2,
  system: Bell,
  update: Sparkles,
};

// Re-export so existing `from "../lib/format"` imports keep working;
// canonical implementation lives in shared/lib/format.
export { formatRelTime as relTime } from "@/shared/lib/format";
