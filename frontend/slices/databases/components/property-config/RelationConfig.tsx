import { Check } from "lucide-react";
import type { Database, Property } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import { Switch } from "@/shared/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Label } from "./atoms";

const NO_TARGET = "__no_target__";

export function RelationConfig({ db, prop, databases, setRelationTwoWay, updateProperty }: {
  db: Database;
  prop: Property;
  databases: Database[];
  setRelationTwoWay: (dbId: string, propId: string, on: boolean, name?: string) => Promise<string | undefined>;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => Promise<void> | void;
}) {
  const targetDb = databases.find((d) => d.id === prop.relationDatabaseId);
  const targetMissing = !!prop.relationDatabaseId && !targetDb;
  return (
    <>
      <div>
        <Label>Target database</Label>
        <Select
          value={prop.relationDatabaseId ?? NO_TARGET}
          onValueChange={(v) => {
            const next = v === NO_TARGET ? null : v;
            updateProperty(db.id, prop.id, {
              relationDatabaseId: next,
              relationTwoWay: false,
              relationInversePropertyId: undefined,
            });
          }}
        >
          <SelectTrigger className={cn("mt-1 h-8 text-sm", targetMissing && "border-warning/60")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_TARGET}>All database rows (no target)</SelectItem>
            {databases.filter((d) => d.id !== db.id).map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name || "Untitled database"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {targetMissing && (
          <p className="mt-1 text-[11px] text-warning">
            Target database removed — pick another or clear.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
        <div className="flex flex-col">
          <span className="text-xs font-medium">Two-way relation</span>
          <span className="text-[11px] text-muted-foreground">
            Mirror links on the target database&apos;s inverse property.
          </span>
        </div>
        <Switch
          checked={!!prop.relationTwoWay}
          onCheckedChange={(o) => setRelationTwoWay(db.id, prop.id, o)}
          disabled={!prop.relationDatabaseId || targetMissing}
        />
      </div>
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
