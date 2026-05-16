import type { ReactNode } from "react";
import { useState } from "react";
import type { Property, PropertyType, PropertyValue } from "@/shared/types/domain";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import { colorClass } from "@/shared/lib/format";
import { X, Link2, AlertTriangle } from "lucide-react";
import { DatePicker } from "../property-cell/date-cell/DatePicker";
import { useStore } from "@/shared/lib/store";
import { filterRelationCandidates } from "../lib/relationCandidates";
import { DynamicIcon } from "@/shared/components/icon-picker";

/** Property types that can't be edited from a form (computed / system fields). */
export const READ_ONLY_PROPERTY_TYPES: PropertyType[] = [
  "rollup", "formula", "created_time", "created_by",
  "last_edited_time", "last_edited_by", "unique_id",
  "ai_summary", "ai_translation", "ai_keywords", "ai_custom",
];
/** Property types that don't yet have a form-friendly editor. */
export const UNSUPPORTED_FORM_TYPES: PropertyType[] = [
  "files", "verification",
  "ai_summary", "ai_translation", "ai_keywords", "ai_custom",
];

export function isFormableProperty(p: Property): boolean {
  return !READ_ONLY_PROPERTY_TYPES.includes(p.type) && !UNSUPPORTED_FORM_TYPES.includes(p.type);
}

export function emptyDraft(props: Property[]): Record<string, PropertyValue> {
  const d: Record<string, PropertyValue> = {};
  for (const p of props) {
    if (p.type === "checkbox") d[p.id] = false;
    else if (p.type === "multi_select") d[p.id] = [];
    else if (p.type === "date") d[p.id] = null;
    else d[p.id] = null;
  }
  return d;
}

export function isEmptyValue(v: PropertyValue): boolean {
  if (v === null || v === undefined || v === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

/** Form field wrapper: label + optional required indicator + help text. */
export function FormField({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </span>
        {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

/** Type-aware editor for a single Property — used by FormView and
 *  QuickCreateDialog. Read-only / unsupported types should be filtered out
 *  by callers via isFormableProperty. */
export function PropertyFormInput({
  prop, value, onChange,
}: { prop: Property; value: PropertyValue; onChange: (v: PropertyValue) => void }) {
  switch (prop.type) {
    case "text":
      return <Input value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} />;
    case "number":
      return (
        <Input
          type="number"
          value={(value as number | null) ?? ""}
          onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "url":
      return <Input type="url" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} />;
    case "email":
      return <Input type="email" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} />;
    case "phone":
      return <Input type="tel" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} />;
    case "date": {
      const dv = typeof value === "object" && value && !Array.isArray(value) && "date" in value ? value : null;
      return (
        <DatePicker
          value={dv}
          prop={prop}
          onChange={onChange}
          triggerClass="h-9 border border-border bg-background"
          emptyPlaceholder="Select a date"
        />
      );
    }
    case "checkbox":
      return (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox checked={!!value} onCheckedChange={(v) => onChange(!!v)} />
          <span className="text-xs text-muted-foreground">Check if true</span>
        </div>
      );
    case "select":
    case "status": {
      const selectedId = value as string | null;
      const opt = prop.options?.find(o => o.id === selectedId);
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="h-auto w-full justify-start bg-background px-3 py-2 text-left text-sm font-normal hover:bg-accent/50">
              {opt ? (
                <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(opt.color))}>{opt.name}</span>
              ) : (
                <span className="text-muted-foreground">Select…</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1">
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {prop.options?.map(o => (
                <Button
                  key={o.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(o.id === selectedId ? null : o.id)}
                  className={cn("h-auto w-full justify-between px-2 py-1 text-xs font-normal", o.id === selectedId && "bg-accent")}
                >
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5", colorClass(o.color))}>{o.name}</span>
                </Button>
              ))}
              {selectedId && (
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} className="h-auto w-full justify-start px-2 py-1 text-xs font-normal text-muted-foreground">
                  <X className="mr-1 h-3 w-3" /> Clear
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    case "multi_select": {
      const ids = (value as string[]) ?? [];
      const toggle = (id: string) => onChange(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="h-auto min-h-[38px] w-full flex-wrap justify-start gap-1 bg-background px-3 py-2 text-left text-sm font-normal hover:bg-accent/50">
              {ids.length === 0 && <span className="text-muted-foreground">Select…</span>}
              {prop.options?.filter(o => ids.includes(o.id)).map(o => (
                <span key={o.id} className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(o.color))}>{o.name}</span>
              ))}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1">
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {prop.options?.map(o => (
                <Button
                  key={o.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggle(o.id)}
                  className={cn("h-auto w-full justify-between px-2 py-1 text-xs font-normal", ids.includes(o.id) && "bg-accent")}
                >
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5", colorClass(o.color))}>{o.name}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    case "person": {
      const v = (value as string[]) ?? [];
      return (
        <Input
          value={v.join(", ")}
          onChange={e => {
            const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
            onChange(arr);
          }}
          placeholder="Comma-separated names"
        />
      );
    }
    case "relation":
      return <FormRelationInput prop={prop} value={value} onChange={onChange} />;
    default:
      return <Input value={String(value ?? "")} onChange={e => onChange(e.target.value)} />;
  }
}

/** Form-friendly relation picker. Read-only candidates list — does NOT
 *  expose row creation (form is for new-row submission, sub-creates would
 *  be confusing). Renders a multi-select chip list with search. */
function FormRelationInput({
  prop, value, onChange,
}: { prop: Property; value: PropertyValue; onChange: (v: PropertyValue) => void }) {
  const { pages, databases } = useStore();
  const [query, setQuery] = useState("");
  const linkedIds = Array.isArray(value) ? (value as string[]) : [];

  const targetDbConfigured = !!prop.relationDatabaseId;
  const targetDb = prop.relationDatabaseId ? databases.find((d) => d.id === prop.relationDatabaseId) : null;
  const targetDbMissing = targetDbConfigured && !targetDb;

  const candidates = filterRelationCandidates({
    pages,
    selfRowId: undefined,
    targetDbId: prop.relationDatabaseId,
    targetDbMissing,
    query,
  });

  const linkedPages = linkedIds
    .map((id) => pages.find((p) => p.id === id && !p.trashed))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const toggle = (id: string) => {
    onChange(linkedIds.includes(id) ? linkedIds.filter((x) => x !== id) : [...linkedIds, id]);
  };

  if (!targetDbConfigured) {
    return (
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Relation property has no target database configured.
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-auto min-h-[38px] w-full flex-wrap items-center justify-start gap-1 bg-background px-3 py-2 text-left text-sm font-normal hover:bg-accent/50">
          {linkedPages.length === 0 && (
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Link a row…
            </span>
          )}
          {linkedPages.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs">
              <DynamicIcon value={p.icon} className="text-xs" />
              <span className="truncate max-w-[120px]">{p.title || "Untitled"}</span>
            </span>
          ))}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1">
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rows…"
          className="h-7 text-xs mb-1"
        />
        <div className="max-h-60 overflow-y-auto space-y-0.5">
          {candidates.length === 0 && (
            <div className="px-2 py-2 text-xs text-muted-foreground">No matching rows.</div>
          )}
          {candidates.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toggle(p.id)}
              className={cn(
                "h-auto w-full justify-start gap-2 px-2 py-1 text-xs font-normal",
                linkedIds.includes(p.id) && "bg-accent",
              )}
            >
              <DynamicIcon value={p.icon} className="text-xs" />
              <span className="truncate flex-1 text-left">{p.title || "Untitled"}</span>
              {linkedIds.includes(p.id) && <X className="h-3 w-3 text-muted-foreground" />}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
