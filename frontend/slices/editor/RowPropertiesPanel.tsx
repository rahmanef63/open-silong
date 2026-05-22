import { useState } from "react";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { useEditorAdapter } from "@/slices/editor/lib/useEditorAdapter";
import { Page } from "@/shared/types/domain";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { Button } from "@/shared/ui/button";
import { PropertyRow } from "./row-properties/PropertyRow";
import { AddPropertyMenu } from "./row-properties/AddPropertyMenu";

/** How many visible properties show in the always-rendered preview strip
 *  before the rest collapse behind the accordion toggle. Notion-style. */
const PREVIEW_COUNT = 4;

export function RowPropertiesPanel({ page }: { page: Page }) {
  const { getDatabase, addProperty } = useEditorAdapter();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  if (!page.rowOfDatabaseId) return null;
  const db = getDatabase(page.rowOfDatabaseId);
  if (!db) {
    // Database is loading or has been deleted. Render a skeleton so the
    // page doesn't appear missing its preview header — the row body
    // (blocks) still renders below.
    return (
      <div className="mb-6 rounded-lg border border-border bg-card overflow-hidden">
        <Skeleton className="h-8 rounded-none border-b border-border/40 bg-muted/30" />
        <Skeleton className="h-8 rounded-none border-b border-border/40 bg-muted/20" />
        <Skeleton className="h-8 rounded-none border-b border-border/40 bg-muted/10" />
        <div className="px-3 py-2 text-xs text-muted-foreground/70 italic">
          Loading database properties…
        </div>
      </div>
    );
  }

  const visibleProps = db.properties.filter((p) => !p.hidden);
  const previewProps = visibleProps.slice(0, PREVIEW_COUNT);
  const restProps = visibleProps.slice(PREVIEW_COUNT);
  const hasRest = restProps.length > 0;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTES.database(db.id))}
          className="h-auto gap-1 px-0 py-0 hover:bg-transparent hover:text-foreground"
        >
          <DynamicIcon value={db.icon} className="text-sm" />
          <span>{db.name || "Untitled database"}</span>
        </Button>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="text-foreground">{page.title || "Untitled"}</span>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {visibleProps.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            No properties. Add one below.
          </div>
        )}

        {previewProps.map((prop) => (
          <PropertyRow key={prop.id} db={db} prop={prop} row={page} />
        ))}

        {hasRest && expanded && restProps.map((prop) => (
          <PropertyRow key={prop.id} db={db} prop={prop} row={page} />
        ))}

        {hasRest && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="h-auto justify-start gap-1.5 rounded-none border-t border-border/40 px-3 py-2 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            {expanded
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Hide" : `Show ${restProps.length} more`} {restProps.length === 1 ? "property" : "properties"}
          </Button>
        )}

        <AddPropertyMenu onAdd={(type) => addProperty(db.id, type)} />
      </div>
    </div>
  );
}
