import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { Database, DatabaseViewConfig, Property } from "@/shared/types/domain";
import { PROPERTY_TYPE_ICONS, PROPERTY_TYPE_LABELS } from "../../lib/propertyTypeMeta";
import { ColumnHeaderMenu } from "../../components/ColumnHeaderMenu";
import { Button } from "@/shared/ui/button";

export function SortableHeader({
  prop, db, view, index, writeView,
}: {
  prop: Property;
  db: Database;
  view: DatabaseViewConfig;
  index: number;
  writeView?: (viewId: string, patch: Partial<DatabaseViewConfig>) => void;
}) {
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
      <Button variant="ghost" {...attributes} {...listeners} className="h-auto shrink-0 cursor-grab p-0 text-muted-foreground/40 hover:bg-transparent hover:text-foreground [&_svg]:size-3">
        <GripVertical className="h-3 w-3" />
      </Button>
      <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label={PROPERTY_TYPE_LABELS[prop.type]} />
      <ColumnHeaderMenu
        db={db}
        view={view}
        prop={prop}
        index={index}
        writeView={writeView}
        trigger={
          <Button
            variant="ghost"
            className="h-auto min-w-0 flex-1 justify-start truncate p-0 text-left text-xs font-normal hover:bg-transparent hover:text-foreground"
            title={`${PROPERTY_TYPE_LABELS[prop.type]} — click for options`}
          >
            {prop.name}
            {isFrozen && <span className="ml-1 text-[9px] text-brand/70">📌</span>}
          </Button>
        }
      />
    </div>
  );
}
