import { Check } from "lucide-react";
import type { Database, Property } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import { Label } from "./atoms";

export function RelationConfig({ db, prop, databases, setRelationTwoWay, updateProperty }: {
  db: Database;
  prop: Property;
  databases: Database[];
  setRelationTwoWay: (dbId: string, propId: string, on: boolean, name?: string) => string | undefined;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
}) {
  const targetDb = databases.find((d) => d.id === prop.relationDatabaseId);
  const targetMissing = !!prop.relationDatabaseId && !targetDb;
  return (
    <>
      <div>
        <Label>Target database</Label>
        <select
          value={prop.relationDatabaseId ?? ""}
          onChange={(e) => {
            const next = e.target.value || null;
            updateProperty(db.id, prop.id, {
              relationDatabaseId: next,
              relationTwoWay: false,
              relationInversePropertyId: undefined,
            });
          }}
          className={cn(
            "mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none",
            targetMissing && "border-amber-500/60",
          )}
        >
          <option value="">All database rows (no target)</option>
          {databases.filter((d) => d.id !== db.id).map((d) => (
            <option key={d.id} value={d.id}>{d.name || "Untitled database"}</option>
          ))}
        </select>
        {targetMissing && (
          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
            Target database removed — pick another or clear.
          </p>
        )}
      </div>
      <label className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
        <div className="flex flex-col">
          <span className="text-xs font-medium">Two-way relation</span>
          <span className="text-[11px] text-muted-foreground">
            Mirror links on the target database&apos;s inverse property.
          </span>
        </div>
        <input
          type="checkbox"
          checked={!!prop.relationTwoWay}
          onChange={(e) => setRelationTwoWay(db.id, prop.id, e.target.checked)}
          disabled={!prop.relationDatabaseId || targetMissing}
          className="h-4 w-4"
        />
      </label>
      {prop.relationTwoWay && targetDb && (
        <div className="rounded-md border border-brand/30 bg-brand/5 p-2 text-[11px]">
          <Check className="mr-1 inline h-3 w-3 text-brand" />
          Inverse property created on <span className="font-medium">{targetDb.name}</span>.
          Adds/removes mirror automatically.
        </div>
      )}
    </>
  );
}
