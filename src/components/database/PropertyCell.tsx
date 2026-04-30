import { useState } from "react";
import { Database, Page, Property, PropertyValue, SelectOption } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/shared/lib/utils";
import { colorClass, formatRelTime } from "@/shared/lib/format";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calculator, Check, File, Link2, Pencil, Plus, Sigma, X,
} from "lucide-react";
import { FileChip, FileUploadButton, parseFileRef } from "@/slices/files";

const OPTION_COLORS = [
  "gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red",
] as const;

export function PropertyCell({
  db, prop, row, compact = false,
}: {
  db: Database; prop: Property; row: Page; compact?: boolean;
}) {
  const { setRowValue, user } = useStore();
  const value = row.rowProps?.[prop.id];

  const set = (v: PropertyValue) => setRowValue(db.id, row.id, prop.id, v);
  const cellClass = compact ? "min-h-6 text-xs" : "min-h-8 text-sm";

  switch (prop.type) {
    case "text":
      return (
        <input
          value={(value as string) ?? ""}
          onChange={e => set(e.target.value)}
          placeholder="-"
          className={cn(cellClass, "w-full bg-transparent outline-none px-2 py-1 rounded hover:bg-accent/50 focus:bg-accent/50")}
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={(value as number) ?? ""}
          onChange={e => set(e.target.value === "" ? null : Number(e.target.value))}
          placeholder="-"
          className={cn(cellClass, "w-full bg-transparent outline-none px-2 py-1 rounded hover:bg-accent/50 tabular-nums")}
        />
      );
    case "url":
    case "email":
    case "phone":
      return (
        <input
          value={(value as string) ?? ""}
          onChange={e => set(e.target.value)}
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
    case "date":
      return (
        <input
          type="date"
          value={typeof value === "object" && value && "date" in value ? value.date ?? "" : ""}
          onChange={e => set({ date: e.target.value })}
          className={cn(cellClass, "w-full bg-transparent outline-none px-2 py-1 rounded hover:bg-accent/50")}
        />
      );
    case "select":
    case "status": {
      const selectedId = value as string | null;
      const opt = prop.options?.find(o => o.id === selectedId);
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(cellClass, "w-full text-left px-2 py-1 rounded hover:bg-accent/50")}>
              {opt
                ? <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(opt.color))}>{opt.name}</span>
                : <span className="text-muted-foreground">-</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-1">
            <div className="space-y-0.5 max-h-60 overflow-y-auto">
              {prop.options?.map(o => (
                <OptionRow
                  key={o.id}
                  db={db}
                  propId={prop.id}
                  option={o}
                  selected={o.id === selectedId}
                  onSelect={() => set(o.id === selectedId ? null : o.id)}
                />
              ))}
              <button onClick={() => set(null)} className="flex w-full items-center px-2 py-1 rounded hover:bg-accent text-xs text-muted-foreground">
                <X className="mr-1 h-3 w-3" /> Clear
              </button>
            </div>
            <AddOption db={db} propId={prop.id} />
          </PopoverContent>
        </Popover>
      );
    }
    case "multi_select": {
      const ids = (value as string[]) ?? [];
      const selected = prop.options?.filter(o => ids.includes(o.id)) ?? [];
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(cellClass, "w-full text-left px-2 py-1 rounded hover:bg-accent/50 flex flex-wrap gap-1")}>
              {selected.length === 0 && <span className="text-muted-foreground">-</span>}
              {selected.map(o => (
                <span key={o.id} className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(o.color))}>{o.name}</span>
              ))}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-1">
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {prop.options?.map(o => {
                const on = ids.includes(o.id);
                return (
                  <OptionRow
                    key={o.id}
                    db={db}
                    propId={prop.id}
                    option={o}
                    selected={on}
                    onSelect={() => set(on ? ids.filter(x => x !== o.id) : [...ids, o.id])}
                  />
                );
              })}
            </div>
            <AddOption db={db} propId={prop.id} />
          </PopoverContent>
        </Popover>
      );
    }
    case "person":
      return (
        <button onClick={() => set([user.id])} className={cn(cellClass, "w-full text-left px-2 py-1 rounded hover:bg-accent/50")}>
          {(value as string[])?.includes(user.id) ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20">{user.icon}</span>
              {user.name}
            </span>
          ) : <span className="text-muted-foreground text-xs">Click to assign me</span>}
        </button>
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
  }
}

