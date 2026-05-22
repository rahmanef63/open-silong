import { useEditorAdapter } from "@/slices/editor/lib/useEditorAdapter";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { IconPickerPopover, DynamicIcon, DEFAULT_PAGE_ICON } from "@/shared/components/icon-picker";
import { WikiBadge } from "@/slices/wiki";
import { AddCoverButton } from "@/slices/cover";
import type { Database, Page } from "@/shared/types/domain";

interface Props {
  page: Page;
  fullPageDb: Database | null;
  firstBlockRef: React.MutableRefObject<Map<string, HTMLElement | null>>;
}

export function PageTitle({ page, fullPageDb, firstBlockRef }: Props) {
  const { updatePage, updateDatabase } = useEditorAdapter();
  return (
    <>
      <IconPickerPopover
        value={page.icon}
        onChange={(next) => updatePage(page.id, { icon: next })}
        onClear={() => updatePage(page.id, { icon: DEFAULT_PAGE_ICON })}
      >
        <Button variant="ghost" type="button" className="h-auto rounded-md p-1 text-6xl font-normal leading-none transition" aria-label="Change icon">
          <DynamicIcon value={page.icon} />
        </Button>
      </IconPickerPopover>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        {!page.cover && (
          <AddCoverButton
            onPick={(c) => updatePage(page.id, { cover: c })}
            className="h-auto gap-1 p-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:size-3.5"
          />
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
          <Button variant="ghost" onClick={() => updatePage(page.id, { locked: false })} className="h-auto rounded px-2 py-0.5 text-xs font-normal text-amber-700 hover:bg-amber-500/20 dark:text-amber-400">
            Unlock
          </Button>
        </div>
      )}
    </>
  );
}
