import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Notification } from "../types";

function toNotification(doc: any): Notification {
  return {
    id: doc._id,
    kind: doc.kind,
    title: doc.title,
    body: doc.body,
    pageId: doc.pageId,
    blockId: doc.blockId,
    actorName: doc.actorName,
    actorIcon: doc.actorIcon,
    read: doc.read,
    createdAt: doc.createdAt,
  };
}

export function useInbox() {
  const raw = useQuery(api["features/inbox/queries"].list);
  const unreadCountRemote = useQuery(api["features/inbox/queries"].unreadCount);

  const create = useMutation(api["features/inbox/mutations"].create);
  const markRead = useMutation(api["features/inbox/mutations"].markRead);
  const markAllRead = useMutation(api["features/inbox/mutations"].markAllRead);
  const remove = useMutation(api["features/inbox/mutations"].remove);

  const items: Notification[] = (raw ?? []).map(toNotification);
  const unreadCount = unreadCountRemote ?? items.filter((n) => !n.read).length;

  return {
    isLoading: raw === undefined,
    items,
    unreadCount,
    create,
    markRead,
    markAllRead,
    remove,
  };
}
