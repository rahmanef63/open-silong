export type NotificationKind = "mention" | "comment" | "share" | "system" | "update";

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  pageId?: string;
  blockId?: string;
  actorName?: string;
  actorIcon?: string;
  read: boolean;
  createdAt: number;
}

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  mention: "Mention",
  comment: "Comment",
  share: "Share",
  system: "System",
  update: "Update",
};
