import { Inbox as InboxIcon } from "lucide-react";

export function InboxEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <InboxIcon className="h-5 w-5" />
      </div>
      <div className="text-sm font-medium">No notifications</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Mentions, comments, and updates will appear here.
      </div>
    </div>
  );
}
