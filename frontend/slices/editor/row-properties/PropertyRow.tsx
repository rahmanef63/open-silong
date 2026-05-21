import type { Database, Page, Property } from "@/shared/types/domain";
import { useEditorComponents } from "../lib/componentsRegistry";
import { PropertyNameCell } from "./PropertyNameCell";

export function PropertyRow({
  db, prop, row,
}: {
  db: Database;
  prop: Property;
  row: Page;
}) {
  const { PropertyCell } = useEditorComponents();
  return (
    <div className="flex items-start border-b border-border/40 last:border-0 min-h-[32px]">
      <div className="text-xs text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 shrink-0 border-r border-border/40 w-40">
        <PropertyNameCell dbId={db.id} prop={prop} />
      </div>
      <div className="flex-1 min-w-0">
        {PropertyCell ? (
          <PropertyCell db={db} prop={prop} row={row} compact />
        ) : (
          <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
            PropertyCell not registered
          </div>
        )}
      </div>
    </div>
  );
}
