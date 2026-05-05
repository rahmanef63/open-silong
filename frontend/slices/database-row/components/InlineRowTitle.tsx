import { useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useStore } from "@/shared/lib/store";
import type { Page } from "@/shared/types/domain";
import { DynamicIcon } from "@/slices/icon-picker";

interface Props {
  row: Page;
  onOpen: () => void;
  autoEdit?: boolean;
  onAutoEditConsumed?: () => void;
}

export function InlineRowTitle({ row, onOpen, autoEdit, onAutoEditConsumed }: Props) {
  const { updatePage } = useStore();
  const [editing, setEditing] = useState(!!autoEdit);
  const [draft, setDraft] = useState(row.title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoEdit) {
      setEditing(true);
      onAutoEditConsumed?.();
    }
  }, [autoEdit, onAutoEditConsumed]);

  useEffect(() => {
    if (!editing) setDraft(row.title);
  }, [row.title, editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== row.title) updatePage(row.id, { title: next });
  };

  const onChange = (next: string) => {
    setDraft(next);
    updatePage(row.id, { title: next });
  };

  return (
    <div className="flex w-full items-center gap-1 px-2 py-1 group/title">
      <DynamicIcon value={row.icon} className="text-sm" />
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(row.title); setEditing(false); }
          }}
          className="flex-1 bg-background border border-brand rounded px-1 text-sm outline-none min-w-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            "flex-1 truncate text-left text-sm rounded px-1 hover:bg-accent/40",
            !row.title && "text-muted-foreground italic",
          )}
        >
          {row.title || "Untitled"}
        </button>
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        className="opacity-0 group-hover/title:opacity-100 flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-border-strong transition shrink-0"
        aria-label="Open row"
      >
        <Maximize2 className="h-3 w-3" /> Open
      </button>
    </div>
  );
}
