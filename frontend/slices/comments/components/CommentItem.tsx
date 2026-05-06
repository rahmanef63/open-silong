import { useState } from "react";
import { Check, Pencil, Trash2, X, RotateCcw } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { Comment } from "../types";

function relTime(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString();
}

interface Props {
  comment: Comment;
  onUpdate: (text: string) => void;
  onResolve: (resolved: boolean) => void;
  onRemove: () => void;
  /** True when the viewer authored this comment. Controls edit affordance. */
  canEdit?: boolean;
  /** True when the viewer can delete (author OR page owner). */
  canDelete?: boolean;
  /** True when the viewer can flip resolved state (author OR page owner). */
  canResolve?: boolean;
}

export function CommentItem({
  comment, onUpdate, onResolve, onRemove,
  canEdit = true, canDelete = true, canResolve = true,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== comment.text) onUpdate(t);
    setEditing(false);
  };

  return (
    <div className={cn("group rounded-md border border-border bg-card p-2", comment.resolved && "opacity-60")}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs">
          {comment.authorIcon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium truncate">{comment.authorName}</span>
            <span className="text-[10px] text-muted-foreground">{relTime(comment.createdAt)}</span>
            {comment.resolved && <span className="text-[10px] text-success">Resolved</span>}
          </div>
          {editing ? (
            <div className="mt-1 space-y-1">
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
                  if (e.key === "Escape") { setEditing(false); setDraft(comment.text); }
                }}
              />
              <div className="flex justify-end gap-1">
                <button onClick={() => { setEditing(false); setDraft(comment.text); }} className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5">
                  Cancel
                </button>
                <button onClick={commit} className="text-[11px] rounded bg-foreground text-background px-2 py-0.5">
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 text-xs whitespace-pre-wrap break-words">{comment.text}</p>
          )}
        </div>
      </div>
      {!editing && (canEdit || canResolve || canDelete) && (
        <div className="mt-1 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition">
          {canEdit && (
            <IconBtn label="Edit" onClick={() => setEditing(true)}><Pencil className="h-3 w-3" /></IconBtn>
          )}
          {canResolve && (comment.resolved ? (
            <IconBtn label="Reopen" onClick={() => onResolve(false)}><RotateCcw className="h-3 w-3" /></IconBtn>
          ) : (
            <IconBtn label="Resolve" onClick={() => onResolve(true)}><Check className="h-3 w-3" /></IconBtn>
          ))}
          {canDelete && (
            <IconBtn label="Delete" destructive onClick={onRemove}><Trash2 className="h-3 w-3" /></IconBtn>
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children, label, onClick, destructive,
}: {
  children: React.ReactNode; label: string; onClick: () => void; destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn("rounded p-1 text-muted-foreground hover:bg-accent", destructive && "hover:text-destructive")}
    >
      {children}
    </button>
  );
}
