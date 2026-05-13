import { ChevronRight, Boxes } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";
import { TemplatePagePreview } from "../TemplatePagePreview";
import { StatsRow, type TemplateMeta } from "./parts";

export function PreviewPane({
  selected, selectedJson, selectedLoading, pending, mobilePreviewOpen, onCancel, onUse,
}: {
  selected: TemplateMeta | null;
  selectedJson: unknown | null;
  selectedLoading: boolean;
  pending: boolean;
  mobilePreviewOpen: boolean;
  onCancel: () => void;
  onUse: () => void;
}) {
  return (
    <aside
      className={cn(
        "md:w-[420px] lg:w-[480px] shrink-0 border-t md:border-t-0 md:border-l border-border bg-card flex flex-col overflow-hidden",
        mobilePreviewOpen ? "flex flex-1 min-h-0" : "hidden md:flex",
      )}
    >
      {!selected ? (
        <div className="flex-1 grid place-items-center text-center p-6 text-muted-foreground">
          <div>
            <Boxes className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <div className="text-sm font-medium">Select a template</div>
            <div className="text-xs mt-1">Click a card to see its full preview.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-start gap-3">
              <div className="text-2xl shrink-0 leading-none mt-0.5">
                <DynamicIcon value={selected.icon} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">{selected.name}</div>
                <div className="text-xs text-muted-foreground truncate">{selected.category}</div>
              </div>
            </div>
            {selected.description && (
              <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {selected.description}
              </div>
            )}
            {selectedJson ? <StatsRow json={selectedJson} /> : null}
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
            {selectedLoading ? (
              <div className="text-sm text-muted-foreground text-center py-6">Loading preview…</div>
            ) : selectedJson ? (
              <TemplatePagePreview json={selectedJson} />
            ) : (
              <div className="text-sm text-muted-foreground text-center py-6">Preview unavailable.</div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-border bg-background shrink-0 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" className="flex-1" onClick={onUse} disabled={pending}>
              {pending ? "Creating…" : (
                <>
                  Use this template
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
