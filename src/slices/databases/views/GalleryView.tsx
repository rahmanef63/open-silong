import { Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";
import { PropertyCell } from "../PropertyCell";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";
import { cn } from "@/shared/lib/utils";

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

  const visible: Property[] = view.galleryCardProps?.length
    ? view.galleryCardProps
        .map(id => db.properties.find(p => p.id === id))
        .filter((p): p is Property => !!p && !p.hidden)
    : db.properties.filter(p => !p.hidden && p.type !== "text").slice(0, 2);

  return (
    <div className={cn("grid gap-3 p-3", gridCols)}>
      {rows.length === 0 && (
        <div className="col-span-full py-10 text-center text-sm text-muted-foreground">No rows</div>
      )}
      {rows.map(r => {
        const cover = pickCover(view, db, r);
        return (
          <button
            key={r.id}
            onClick={() => onOpenRow(r.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                const delta = e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 1;
                focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", delta as 1 | -1);
              }
            }}
            data-db-nav-item
            className="rounded-lg border border-border bg-card p-3 text-left hover:border-border-strong shadow-soft transition"
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
        );
      })}
    </div>
  );
}
