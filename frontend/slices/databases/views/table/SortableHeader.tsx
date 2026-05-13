import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { Database, DatabaseViewConfig, Property } from "@/shared/types/domain";
import { PROPERTY_TYPE_ICONS, PROPERTY_TYPE_LABELS } from "../../lib/propertyTypeMeta";
import { ColumnHeaderMenu } from "../../components/ColumnHeaderMenu";

export function SortableHeader({ prop, db, view, index }: { prop: Property; db: Database; view: DatabaseViewConfig; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: prop.id });
  const TypeIcon = PROPERTY_TYPE_ICONS[prop.type];
  const isFrozen = view.frozenPropIds?.includes(prop.id) ?? false;

  return (
    <div
      ref={setNodeRef as any}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-1 border-r border-border px-1 py-1.5 min-w-[160px] flex-1",
        isFrozen && "sticky left-0 z-10 bg-background",
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground/40 hover:text-foreground shrink-0">
        <GripVertical className="h-3 w-3" />
      </button>
      <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label={PROPERTY_TYPE_LABELS[prop.type]} />
      <ColumnHeaderMenu
        db={db}
        view={view}
        prop={prop}
        index={index}
        trigger={
          <button
            className="flex-1 text-left truncate text-xs hover:text-foreground min-w-0"
            title={`${PROPERTY_TYPE_LABELS[prop.type]} — click for options`}
          >
            {prop.name}
            {isFrozen && <span className="ml-1 text-[9px] text-brand/70">📌</span>}
          </button>
        }
      />
    </div>
  );
}
