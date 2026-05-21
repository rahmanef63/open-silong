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
import { useDbAdapter } from "../../../lib/useDbAdapter";
import type { Database, Property } from "@/shared/types/domain";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Label } from "../../property-config/atoms";
import { PROPERTY_TYPE_PANEL } from "./registry";

interface Props {
  db: Database;
  prop: Property;
  onClose?: () => void;
  immutableType?: boolean;
}

export function EditPropertyPanel({ db, prop, onClose, immutableType }: Props) {
  const { updateProperty, deleteProperty } = useDbAdapter();
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
        <Input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            if (e.key === "Escape") setDraftName(prop.name);
          }}
          className="mt-1 h-8 text-sm"
        />
      </div>

      {TypePanel && <TypePanel db={db} prop={prop} updateProperty={updateProperty} />}

      <div>
        <Label>Description (optional)</Label>
        <Input
          value={prop.description ?? ""}
          onChange={(e) => updateProperty(db.id, prop.id, { description: e.target.value })}
          placeholder="Shown in property panel + form view"
          className="mt-1 h-8 text-sm"
        />
      </div>

      {!immutableType && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => { deleteProperty(db.id, prop.id); onClose?.(); }}
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" /> Delete property
        </Button>
      )}
    </div>
  );
}
