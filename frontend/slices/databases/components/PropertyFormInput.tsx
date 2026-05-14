import type { ReactNode } from "react";
import type { Property, PropertyType, PropertyValue } from "@/shared/types/domain";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import { colorClass } from "@/shared/lib/format";
import { X } from "lucide-react";
import { DatePicker } from "../property-cell/date-cell/DatePicker";

/** Property types that can't be edited from a form (computed / system fields). */
export const READ_ONLY_PROPERTY_TYPES: PropertyType[] = [
  "rollup", "formula", "created_time", "created_by",
  "last_edited_time", "last_edited_by", "unique_id",
];
/** Property types that don't yet have a form-friendly editor. */
export const UNSUPPORTED_FORM_TYPES: PropertyType[] = ["relation", "files", "verification"];

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
            <button type="button" className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent/50">
              {opt ? (
                <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(opt.color))}>{opt.name}</span>
              ) : (
                <span className="text-muted-foreground">Select…</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1">
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {prop.options?.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onChange(o.id === selectedId ? null : o.id)}
                  className={cn("flex w-full items-center justify-between px-2 py-1 rounded hover:bg-accent text-xs", o.id === selectedId && "bg-accent")}
                >
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5", colorClass(o.color))}>{o.name}</span>
                </button>
              ))}
              {selectedId && (
                <button type="button" onClick={() => onChange(null)} className="flex w-full items-center px-2 py-1 rounded hover:bg-accent text-xs text-muted-foreground">
                  <X className="mr-1 h-3 w-3" /> Clear
                </button>
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
            <button type="button" className="w-full min-h-[38px] rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent/50 flex flex-wrap gap-1">
              {ids.length === 0 && <span className="text-muted-foreground">Select…</span>}
              {prop.options?.filter(o => ids.includes(o.id)).map(o => (
                <span key={o.id} className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(o.color))}>{o.name}</span>
              ))}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1">
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {prop.options?.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  className={cn("flex w-full items-center justify-between px-2 py-1 rounded hover:bg-accent text-xs", ids.includes(o.id) && "bg-accent")}
                >
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5", colorClass(o.color))}>{o.name}</span>
                </button>
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
    default:
      return <Input value={String(value ?? "")} onChange={e => onChange(e.target.value)} />;
  }
}
