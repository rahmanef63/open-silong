"use client";

/** <NotionProperty /> — single property cell + schema editor.
 *
 *  Two concerns in one primitive (Notion-canonical merge):
 *    1. VALUE edit — modify the row's value for this property
 *    2. SCHEMA edit — modify the property definition itself (name,
 *       type, options) via `onSchemaChange`
 *
 *  Pure / props-driven. For complex per-type editors (select picker,
 *  date picker, relation picker, etc.) consumers usually want the
 *  full `<PropertyCell>` from `@/slices/databases` — this primitive
 *  is intentionally minimal (text + number + checkbox + select-naive)
 *  for portable Notion-like grids in external apps.
 */

import { useState } from "react";
import type { Property, PropertyValue } from "@/shared/types/domain";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { Button } from "@/shared/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface NotionPropertyProps {
  prop: Property;
  value: PropertyValue;
  onChange?: (next: PropertyValue) => void;
  /** Modify the property definition itself (rename / change type / add options). */
  onSchemaChange?: (patch: Partial<Property>) => void;
  /** Drop the property entirely. */
  onSchemaRemove?: () => void;
  readOnly?: boolean;
  className?: string;
  /** Hide the per-cell schema edit affordances (name + remove). */
  hideSchemaControls?: boolean;
}

export function NotionProperty({
  prop, value,
  onChange, onSchemaChange, onSchemaRemove,
  readOnly, className, hideSchemaControls,
}: NotionPropertyProps) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(prop.name);
  const ro = readOnly || !onChange;

  const commitName = () => {
    if (draftName.trim() && draftName.trim() !== prop.name) {
      onSchemaChange?.({ name: draftName.trim() });
    }
    setEditingName(false);
  };

  return (
    <div className={cn("flex items-center gap-2 py-1", className)}>
      <div className="flex w-32 shrink-0 items-center gap-1 text-xs text-muted-foreground">
        {editingName ? (
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setDraftName(prop.name); setEditingName(false); } }}
            className="h-6 border-0 bg-transparent px-1 py-0 text-xs shadow-none focus-visible:ring-0"
          />
        ) : (
          <span className="flex-1 truncate">{prop.name}</span>
        )}
        {!hideSchemaControls && onSchemaChange && !editingName && (
          <Button variant="ghost" size="icon" onClick={() => setEditingName(true)} className="h-4 w-4 text-muted-foreground/60 hover:text-foreground"><Pencil className="h-3 w-3" /></Button>
        )}
        {!hideSchemaControls && onSchemaRemove && (
          <Button variant="ghost" size="icon" onClick={onSchemaRemove} className="h-4 w-4 text-muted-foreground/60 hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
        )}
      </div>
      <div className="flex-1">{renderValue(prop, value, ro, onChange)}</div>
    </div>
  );
}

function renderValue(
  prop: Property,
  value: PropertyValue,
  readOnly: boolean,
  onChange?: (next: PropertyValue) => void,
): React.ReactNode {
  switch (prop.type) {
    case "checkbox":
      return <Checkbox checked={!!value} disabled={readOnly} onCheckedChange={(v) => onChange?.(!!v)} />;
    case "number":
      return (
        <Input
          type="number"
          value={(value as number | null) ?? ""}
          disabled={readOnly}
          onChange={(e) => onChange?.(e.target.value === "" ? null : Number(e.target.value))}
          className="h-7 text-sm"
        />
      );
    case "select":
    case "status": {
      const id = value as string | null;
      const opt = prop.options?.find((o) => o.id === id);
      return (
        <select
          disabled={readOnly}
          value={id ?? ""}
          onChange={(e) => onChange?.(e.target.value || null)}
          className="h-7 w-full rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60"
        >
          <option value="">{opt ? "" : "—"}</option>
          {prop.options?.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      );
    }
    default:
      return (
        <Input
          value={String(value ?? "")}
          disabled={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-7 text-sm"
          type={prop.type === "url" ? "url" : prop.type === "email" ? "email" : "text"}
        />
      );
  }
}
