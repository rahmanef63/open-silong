import { useEffect, useRef, useState } from "react";
import { Database, Page, Property, PropertyValue } from "@/shared/types/domain";
import { useDbAdapter } from "./lib/useDbAdapter";
import { cn } from "@/shared/lib/utils";
import { formatRelTime } from "@/shared/lib/format";
import { Checkbox } from "@/shared/ui/checkbox";
import { Button } from "@/shared/ui/button";
import { RelationCell } from "./property-cells/RelationCell";
import { FilesCell } from "./property-cells/FilesCell";
import { RollupCell } from "./property-cells/RollupCell";
import { FormulaCell } from "./property-cells/FormulaCell";
import { NumberCell } from "./property-cells/NumberCell";
import { SelectCell, MultiSelectCell } from "./property-cell/SelectCell";
import { ButtonCell } from "./property-cell/ButtonCell";
import { DateCell } from "./property-cell/DateCell";
import { VerificationCell } from "./property-cell/VerificationCell";

interface Props {
  db: Database;
  prop: Property;
  row: Page;
  /** Compact density renders smaller text + smaller min-height. */
  compact?: boolean;
}

export function PropertyCell({ db, prop, row, compact = false }: Props) {
  const { setRowValue, user } = useDbAdapter();
  const value = row.rowProps?.[prop.id];

  const set = (v: PropertyValue) => setRowValue(db.id, row.id, prop.id, v);
  const cellClass = compact ? "min-h-6 text-xs" : "min-h-8 text-sm";

  switch (prop.type) {
    case "text":
      return (
        <BufferedTextCell
          value={(value as string) ?? ""}
          onCommit={set}
          placeholder="-"
          className={cn(cellClass, "w-full bg-transparent outline-none px-2 py-1 rounded hover:bg-accent/50 focus:bg-accent/50")}
        />
      );
    case "number":
      return (
        <NumberCell
          prop={prop}
          value={typeof value === "number" ? value : null}
          onSet={(v) => set(v)}
          cellClass={cellClass}
        />
      );
    case "url":
    case "email":
    case "phone":
      return (
        <BufferedTextCell
          value={(value as string) ?? ""}
          onCommit={set}
          placeholder="-"
          className={cn(cellClass, "w-full bg-transparent outline-none px-2 py-1 rounded hover:bg-accent/50 text-brand")}
        />
      );
    case "checkbox":
      return (
        <div className="px-2 py-1">
          <Checkbox checked={!!value} onCheckedChange={(v) => set(!!v)} />
        </div>
      );
    case "date": {
      const dv = typeof value === "object" && value && !Array.isArray(value) && "date" in value ? value : null;
      return <DateCell db={db} prop={prop} rowId={row.id} value={dv} cellClass={cellClass} />;
    }
    case "select":
    case "status":
      return <SelectCell db={db} prop={prop} value={value} onSet={set} cellClass={cellClass} />;
    case "multi_select":
      return <MultiSelectCell db={db} prop={prop} value={value} onSet={set} cellClass={cellClass} />;
    case "person":
      return (
        <Button variant="ghost" onClick={() => set([user.id])} className={cn(cellClass, "h-auto w-full justify-start rounded px-2 py-1 text-left font-normal hover:bg-accent/50")}>
          {(value as string[])?.includes(user.id) ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20">{user.icon}</span>
              {user.name}
            </span>
          ) : <span className="text-muted-foreground text-xs">Click to assign me</span>}
        </Button>
      );
    case "files":
      return <FilesCell db={db} prop={prop} row={row} value={value} onSet={set} cellClass={cellClass} />;
    case "relation":
      return <RelationCell db={db} prop={prop} row={row} value={value} onSet={set} cellClass={cellClass} />;
    case "rollup":
      return <RollupCell db={db} prop={prop} row={row} cellClass={cellClass} />;
    case "formula":
      return <FormulaCell db={db} prop={prop} row={row} cellClass={cellClass} />;
    case "created_time":
      return <span className="px-2 py-1 text-xs text-muted-foreground">{formatRelTime(row.createdAt)}</span>;
    case "last_edited_time":
      return <span className="px-2 py-1 text-xs text-muted-foreground">{formatRelTime(row.updatedAt)}</span>;
    case "created_by":
    case "last_edited_by":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20">{user.icon}</span>
          {user.name}
        </span>
      );
    case "unique_id":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono tracking-tight text-muted-foreground">
          {typeof value === "string" || typeof value === "number" ? String(value) : "—"}
        </span>
      );
    case "button":
      return <ButtonCell prop={prop} row={row} />;
    case "place":
      return (
        <BufferedTextCell
          value={(value as string) ?? ""}
          onCommit={set}
          placeholder="Address or location"
          className={cn(cellClass, "w-full bg-transparent outline-none px-2 py-1 rounded hover:bg-accent/50")}
        />
      );
    case "verification":
      return <VerificationCell value={value} onSet={set} cellClass={cellClass} />;
    case "ai_summary":
    case "ai_translation":
    case "ai_keywords":
    case "ai_custom":
      return <AIStubCell type={prop.type} cellClass={cellClass} />;
  }
}

/** Text-ish cell input that buffers keystrokes locally and commits once on
 *  blur / Enter instead of writing to the store per character. Without this
 *  every keystroke did a store write → new `pages` identity → the whole table
 *  (N rows × M cells + N dnd-kit sortables) re-rendered, and the echo was
 *  gated on the Convex round-trip. External value changes (collaborator edit,
 *  undo) reconcile into the buffer only while the field is unfocused so they
 *  never clobber in-progress typing. */
function BufferedTextCell({
  value,
  onCommit,
  placeholder,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setLocal(value);
  }, [value]);
  const commit = () => {
    if (local !== value) onCommit(local);
  };
  return (
    <input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; commit(); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      placeholder={placeholder}
      className={className}
    />
  );
}

function AIStubCell({ type, cellClass }: { type: "ai_summary" | "ai_translation" | "ai_keywords" | "ai_custom"; cellClass: string }) {
  const labels = {
    ai_summary: "AI summary",
    ai_translation: "AI translation",
    ai_keywords: "AI keywords",
    ai_custom: "AI autofill",
  } as const;
  return (
    <span className={cn(cellClass, "inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground")} title={`${labels[type]} — backend wiring coming soon`}>
      <span className="rounded bg-brand/10 px-1 text-[9px] uppercase tracking-wider text-brand">Soon</span>
      <span className="opacity-70">{labels[type]}</span>
    </span>
  );
}
