import type { Database, Property } from "@/shared/types/domain";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
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
        <Select
          value={prop.rollupRelationPropertyId ?? undefined}
          onValueChange={(v) => updateProperty(db.id, prop.id, {
            rollupRelationPropertyId: v || null,
            rollupTargetPropertyId: null,
          })}
        >
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue placeholder="Pick a relation…" />
          </SelectTrigger>
          <SelectContent>
            {relationProps.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {relationProps.length === 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Add a relation property to this database first.
          </p>
        )}
      </div>
      {targetDb && (
        <div>
          <Label>Target property ({targetDb.name})</Label>
          <Select
            value={prop.rollupTargetPropertyId ?? undefined}
            onValueChange={(v) => updateProperty(db.id, prop.id, { rollupTargetPropertyId: v || null })}
          >
            <SelectTrigger className="mt-1 h-8 text-sm">
              <SelectValue placeholder="Pick a property…" />
            </SelectTrigger>
            <SelectContent>
              {targetProps.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label>Aggregate</Label>
        <Select
          value={prop.rollupAggregate ?? "count"}
          onValueChange={(v) => updateProperty(db.id, prop.id, {
            rollupAggregate: v as NonNullable<Property["rollupAggregate"]>,
          })}
        >
          <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {AGGREGATES.map((a) => <SelectItem key={a} value={a}>{a.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
