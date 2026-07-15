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
