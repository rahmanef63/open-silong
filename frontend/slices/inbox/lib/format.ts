import type { NotificationKind } from "../types";
import { Bell, MessageSquare, AtSign, Share2, Sparkles } from "lucide-react";

export const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  mention: AtSign,
  comment: MessageSquare,
  share: Share2,
  system: Bell,
  update: Sparkles,
};
