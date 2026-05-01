import { useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import type { Database, SelectOption } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { colorClass } from "@/shared/lib/format";
import { OPTION_COLORS } from "./types";

export function OptionRow({ db, propId, option, selected, onSelect }: {
  db: Database; propId: string; option: SelectOption; selected: boolean; onSelect: () => void;
}) {
  const { updateSelectOption, deleteSelectOption } = useStore();
  const [editing, setEditing] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [draft, setDraft] = useState(option.name);

  const commit = () => {
    setEditing(false);
    if (draft.trim()) updateSelectOption(db.id, propId, option.id, { name: draft.trim() });
    else setDraft(option.name);
  };

  return (
    <div className="flex items-center gap-1 group/opt px-1 rounded hover:bg-accent">
      <button onClick={onSelect} className="flex-1 flex items-center gap-1 py-1 text-sm text-left min-w-0">
        {selected && <Check className="h-3 w-3 text-brand shrink-0" />}
        {!selected && <span className="h-3 w-3 shrink-0" />}
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(option.name); } }}
            onClick={e => e.stopPropagation()}
            className="flex-1 bg-background border border-brand rounded px-1 text-xs outline-none min-w-0"
          />
        ) : (
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs truncate", colorClass(option.color))}>
            {option.name}
          </span>
        )}
      </button>
      <div className="flex items-center gap-0.5 opacity-0 group-hover/opt:opacity-100 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setShowColors(v => !v); }}
          className="rounded p-0.5 hover:bg-muted text-muted-foreground text-[10px] leading-none"
          title="Change color"
        >
          o
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setDraft(option.name); setEditing(true); }}
          className="rounded p-0.5 hover:bg-muted text-muted-foreground"
          title="Rename"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); deleteSelectOption(db.id, propId, option.id); }}
          className="rounded p-0.5 hover:bg-muted text-muted-foreground hover:text-destructive"
          title="Delete"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {showColors && (
        <div className="absolute z-50 flex flex-wrap gap-1 p-2 rounded-md border border-border bg-popover shadow-md mt-8 ml-4 w-40">
          {OPTION_COLORS.map(c => (
            <button
              key={c}
              onClick={(e) => { e.stopPropagation(); updateSelectOption(db.id, propId, option.id, { color: c }); setShowColors(false); }}
              className={cn("h-5 w-5 rounded-full border-2", colorClass(c), option.color === c ? "border-foreground" : "border-transparent")}
              title={c}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AddOption({ db, propId }: { db: Database; propId: string }) {
  const { addSelectOption } = useStore();
  const [name, setName] = useState("");
  return (
    <div className="border-t border-border mt-1 pt-1 px-1">
      <form
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) { addSelectOption(db.id, propId, name.trim()); setName(""); } }}
        className="flex items-center gap-1"
      >
        <input
          value={name} onChange={e => setName(e.target.value)} placeholder="New option"
          className="flex-1 bg-transparent text-xs outline-none px-2 py-1 rounded hover:bg-accent"
        />
        <button type="submit" className="rounded p-1 hover:bg-accent text-muted-foreground"><Plus className="h-3 w-3" /></button>
      </form>
    </div>
  );
}
