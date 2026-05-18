"use client";

import { useState } from "react";
import { Inbox as InboxIcon, CheckCheck, Filter } from "lucide-react";
import { useInbox } from "../hooks/useInbox";
import { useChangelog } from "../hooks/useChangelog";
import { NotificationRow } from "../components/NotificationRow";
import { ChangelogRow } from "../components/ChangelogRow";
import { InboxEmpty } from "../components/InboxEmpty";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

type FilterMode = "all" | "unread";

export function InboxPage() {
  const { items, unreadCount: notifUnread, markRead, markAllRead, remove, isLoading } = useInbox();
  const { unread: changelog, unreadCount: changelogUnread, markAllRead: markChangelogRead } = useChangelog();
  const [mode, setMode] = useState<FilterMode>("all");

  const visible = mode === "unread" ? items.filter((n) => !n.read) : items;
  const totalUnread = notifUnread + changelogUnread;
  const onMarkAllRead = async () => {
    await Promise.all([
      notifUnread > 0 ? markAllRead() : Promise.resolve(),
      changelogUnread > 0 ? markChangelogRead() : Promise.resolve(),
    ]);
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl px-6 md:px-12 py-8">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand/15 text-brand">
              <InboxIcon className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
              <p className="text-xs text-muted-foreground">
                {totalUnread > 0 ? `${totalUnread} unread` : "You're all caught up"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FilterTabs mode={mode} setMode={setMode} unreadCount={notifUnread} />
            {totalUnread > 0 && (
              <Button
                variant="outline"
                onClick={onMarkAllRead}
                className="h-auto gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-normal [&_svg]:size-3.5"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </Button>
            )}
          </div>
        </header>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {changelog.map((entry) => (
            <ChangelogRow key={entry._id} entry={entry} />
          ))}
          {isLoading ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : visible.length === 0 && changelog.length === 0 ? (
            <InboxEmpty />
          ) : (
            visible.map((n) => (
              <NotificationRow
                key={n.id}
                note={n}
                onMarkRead={(id) => markRead({ id })}
                onRemove={(id) => remove({ id })}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FilterTabs({
  mode, setMode, unreadCount,
}: { mode: FilterMode; setMode: (m: FilterMode) => void; unreadCount: number }) {
  return (
    <div className="flex items-center rounded-md border border-border p-0.5 text-xs">
      <Button
        variant="ghost"
        onClick={() => setMode("all")}
        className={cn("h-auto rounded px-2 py-0.5 text-xs font-normal transition", mode === "all" ? "bg-accent" : "text-muted-foreground")}
      >
        <Filter className="inline h-3 w-3 mr-1" /> All
      </Button>
      <Button
        variant="ghost"
        onClick={() => setMode("unread")}
        className={cn("h-auto rounded px-2 py-0.5 text-xs font-normal transition", mode === "unread" ? "bg-accent" : "text-muted-foreground")}
      >
        Unread {unreadCount > 0 && <span className="ml-1 text-brand">{unreadCount}</span>}
      </Button>
    </div>
  );
}
