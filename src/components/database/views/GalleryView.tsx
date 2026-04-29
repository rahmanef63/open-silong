import { Database, DatabaseViewConfig, Page } from "@/lib/types";
import { useNavigate } from "react-router-dom";
import { PropertyCell } from "../PropertyCell";

export function GalleryView({ db, rows }: { db: Database; view: DatabaseViewConfig; rows: Page[] }) {
  const navigate = useNavigate();
  const visible = db.properties.filter(p => !p.hidden && p.type !== "text").slice(0, 2);
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3">
      {rows.map(r => (
        <button
          key={r.id}
          onClick={() => navigate(`/p/${r.id}`)}
          className="rounded-lg border border-border bg-card p-3 text-left hover:border-border-strong shadow-soft transition"
        >
          <div className="h-20 w-full rounded-md mb-2" style={{ background: r.cover || "linear-gradient(135deg, hsl(var(--muted)), hsl(var(--accent)))" }} />
          <div className="flex items-center gap-1 text-sm font-medium mb-1">
            <span>{r.icon}</span>
            <span className="truncate">{r.title || "Untitled"}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {visible.map(p => (
              <div key={p.id} onClick={e => e.stopPropagation()}>
                <PropertyCell db={db} prop={p} row={r} compact />
              </div>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
