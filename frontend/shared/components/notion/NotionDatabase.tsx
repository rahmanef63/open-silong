"use client";

/** <NotionDatabase /> — minimal database surface with per-row + per-
 *  property CRUD callbacks. Renders a Notion-canonical table view by
 *  default (other view types should consume `@/slices/databases`
 *  directly — that slice owns the full view registry + filter/sort UI).
 *
 *  Pure / callback-based. Hand it `db` + `rows` data + handlers; it
 *  emits CRUD intents only. Drop it in any standalone embed.
 */

import { Database, Page, Property, PropertyValue, PropertyType } from "@/shared/types/domain";
import { Button } from "@/shared/ui/button";
import { NotionProperty } from "./NotionProperty";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface NotionDatabaseProps {
  db: Database;
  rows: Page[];
  onPropertyAdd?: (type: PropertyType) => void;
  onPropertyUpdate?: (propId: string, patch: Partial<Property>) => void;
  onPropertyRemove?: (propId: string) => void;
  onRowAdd?: () => void;
  onRowUpdate?: (rowId: string, propId: string, value: PropertyValue) => void;
  onRowRemove?: (rowId: string) => void;
  readOnly?: boolean;
  className?: string;
}

const DEFAULT_NEW_PROP_TYPE: PropertyType = "text";

export function NotionDatabase({
  db, rows,
  onPropertyAdd, onPropertyUpdate, onPropertyRemove,
  onRowAdd, onRowUpdate, onRowRemove,
  readOnly, className,
}: NotionDatabaseProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold">{db.name}</h3>
        <span className="text-[10px] text-muted-foreground">{rows.length} row{rows.length === 1 ? "" : "s"}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
            <tr>
              {db.properties.map((p) => (
                <th key={p.id} className="px-3 py-1.5 font-normal">
                  <div className="flex items-center gap-1">
                    <span className="truncate">{p.name}</span>
                    {!readOnly && onPropertyRemove && (
                      <Button variant="ghost" size="icon" onClick={() => onPropertyRemove(p.id)} className="h-4 w-4 text-muted-foreground/40 hover:text-destructive" title="Remove property"><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                </th>
              ))}
              {!readOnly && onPropertyAdd && (
                <th className="px-3 py-1.5 font-normal">
                  <Button variant="ghost" size="sm" onClick={() => onPropertyAdd(DEFAULT_NEW_PROP_TYPE)} className="h-auto gap-1 px-2 py-1 text-xs font-normal text-muted-foreground">
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="group border-b border-border/60 hover:bg-accent/30">
                {db.properties.map((p) => (
                  <td key={p.id} className="px-3 py-1.5">
                    <NotionProperty
                      prop={p}
                      value={(r.rowProps?.[p.id] as PropertyValue) ?? null}
                      onChange={readOnly ? undefined : (v) => onRowUpdate?.(r.id, p.id, v)}
                      hideSchemaControls
                    />
                  </td>
                ))}
                {!readOnly && onRowRemove && (
                  <td className="px-2">
                    <Button aria-label="Delete row" variant="ghost" size="icon" onClick={() => onRowRemove(r.id)} className="h-5 w-5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={db.properties.length + 1} className="px-3 py-4 text-center text-xs text-muted-foreground italic">No rows yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {!readOnly && onRowAdd && (
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" onClick={onRowAdd} className="h-auto w-full justify-start gap-1 px-2 py-1 text-xs font-normal text-muted-foreground hover:text-foreground">
            <Plus className="h-3 w-3" /> Add row
          </Button>
        </div>
      )}
    </div>
  );
}
