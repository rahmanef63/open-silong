import type { NotificationKind } from "../types";
import { Bell, MessageSquare, AtSign, Share2, Sparkles } from "lucide-react";

export const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  mention: AtSign,
  comment: MessageSquare,
  share: Share2,
  system: Bell,
  update: Sparkles,
};

export function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
