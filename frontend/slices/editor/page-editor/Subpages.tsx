import * as React from "react";
import { FileText, Plus } from "lucide-react";
import { useNavigate } from "@/shared/lib/router";
import { useEditorAdapter } from "@/slices/editor/lib/useEditorAdapter";
import { Button } from "@/shared/ui/button";
import { DynamicIcon } from "@/shared/components/icon-picker";
import type { Page } from "@/shared/types/domain";

export const Subpages = React.memo(SubpagesImpl, (a, b) =>
  a.page.id === b.page.id &&
  a.subpages.length === b.subpages.length &&
  a.subpages.every((sp, i) => sp.id === b.subpages[i].id && sp.title === b.subpages[i].title && sp.icon === b.subpages[i].icon),
);

function SubpagesImpl({ page, subpages }: { page: Page; subpages: Page[] }) {
  const navigate = useNavigate();
  const { createPage } = useEditorAdapter();
  return (
    <section className="mt-12 border-t border-border pt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Pages inside</h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs"
          onClick={async () => { const c = await createPage(page.id); navigate(`/p/${c.id}`); }}
        >
          <Plus className="h-3 w-3 mr-1" /> Add subpage
        </Button>
      </div>
      {subpages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No pages inside yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {subpages.map((sp) => (
            <Button
              variant="outline"
              key={sp.id}
              onClick={() => navigate(`/p/${sp.id}`)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-page-id", sp.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              title="Drag to sidebar to re-parent"
              className="h-auto cursor-grab justify-start gap-2 rounded-md bg-card px-3 py-2 text-left font-normal transition hover:border-border-strong active:cursor-grabbing [&_svg]:size-3.5"
            >
              <DynamicIcon value={sp.icon} className="text-base" />
              <span className="flex-1 truncate text-sm">{sp.title || "Untitled"}</span>
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
