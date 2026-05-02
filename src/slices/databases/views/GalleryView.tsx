import { Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";
import { PropertyCell } from "../PropertyCell";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";
import { cn } from "@/shared/lib/utils";
import { getVisibleProps } from "../lib/visibility";
import { useStore } from "@/shared/lib/store";
import { Plus, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

function pickCover(view: DatabaseViewConfig, db: Database, r: Page): string | undefined {
  const src = view.galleryCoverSource ?? "cover";
  if (src === "none") return undefined;
  if (src === "property" && view.galleryCoverProp) {
    const prop = db.properties.find(p => p.id === view.galleryCoverProp);
    if (!prop) return undefined;
    const raw = r.rowProps?.[prop.id];
    if (prop.type === "files") {
      const arr = (raw as string[]) ?? [];
      return arr[0];
    }
    if (prop.type === "url") {
      return (raw as string) ?? undefined;
    }
  }
  return r.cover ?? undefined;
}

export function GalleryView({ db, view, rows, onOpenRow }: Props) {
  const { addRow, deleteRow } = useStore();
  const size = view.gallerySize ?? "medium";
  const aspect = view.galleryAspect ?? "video";
  const fit = view.galleryCoverFit ?? "cover";

  const gridCols =
    size === "small" ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      : size === "large" ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-2 md:grid-cols-3";

  const aspectClass =
    aspect === "square" ? "aspect-square"
      : aspect === "portrait" ? "aspect-[3/4]"
      : "aspect-video";

  const viewVisible = getVisibleProps(db, view);
  const visibleSet = new Set(viewVisible.map(p => p.id));
  const visible: Property[] = view.galleryCardProps?.length
    ? view.galleryCardProps
        .map(id => db.properties.find(p => p.id === id))
        .filter((p): p is Property => !!p && visibleSet.has(p.id))
    : viewVisible.filter(p => p.type !== "text").slice(0, 2);

  return (
    <div className={cn("grid gap-3 p-3", gridCols)}>
      {rows.length === 0 && (
        <div className="col-span-full py-10 text-center text-sm text-muted-foreground">No rows</div>
      )}
      {rows.map(r => {
        const cover = pickCover(view, db, r);
        return (
          <div
            key={r.id}
            className="relative group rounded-lg border border-border bg-card hover:border-border-strong shadow-soft transition"
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 rounded bg-card/90 backdrop-blur p-1 hover:bg-accent text-muted-foreground" aria-label="Row actions">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onOpenRow(r.id)}>Open</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => deleteRow(db.id, r.id)}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          <button
            onClick={() => onOpenRow(r.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                const delta = e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 1;
                focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", delta as 1 | -1);
              }
            }}
            data-db-nav-item
            className="block w-full rounded-lg p-3 text-left"
          >
            {(view.galleryCoverSource ?? "cover") !== "none" && (
              <div className={cn("w-full rounded-md mb-2 bg-muted overflow-hidden flex items-center justify-center", aspectClass)}>
                {cover ? (
                  cover.startsWith("http") || cover.startsWith("data:") ? (
                    <img src={cover} alt="" className={cn("w-full h-full", fit === "cover" ? "object-cover" : "object-contain")} />
                  ) : (
                    <div className="w-full h-full" style={{ background: cover }} />
                  )
                ) : (
                  <div className="w-full h-full" style={{ background: "linear-gradient(135deg, hsl(var(--muted)), hsl(var(--accent)))" }} />
                )}
              </div>
            )}
            <div className="flex items-center gap-1 text-sm font-medium mb-1">
              <span>{r.icon}</span>
              <span className="truncate">{r.title || "Untitled"}</span>
            </div>
            {visible.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {visible.map(p => (
                  <div key={p.id} onClick={e => e.stopPropagation()}>
                    <PropertyCell db={db} prop={p} row={r} compact />
                  </div>
                ))}
              </div>
            )}
          </button>
          </div>
        );
      })}
      <button
        onClick={async () => {
          const r = await addRow(db.id);
          onOpenRow(r.id);
        }}
        className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-accent hover:border-border-strong transition flex items-center justify-center min-h-[120px]"
      >
        <Plus className="mr-1 h-4 w-4" /> New
      </button>
    </div>
  );
}
