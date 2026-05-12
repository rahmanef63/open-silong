import { useState } from "react";
import type { Database, Property, PropertyType } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { Trash2 } from "lucide-react";
import { PROPERTY_TYPE_LABELS, PROPERTY_TYPES } from "../lib/propertyTypeMeta";
import { Label } from "./property-config/atoms";
import { NumberConfig } from "./property-config/NumberConfig";
import { RelationConfig } from "./property-config/RelationConfig";
import { RollupConfig } from "./property-config/RollupConfig";
import { ButtonConfig } from "./property-config/ButtonConfig";
import { FormulaConfig, UniqueIdConfig, PlaceConfig, SelectConfig } from "./property-config/misc";

interface Props {
  db: Database;
  prop: Property;
  onClose?: () => void;
  /** When true, hides Delete (e.g. title prop). */
  immutableType?: boolean;
}

/** Reusable property configuration panel.
 *
 *  Drives every per-type config:
 *  - number: format / decimals / currency code
 *  - relation: target db / two-way toggle
 *  - rollup: relation prop / target prop / aggregate
 *  - formula: expression
 *  - select/multi_select/status: option list (stub — option editing
 *    still lives in the cell popover; surfaced here as count + link)
 *  - unique_id: prefix
 *
 *  Used by TableView header dropdown and (future) BoardView group-by
 *  popover and PropertiesMenu sidebar. Single source of truth means
 *  every surface that exposes property config is identical. */
export function PropertyConfigPanel({ db, prop, onClose, immutableType }: Props) {
  const { updateProperty, deleteProperty, databases, setRelationTwoWay } = useStore();
  const [draftName, setDraftName] = useState(prop.name);

  const commitName = () => {
    if (draftName.trim() && draftName.trim() !== prop.name) {
      updateProperty(db.id, prop.id, { name: draftName.trim() });
    } else if (!draftName.trim()) {
      setDraftName(prop.name);
    }
  };

  return (
    <div className="space-y-3 p-3 w-72">
      <div>
        <Label>Name</Label>
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            if (e.key === "Escape") setDraftName(prop.name);
          }}
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {!immutableType && (
        <div>
          <Label>Type</Label>
          <select
            value={prop.type}
            onChange={(e) => updateProperty(db.id, prop.id, { type: e.target.value as PropertyType })}
            className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none"
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      )}

      {prop.type === "number" && <NumberConfig db={db} prop={prop} />}
      {prop.type === "relation" && (
        <RelationConfig
          db={db}
          prop={prop}
          databases={databases}
          setRelationTwoWay={setRelationTwoWay}
          updateProperty={updateProperty}
        />
      )}
      {prop.type === "rollup" && (
        <RollupConfig db={db} prop={prop} databases={databases} updateProperty={updateProperty} />
      )}
      {prop.type === "formula" && <FormulaConfig db={db} prop={prop} updateProperty={updateProperty} />}
      {prop.type === "unique_id" && <UniqueIdConfig db={db} prop={prop} updateProperty={updateProperty} />}
      {prop.type === "button" && <ButtonConfig db={db} prop={prop} updateProperty={updateProperty} />}
      {prop.type === "place" && <PlaceConfig />}
      {(prop.type === "select" || prop.type === "multi_select" || prop.type === "status") && (
        <SelectConfig prop={prop} />
      )}

      <div>
        <Label>Description (optional)</Label>
        <input
          value={prop.description ?? ""}
          onChange={(e) => updateProperty(db.id, prop.id, { description: e.target.value })}
          placeholder="Shown in property panel + form view"
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {!immutableType && (
        <button
          onClick={() => { deleteProperty(db.id, prop.id); onClose?.(); }}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-destructive/40 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3 w-3" /> Delete property
        </button>
      )}
    </div>
  );
}
