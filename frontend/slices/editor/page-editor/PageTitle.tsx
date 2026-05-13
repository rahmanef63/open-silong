import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { IconPickerPopover, DynamicIcon, DEFAULT_PAGE_ICON } from "@/shared/components/icon-picker";
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
  const [iconPick, setIconPick] = useState(false);
  return (
    <>
      <IconPickerPopover
        value={page.icon}
        onChange={(next) => { updatePage(page.id, { icon: next }); setIconPick(false); }}
        onClear={() => { updatePage(page.id, { icon: DEFAULT_PAGE_ICON }); setIconPick(false); }}
        open={iconPick}
        onOpenChange={setIconPick}
      >
        <button type="button" className="text-6xl leading-none hover:bg-accent rounded-md p-1 transition" aria-label="Change icon">
          <DynamicIcon value={page.icon} />
        </button>
      </IconPickerPopover>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        {!page.cover && (
          <button onClick={() => updatePage(page.id, { cover: COVERS[Math.floor(Math.random() * COVERS.length)] })} className="flex items-center gap-1 hover:text-foreground transition">
            <ImagePlus className="h-3.5 w-3.5" /> Add cover
          </button>
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
          <button onClick={() => updatePage(page.id, { locked: false })} className="rounded px-2 py-0.5 hover:bg-amber-500/20">
            Unlock
          </button>
        </div>
      )}
    </>
  );
}
