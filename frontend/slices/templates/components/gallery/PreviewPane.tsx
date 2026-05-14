import { ChevronRight, Images as ImagesIcon } from "lucide-react";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/shared/ui/accordion";
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
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-6">
          {selected.images && selected.images.length > 0 && (
            <Accordion type="single" collapsible defaultValue="screenshots" className="border border-border rounded-lg bg-card overflow-hidden">
              <AccordionItem value="screenshots" className="border-b-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <ImagesIcon className="h-4 w-4 text-muted-foreground" />
                    Screenshots
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {selected.images.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selected.images.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-md border border-border overflow-hidden bg-muted/20 hover:border-foreground/40 transition-colors"
                      >
                        <img
                          src={url}
                          alt={`${selected.name} screenshot ${i + 1}`}
                          loading="lazy"
                          className="block w-full h-auto max-h-[420px] object-contain bg-background"
                        />
                      </a>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

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