function RelationCell({
  db, prop, row, value, onSet, cellClass,
}: {
  db: Database;
  prop: Property;
  row: Page;
  value: PropertyValue | undefined;
  onSet: (value: PropertyValue) => void;
  cellClass: string;
}) {
  const { pages, databases, updateProperty } = useStore();
  const [query, setQuery] = useState("");
  const linkedIds = Array.isArray(value) ? value : [];
  const linked = linkedIds.map((id) => pages.find((p) => p.id === id)).filter((p): p is Page => !!p && !p.trashed);

  const databaseRows = pages.filter((p) => !p.trashed && p.id !== row.id && p.rowOfDatabaseId);
  const fallbackPages = pages.filter((p) => !p.trashed && p.id !== row.id && !p.rowOfDatabaseId);
  const baseCandidates = databaseRows.length ? databaseRows : fallbackPages;
  const candidates = baseCandidates
    .filter((p) => !prop.relationDatabaseId || p.rowOfDatabaseId === prop.relationDatabaseId)
    .filter((p) => `${p.title} ${p.icon}`.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 40);

  const toggle = (id: string) => {
    onSet(linkedIds.includes(id) ? linkedIds.filter((x) => x !== id) : [...linkedIds, id]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(cellClass, "w-full text-left px-2 py-1 rounded hover:bg-accent/50 flex items-center gap-1")}>
          <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {linked.length ? (
            <span className="flex min-w-0 flex-wrap gap-1">
              {linked.slice(0, 2).map((p) => (
                <span key={p.id} className="inline-flex max-w-28 items-center gap-1 rounded border border-border bg-muted/60 px-1.5 py-0.5 text-xs">
                  <span>{p.icon}</span>
                  <span className="truncate">{p.title || "Untitled"}</span>
                </span>
              ))}
              {linked.length > 2 && <span className="text-xs text-muted-foreground">+{linked.length - 2}</span>}
            </span>
          ) : (
            <span className="text-muted-foreground">Link rows</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <div className="space-y-2">
          <select
            value={prop.relationDatabaseId ?? ""}
            onChange={(e) => updateProperty(db.id, prop.id, { relationDatabaseId: e.target.value || null })}
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none"
          >
            <option value="">All database rows</option>
            {databases.map((d) => (
              <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages"
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {candidates.map((p) => {
              const selected = linkedIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  {selected ? <Check className="h-3.5 w-3.5 text-brand" /> : <span className="w-3.5" />}
                  <span>{p.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{p.title || "Untitled"}</span>
                </button>
              );
            })}
            {candidates.length === 0 && (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">No matching rows</div>
            )}
          </div>
          {linkedIds.length > 0 && (
            <button onClick={() => onSet([])} className="text-xs text-muted-foreground hover:text-foreground">
              Clear relation
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilesCell({
  value, onSet, cellClass,
}: {
  db: Database;
  prop: Property;
  row: Page;
  value: PropertyValue | undefined;
  onSet: (value: PropertyValue) => void;
  cellClass: string;
}) {
  const [draft, setDraft] = useState("");
  const files = Array.isArray(value) ? value : [];

  const addUrl = () => {
    const v = draft.trim();
    if (!v) return;
    onSet([...files, v]);
    setDraft("");
  };
  const remove = (file: string) => onSet(files.filter((f) => f !== file));
  const onUploaded = (ref: string) => onSet([...files, ref]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(cellClass, "w-full text-left px-2 py-1 rounded hover:bg-accent/50 flex items-center gap-1")}>
          <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {files.length ? (
            <span className="min-w-0 truncate text-xs">{files.length} file{files.length === 1 ? "" : "s"}</span>
          ) : (
            <span className="text-muted-foreground">Attach file</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <div className="space-y-2">
          <div className="max-h-48 overflow-y-auto space-y-1">
            {files.map((file) => (
              <FileChip key={file} fileRef={file} onRemove={() => remove(file)} />
            ))}
            {files.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">No files</div>}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); addUrl(); }}
            className="flex gap-1"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Paste URL"
              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs outline-none"
            />
            <button type="submit" className="h-8 rounded-md bg-foreground px-2 text-xs text-background">
              Add
            </button>
          </form>
          <FileUploadButton onUploaded={onUploaded} multiple label="Upload file" />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RollupCell({ db, prop, row, cellClass }: { db: Database; prop: Property; row: Page; cellClass: string }) {
  const { pages, databases, updateProperty } = useStore();
  const relationProps = db.properties.filter((p) => p.type === "relation");
  const relationProp = relationProps.find((p) => p.id === prop.rollupRelationPropertyId) ?? relationProps[0];
  const linkedIds = relationProp && Array.isArray(row.rowProps?.[relationProp.id]) ? row.rowProps?.[relationProp.id] as string[] : [];
  const linkedPages = linkedIds.map((id) => pages.find((p) => p.id === id)).filter((p): p is Page => !!p && !p.trashed);
  const targetDb = databases.find((d) => d.id === relationProp?.relationDatabaseId) ?? db;
  const targetProps = targetDb.properties.filter((p) => p.type !== "rollup" && p.type !== "formula");
  const targetProp = targetProps.find((p) => p.id === prop.rollupTargetPropertyId);
  const aggregate = prop.rollupAggregate ?? "count";
  const value = computeRollup(aggregate, linkedPages, targetProp, pages, targetDb);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(cellClass, "w-full text-left px-2 py-1 rounded hover:bg-accent/50 flex items-center gap-1")}>
          <Sigma className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className={cn("min-w-0 truncate", !relationProp && "text-muted-foreground")}>
            {relationProp ? value : "Pick relation"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <div className="space-y-2">
          <label className="block text-[11px] font-medium text-muted-foreground">Relation</label>
          <select
            value={relationProp?.id ?? ""}
            onChange={(e) => updateProperty(db.id, prop.id, { rollupRelationPropertyId: e.target.value || null })}
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none"
          >
            <option value="">Choose relation</option>
            {relationProps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <label className="block text-[11px] font-medium text-muted-foreground">Aggregate</label>
          <select
            value={aggregate}
            onChange={(e) => updateProperty(db.id, prop.id, { rollupAggregate: e.target.value as Property["rollupAggregate"] })}
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none"
          >
            <option value="count">Count</option>
            <option value="values">Show values</option>
            <option value="sum">Sum numbers</option>
            <option value="checked">Checked count</option>
            <option value="latest">Latest date</option>
          </select>

          <label className="block text-[11px] font-medium text-muted-foreground">Target property</label>
          <select
            value={targetProp?.id ?? ""}
            onChange={(e) => updateProperty(db.id, prop.id, { rollupTargetPropertyId: e.target.value || null })}
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none"
          >
            <option value="">Page title</option>
            {targetProps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {!relationProps.length && (
            <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              Add a Relation property to feed this rollup.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FormulaCell({ db, prop, row, cellClass }: { db: Database; prop: Property; row: Page; cellClass: string }) {
  const { pages, updateProperty } = useStore();
  const expression = prop.formulaExpression ?? "{{title}}";
  const [draft, setDraft] = useState(expression);
  const value = evaluateFormula(expression, row, db, pages);

  const save = () => {
    updateProperty(db.id, prop.id, { formulaExpression: draft.trim() || "{{title}}" });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(cellClass, "w-full text-left px-2 py-1 rounded hover:bg-accent/50 flex items-center gap-1")}>
          <Calculator className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="min-w-0 truncate">{value || "-"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <form
          onSubmit={(e) => { e.preventDefault(); save(); }}
          className="space-y-2"
        >
          <label className="block text-[11px] font-medium text-muted-foreground">Expression</label>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="{{title}}"
            className="h-8 w-full rounded-md border border-border bg-background px-2 font-mono text-xs outline-none"
          />
          <div className="rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
            Use {"{{title}}"} or {"{{Property name}}"}. Start with = for simple math.
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-xs text-muted-foreground">Preview: {value || "-"}</span>
            <button type="submit" className="rounded-md bg-foreground px-2 py-1 text-xs text-background">
              Save
            </button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/** Inline option row with rename, recolor, delete */
function OptionRow({ db, propId, option, selected, onSelect }: {
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

function AddOption({ db, propId }: { db: Database; propId: string }) {
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

function computeRollup(
  aggregate: Property["rollupAggregate"],
  linkedPages: Page[],
  targetProp: Property | undefined,
  pages: Page[],
  targetDb: Database,
) {
  if (aggregate === "count") return String(linkedPages.length);
  const values = linkedPages.map((page) =>
    targetProp ? formatPropertyValue(page.rowProps?.[targetProp.id], targetProp, pages, targetDb) : (page.title || "Untitled")
  ).filter(Boolean);

  if (aggregate === "values") return values.length ? values.join(", ") : "-";
  if (aggregate === "checked") {
    if (!targetProp) return "0 checked";
    const checked = linkedPages.filter((page) => page.rowProps?.[targetProp.id] === true).length;
    return `${checked}/${linkedPages.length} checked`;
  }
  if (aggregate === "sum") {
    if (!targetProp) return "0";
    const sum = linkedPages.reduce((total, page) => total + Number(page.rowProps?.[targetProp.id] ?? 0), 0);
    return String(sum);
  }
  if (aggregate === "latest") {
    const dates = linkedPages
      .map((page) => targetProp ? page.rowProps?.[targetProp.id] : null)
      .map((value) => typeof value === "object" && value && "date" in value ? value.date : null)
      .filter((date): date is string => !!date)
      .sort();
    return dates.at(-1) ?? "-";
  }
  return "-";
}

function evaluateFormula(expression: string, row: Page, db: Database, pages: Page[]) {
  const rendered = expression.replace(/\{\{([^}]+)\}\}/g, (_, token: string) => {
    const trimmed = token.trim();
    if (trimmed.toLowerCase() === "title" || trimmed.toLowerCase() === "name") return row.title || "Untitled";
    const prop = db.properties.find((p) => p.id === trimmed || p.name.toLowerCase() === trimmed.toLowerCase());
    return prop ? formatPropertyValue(row.rowProps?.[prop.id], prop, pages, db) : "";
  });

  if (rendered.trim().startsWith("=")) {
    const math = rendered.trim().slice(1);
    if (!/^[\d+\-*/().\s]+$/.test(math)) return "Invalid formula";
    try {
      const result = Function(`"use strict"; return (${math});`)();
      return Number.isFinite(result) ? String(result) : "Invalid formula";
    } catch {
      return "Invalid formula";
    }
  }

  return rendered;
}

function formatPropertyValue(value: PropertyValue | undefined, prop: Property, pages: Page[], db: Database): string {
  if (value === undefined || value === null || value === "") return "";
  if (prop.type === "checkbox") return value === true ? "Checked" : "Unchecked";
  if (prop.type === "date") return typeof value === "object" && "date" in value ? value.date ?? "" : "";
  if (prop.type === "select" || prop.type === "status") {
    return prop.options?.find((o) => o.id === value)?.name ?? String(value);
  }
  if (prop.type === "multi_select") {
    const ids = Array.isArray(value) ? value : [];
    return ids.map((id) => prop.options?.find((o) => o.id === id)?.name ?? id).join(", ");
  }
  if (prop.type === "relation") {
    const ids = Array.isArray(value) ? value : [];
    return ids.map((id) => pages.find((p) => p.id === id)?.title || "Untitled").join(", ");
  }
  if (prop.type === "files") {
    const files = Array.isArray(value) ? value : [];
    return files.map((f) => parseFileRef(f).filename).join(", ");
  }
  if (prop.type === "created_time") return "";
  if (prop.type === "last_edited_time") return "";
  if (prop.type === "created_by" || prop.type === "last_edited_by") return "";
  if (prop.type === "formula") return evaluateFormula(prop.formulaExpression ?? "{{title}}", { ...({} as Page), rowProps: {} }, db, pages);
  return String(value);
}

