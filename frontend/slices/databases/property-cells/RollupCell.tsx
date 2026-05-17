import { AlertTriangle, Sigma } from "lucide-react";
import type { Database, Page, Property } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { computeRollup } from "../lib/formula";

interface Props {
  db: Database;
  prop: Property;
  row: Page;
  cellClass: string;
}

const AGGREGATE_LABELS: Record<NonNullable<Property["rollupAggregate"]>, string> = {
  count: "Count",
  count_unique: "Count unique",
  values: "Show values",
  sum: "Sum",
  avg: "Average",
  min: "Min",
  max: "Max",
  earliest: "Earliest date",
  latest: "Latest date",
  checked: "Checked count",
  percent_checked: "Percent checked",
};

export function RollupCell({ db, prop, row, cellClass }: Props) {
  const { pages, databases, updateProperty } = useStore();
  const relationProps = db.properties.filter((p) => p.type === "relation");
  // Source-of-truth: id stored on the rollup. If it points at nothing, that's
  // an error state — don't silently fall back to the first relation.
  const configuredRelationId = prop.rollupRelationPropertyId;
  const relationProp = configuredRelationId
    ? relationProps.find((p) => p.id === configuredRelationId)
    : relationProps[0];
  const relationMissing = !!configuredRelationId && !relationProp;

  const linkedIds = relationProp && Array.isArray(row.rowProps?.[relationProp.id]) ? row.rowProps?.[relationProp.id] as string[] : [];
  const linkedPages = linkedIds.map((id) => pages.find((p) => p.id === id)).filter((p): p is Page => !!p && !p.trashed);
  const targetDb = databases.find((d) => d.id === relationProp?.relationDatabaseId) ?? db;
  const targetProps = targetDb.properties.filter((p) => p.type !== "rollup" && p.type !== "formula");
  const configuredTargetId = prop.rollupTargetPropertyId;
  const targetProp = configuredTargetId
    ? targetProps.find((p) => p.id === configuredTargetId)
    : undefined;
  const targetMissing = !!configuredTargetId && !targetProp;

  const aggregate = prop.rollupAggregate ?? "count";
  const errored = relationMissing || targetMissing;
  const value = errored ? "Property removed" : computeRollup(aggregate, linkedPages, targetProp, pages, targetDb);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className={cn(cellClass, "w-full h-auto text-left px-2 py-1 rounded hover:bg-accent/50 flex items-center gap-1 font-normal justify-start [&_svg]:size-3.5")}>
          {errored ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          ) : (
            <Sigma className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className={cn(
            "min-w-0 truncate",
            (!relationProp || errored) && "text-muted-foreground",
          )}>
            {errored ? value : (relationProp ? value : "Pick relation")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <div className="space-y-2">
          {(relationMissing || targetMissing) && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                {relationMissing && "The relation property feeding this rollup was removed. "}
                {targetMissing && "The target property was removed. "}
                Pick a replacement below.
              </span>
            </div>
          )}

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
            {(Object.keys(AGGREGATE_LABELS) as Array<keyof typeof AGGREGATE_LABELS>).map((k) => (
              <option key={k} value={k}>{AGGREGATE_LABELS[k]}</option>
            ))}
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
