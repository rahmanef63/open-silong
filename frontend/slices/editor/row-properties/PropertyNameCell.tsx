import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { Button } from "@/shared/ui/button";
import type { Property } from "@/shared/types/domain";
import { PROPERTY_TYPE_ICONS } from "@/shared/lib/databases/propertyTypeMeta";

export function PropertyNameCell({ dbId, prop }: { dbId: string; prop: Property }) {
  const { updateProperty, deleteProperty } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(prop.name);
  const Icon = PROPERTY_TYPE_ICONS[prop.type];

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== prop.name) {
      updateProperty(dbId, prop.id, { name: trimmed });
    } else {
      setDraft(prop.name);
    }
  };

  return (
    <div className="flex items-center gap-1 min-w-0 group/name">
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setEditing(false);
              setDraft(prop.name);
            }
          }}
          className="flex-1 min-w-0 bg-background border border-brand rounded px-1 text-xs outline-none"
        />
      ) : (
        <>
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span
            className="truncate flex-1 min-w-0 cursor-default"
            onDoubleClick={() => {
              setDraft(prop.name);
              setEditing(true);
            }}
            title="Double-click to rename"
          >
            {prop.name}
          </span>
          <Button
            variant="ghost"
            onClick={() => deleteProperty(dbId, prop.id)}
            className="h-auto shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/name:opacity-100 [&_svg]:size-3"
            title="Delete property"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}
