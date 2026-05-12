import type { Database, Property } from "@/shared/types/domain";
import { Label } from "./atoms";

const AGGREGATES: NonNullable<Property["rollupAggregate"]>[] = [
  "count", "count_unique", "values", "sum", "avg", "min", "max",
  "earliest", "latest", "checked", "percent_checked",
];

export function RollupConfig({ db, prop, databases, updateProperty }: {
  db: Database;
  prop: Property;
  databases: Database[];
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
}) {
  const relationProps = db.properties.filter((p) => p.type === "relation");
  const relProp = relationProps.find((p) => p.id === prop.rollupRelationPropertyId);
  const targetDb = relProp?.relationDatabaseId
    ? databases.find((d) => d.id === relProp.relationDatabaseId)
    : null;
  const targetProps = targetDb?.properties ?? [];
  return (
    <>
      <div>
        <Label>Relation property (this db)</Label>
        <select
          value={prop.rollupRelationPropertyId ?? ""}
          onChange={(e) => updateProperty(db.id, prop.id, {
            rollupRelationPropertyId: e.target.value || null,
            rollupTargetPropertyId: null,
          })}
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none"
        >
          <option value="">Pick a relation…</option>
          {relationProps.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {relationProps.length === 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Add a relation property to this database first.
          </p>
        )}
      </div>
      {targetDb && (
        <div>
          <Label>Target property ({targetDb.name})</Label>
          <select
            value={prop.rollupTargetPropertyId ?? ""}
            onChange={(e) => updateProperty(db.id, prop.id, { rollupTargetPropertyId: e.target.value || null })}
            className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none"
          >
            <option value="">Pick a property…</option>
            {targetProps.map((p) => (
              <option key={p.id} value={p.id}>{p.name} <span className="text-muted-foreground">({p.type})</span></option>
            ))}
          </select>
        </div>
      )}
      <div>
        <Label>Aggregate</Label>
        <select
          value={prop.rollupAggregate ?? "count"}
          onChange={(e) => updateProperty(db.id, prop.id, {
            rollupAggregate: e.target.value as NonNullable<Property["rollupAggregate"]>,
          })}
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none"
        >
          {AGGREGATES.map((a) => <option key={a} value={a}>{a.replace("_", " ")}</option>)}
        </select>
      </div>
    </>
  );
}
