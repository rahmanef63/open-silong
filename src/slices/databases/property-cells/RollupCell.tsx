import { Sigma } from "lucide-react";
import type { Database, Page, Property } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/ui/popover";
import { computeRollup } from "../lib/formula";

interface Props {
  db: Database;
  prop: Property;
  row: Page;
  cellClass: string;
}

export function RollupCell({ db, prop, row, cellClass }: Props) {
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
