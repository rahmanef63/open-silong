import { useState } from "react";
import { useStore, useSnapshotsForPage } from "@/shared/lib/store";
import { History, X, RotateCcw, Eye } from "lucide-react";
import { formatDateTime, formatRelTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Block, PageSnapshot } from "@/shared/types/domain";
import { Button } from "@/shared/ui/button";
import { DynamicIcon } from "@/shared/components/icon-picker";

export function VersionHistory({ pageId, onClose }: { pageId: string; onClose: () => void }) {
  const { restoreSnapshot, getPage } = useStore();
  const page = getPage(pageId);
  const snaps = useSnapshotsForPage(pageId);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = snaps.find(s => s.id === previewId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4" /> Version history
        </div>
        <Button variant="ghost" onClick={onClose} className="h-auto rounded p-1 text-muted-foreground [&_svg]:size-4"><X className="h-4 w-4" /></Button>
      </div>

      <div className="border-b border-border bg-muted/20 px-4 py-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Current</div>
        <div className="text-sm font-medium">{page?.title || "Untitled"}</div>
        <div className="text-xs text-muted-foreground">{page ? formatDateTime(page.updatedAt) : ""}</div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {snaps.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No snapshots yet. Edits will be captured automatically.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {snaps.map(s => (
              <li key={s.id} className={cn("p-3 hover:bg-accent/40 cursor-pointer transition", previewId === s.id && "bg-accent/60")} onClick={() => setPreviewId(s.id)}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium truncate">{s.title || "Untitled"}</div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatRelTime(s.takenAt)}</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand/15 text-[10px]">🦊</span>
                  {s.authorName}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {preview && <PreviewPanel snapshot={preview} onClose={() => setPreviewId(null)} onRestore={() => { restoreSnapshot(preview.id); setPreviewId(null); }} />}
    </div>
  );
}

function PreviewPanel({ snapshot, onClose, onRestore }: { snapshot: PageSnapshot; onClose: () => void; onRestore: () => void }) {
  return (
    <div className="border-t border-border p-3 max-h-[40%] overflow-y-auto bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold flex items-center gap-1"><Eye className="h-3 w-3" /> Preview</div>
        <Button variant="ghost" onClick={onClose} className="h-auto p-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground">Close</Button>
      </div>
      <div className="text-xs text-muted-foreground mb-2">{formatDateTime(snapshot.takenAt)}</div>
      <div className="font-serif text-base font-bold mb-2 flex items-center gap-1.5">
        <DynamicIcon value={snapshot.icon} className="text-base" />
        <span>{snapshot.title || "Untitled"}</span>
      </div>
      <div className="space-y-1 text-xs text-foreground/80 max-h-40 overflow-y-auto">
        {snapshot.blocks.slice(0, 10).map((b: Block) => (
          <div key={b.id} className="truncate">{renderPreview(b)}</div>
        ))}
        {snapshot.blocks.length > 10 && <div className="text-muted-foreground">+ {snapshot.blocks.length - 10} more blocks</div>}
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" className="mt-3 w-full">
            <RotateCcw className="h-3 w-3" /> Restore this version
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              The current page contents will be replaced. The version you're replacing will be saved as a new snapshot you can restore later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function renderPreview(b: Block): string {
  if (b.type === "divider") return "—";
  if (b.type === "todo") return `${b.checked ? "☑" : "☐"} ${b.text}`;
  if (b.type === "h1" || b.type === "h2" || b.type === "h3") return `# ${b.text}`;
  return b.text || "(empty)";
}
