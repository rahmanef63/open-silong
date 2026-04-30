import { useInbox } from "../hooks/useInbox";

export function InboxBadge() {
  const { unreadCount } = useInbox();
  if (unreadCount === 0) return null;
  return (
    <span className="text-[10px] rounded-full bg-brand/15 text-brand px-1.5 py-0.5 font-medium">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}
