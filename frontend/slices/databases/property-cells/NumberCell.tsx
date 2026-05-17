import { useEffect, useRef, useState } from "react";
import type { Property } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { formatPropertyNumber } from "../lib/numberFormat";

interface Props {
  prop: Property;
  value: number | null;
  onSet: (v: number | null) => void;
  cellClass: string;
}

/** Number cell with format-aware display.
 *
 *  - Blur / not focused: shows formatted text per `prop.numberFormat`
 *    (e.g. "$1,234.50", "1,500,000 IDR", "25%").
 *  - Focused: switches to a raw `<input type="number">` so the user
 *    types unambiguously. Commits on blur.
 *
 *  Format helpers live in `lib/numberFormat.ts` so cards / chart axes
 *  / rollups render identically. */
export function NumberCell({ prop, value, onSet, cellClass }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value !== null ? String(value) : "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Resync draft when external value changes (and not actively editing).
  useEffect(() => {
    if (!editing) setDraft(value !== null ? String(value) : "");
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (value !== null) onSet(null);
      return;
    }
    const next = Number(trimmed);
    if (Number.isFinite(next) && next !== value) onSet(next);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        autoFocus
        inputMode="decimal"
        step="any"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); inputRef.current?.blur(); }
          if (e.key === "Escape") { setDraft(value !== null ? String(value) : ""); setEditing(false); }
        }}
        placeholder="-"
        className={cn(cellClass, "w-full bg-transparent outline-none px-2 py-1 rounded ring-1 ring-brand/40 tabular-nums")}
      />
    );
  }

  const display = formatPropertyNumber(value, prop);
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => { setEditing(true); }}
      onFocus={() => setEditing(true)}
      className={cn(
        cellClass,
        "w-full h-auto bg-transparent outline-none px-2 py-1 rounded hover:bg-accent/50 tabular-nums text-left font-normal justify-start",
        !display && "text-muted-foreground",
      )}
    >
      {display || "—"}
    </Button>
  );
}
