import { useNavigate } from "@/shared/lib/router";
import { Check, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { Notification } from "../types";
import { KIND_ICON, relTime } from "../lib/format";

interface Props {
  note: Notification;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void;
}

export function NotificationRow({ note, onMarkRead, onRemove }: Props) {
  const navigate = useNavigate();
  const Icon = KIND_ICON[note.kind] ?? KIND_ICON.system;

  const onClick = () => {
    if (!note.read) onMarkRead(note.id);
    if (note.pageId) navigate(`/p/${note.pageId}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className={cn(
        "group flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-accent/50 transition cursor-pointer",
        !note.read && "bg-brand/5",
      )}
    >
      <div className={cn(
        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        note.read ? "bg-muted text-muted-foreground" : "bg-brand/15 text-brand",
      )}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn("truncate text-sm", !note.read && "font-medium")}>{note.title}</span>
          {!note.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
        </div>
        {note.body && (
          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{note.body}</div>
        )}
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          {note.actorName && (
            <span className="flex items-center gap-1">
              <span>{note.actorIcon ?? "👤"}</span>
              <span>{note.actorName}</span>
            </span>
          )}
          <span>{relTime(note.createdAt)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        {!note.read && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkRead(note.id); }}
            className="rounded p-1 hover:bg-accent text-muted-foreground"
            aria-label="Mark read"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(note.id); }}
          className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-destructive"
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
