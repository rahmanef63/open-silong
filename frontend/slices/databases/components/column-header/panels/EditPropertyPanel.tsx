/** Edit-property panel router.
 *
 *  Dispatches to a per-PropertyType panel via `PROPERTY_TYPE_PANEL`
 *  registry (`./registry.ts`). The panel never contains a "Type"
 *  select — type changes happen via the top-level "Change type"
 *  submenu so the two surfaces stay decoupled.
 *
 *  Every panel renders inside the Edit-property submenu, so they
 *  share a fixed `w-72` width and `space-y-3 p-3` shell.
 *
 *  Adding a new PropertyType?
 *    1. Drop a renderer in `./<Type>Panel.tsx`.
 *    2. Map it under the type key in `./registry.ts`.
 */

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import type { Database, Property } from "@/shared/types/domain";
import { Label } from "../../property-config/atoms";
import { PROPERTY_TYPE_PANEL } from "./registry";

interface Props {
  db: Database;
  prop: Property;
  onClose?: () => void;
  immutableType?: boolean;
}

export function EditPropertyPanel({ db, prop, onClose, immutableType }: Props) {
  const { updateProperty, deleteProperty } = useStore();
  const [draftName, setDraftName] = useState(prop.name);

  const commitName = () => {
    if (draftName.trim() && draftName.trim() !== prop.name) {
      updateProperty(db.id, prop.id, { name: draftName.trim() });
    } else if (!draftName.trim()) {
      setDraftName(prop.name);
    }
  };

  const TypePanel = PROPERTY_TYPE_PANEL[prop.type];

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

      {TypePanel && <TypePanel db={db} prop={prop} updateProperty={updateProperty} />}

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
