import { ImagePlus } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { IconPickerPopover, DynamicIcon, DEFAULT_PAGE_ICON } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";
import { WikiBadge } from "@/slices/wiki";
import type { Database, Page } from "@/shared/types/domain";
import { COVERS } from "../lib/covers";

interface Props {
  page: Page;
  fullPageDb: Database | null;
  firstBlockRef: React.MutableRefObject<Map<string, HTMLElement | null>>;
}

export function PageTitle({ page, fullPageDb, firstBlockRef }: Props) {
  const { updatePage, updateDatabase } = useStore();
  return (
    <>
      <IconPickerPopover
        value={page.icon}
        onChange={(next) => updatePage(page.id, { icon: next })}
        onClear={() => updatePage(page.id, { icon: DEFAULT_PAGE_ICON })}
      >
        <Button type="button" variant="ghost" className="h-auto text-6xl leading-none rounded-md p-1 font-normal" aria-label="Change icon">
          <DynamicIcon value={page.icon} />
        </Button>
      </IconPickerPopover>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        {!page.cover && (
          <Button variant="ghost" onClick={() => updatePage(page.id, { cover: COVERS[Math.floor(Math.random() * COVERS.length)] })} className="h-auto p-0 gap-1 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:size-3.5">
            <ImagePlus className="h-3.5 w-3.5" /> Add cover
          </Button>
        )}
      </div>

      <input
        value={fullPageDb ? fullPageDb.name : page.title}
        readOnly={page.locked}
        onChange={(e) => {
          if (fullPageDb) {
            updateDatabase(fullPageDb.id, { name: e.target.value });
            updatePage(page.id, { title: e.target.value });
          } else {
            updatePage(page.id, { title: e.target.value });
          }
        }}
        placeholder={fullPageDb ? "Untitled database" : "Untitled"}
        className={cn(
          "mt-3 w-full bg-transparent text-4xl md:text-5xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40",
          page.font === "mono" ? "font-mono" : "font-serif",
        )}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "ArrowDown") {
            e.preventDefault();
            firstBlockRef.current.get(page.blocks[0]?.id ?? "")?.focus();
          }
        }}
      />

      <WikiBadge pageId={page.id} />

      {page.locked && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
          <span>🔒</span>
          <span className="flex-1">Page is locked. Editing is disabled.</span>
          <Button variant="ghost" onClick={() => updatePage(page.id, { locked: false })} className="h-auto rounded px-2 py-0.5 text-xs font-normal text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 hover:text-amber-700">
            Unlock
          </Button>
        </div>
      )}
    </>
  );
}
