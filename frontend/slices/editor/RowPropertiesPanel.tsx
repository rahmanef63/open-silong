import { useState } from "react";
import { useStore } from "@/shared/lib/store";
import { Page, Property, PropertyType } from "@/shared/types/domain";
import { PropertyCell } from "@/slices/databases/PropertyCell";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { PROPERTY_TYPE_ICONS, PROPERTY_TYPE_LABELS } from "@/slices/databases/lib/propertyTypeMeta";
import { cn } from "@/shared/lib/utils";
import { Plus, ChevronRight, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const PROP_TYPE_ICON = PROPERTY_TYPE_ICONS;

function PropertyNameCell({
  dbId,
  prop,
}: {
  dbId: string;
  prop: Property;
}) {
  const { updateProperty, deleteProperty } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(prop.name);
  const Icon = PROP_TYPE_ICON[prop.type];

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
            title={`Double-click to rename`}
          >
            {prop.name}
          </span>
          <button
            onClick={() => deleteProperty(dbId, prop.id)}
            className="opacity-0 group-hover/name:opacity-100 transition-opacity rounded p-0.5 hover:bg-accent hover:text-destructive text-muted-foreground shrink-0"
            title="Delete property"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}

export function RowPropertiesPanel({ page }: { page: Page }) {
  const { getDatabase, addProperty, pages } = useStore();
  const [addOpen, setAddOpen] = useState(false);

  if (!page.rowOfDatabaseId) return null;
  const db = getDatabase(page.rowOfDatabaseId);
  if (!db) return null;

  const visibleProps = db.properties.filter((p) => !p.hidden);

  // Find parent database page for breadcrumb navigation
  const dbPage = pages.find(
    (p) => !p.trashed && p.databaseHostFor?.includes(page.rowOfDatabaseId!),
  );

  return (
    <div className="mb-6">
      {/* Back to database breadcrumb */}
      {dbPage && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <DynamicIcon value={dbPage.icon} className="text-sm" />
            <span>{dbPage.title || "Untitled"}</span>
          </button>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-foreground">{page.title || "Untitled"}</span>
        </div>
      )}

      {/* Properties panel */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {visibleProps.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            No properties. Add one below.
          </div>
        )}

        {visibleProps.map((prop) => (
          <div
            key={prop.id}
            className="flex items-start border-b border-border/40 last:border-0 min-h-[32px]"
          >
            {/* Left: property name column */}
            <div
              className={cn(
                "text-xs text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 shrink-0 border-r border-border/40",
                "w-40"
              )}
            >
              <PropertyNameCell dbId={db.id} prop={prop} />
            </div>

            {/* Right: property value column */}
            <div className="flex-1 min-w-0">
              <PropertyCell db={db} prop={prop} row={page} compact />
            </div>
          </div>
        ))}

        {/* Add property footer */}
        <div className="border-t border-border/40">
          <DropdownMenu open={addOpen} onOpenChange={setAddOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2 w-full transition-colors">
                <Plus className="h-3.5 w-3.5" />
                Add property
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map(
                (type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => {
                      addProperty(db.id, type);
                      setAddOpen(false);
                    }}
                  >
                    {(() => {
                      const Icon = PROP_TYPE_ICON[type];
                      return <Icon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />;
                    })()}
                    {PROPERTY_TYPE_LABELS[type]}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
