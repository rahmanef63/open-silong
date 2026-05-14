import { ChevronRight } from "lucide-react";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";
import { TemplatePagePreview } from "../TemplatePagePreview";
import { StatsRow, type TemplateMeta } from "./parts";

export function PreviewPane({
  selected, selectedJson, selectedLoading, pending, onCancel, onUse,
}: {
  selected: TemplateMeta;
  selectedJson: unknown | null;
  selectedLoading: boolean;
  pending: boolean;
  onCancel: () => void;
  onUse: () => void;
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="max-w-5xl mx-auto flex items-start gap-4">
          <div className="text-4xl shrink-0 leading-none">
            <DynamicIcon value={selected.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-lg truncate">{selected.name}</div>
            <div className="text-xs text-muted-foreground truncate">{selected.category}</div>
            {selected.description && (
              <div className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                {selected.description}
              </div>
            )}
            {selectedJson ? <StatsRow json={selectedJson} /> : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onCancel}>Back</Button>
            <Button size="sm" onClick={onUse} disabled={pending}>
              {pending ? "Creating…" : (
                <>
                  Use this template
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {selectedLoading ? (
            <div className="text-sm text-muted-foreground text-center py-12">Loading preview…</div>
          ) : selectedJson ? (
            <TemplatePagePreview json={selectedJson} />
          ) : (
            <div className="text-sm text-muted-foreground text-center py-12">Preview unavailable.</div>
          )}
        </div>
      </div>
    </div>
  );
}
