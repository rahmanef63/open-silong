import { Database, DatabaseViewConfig, Page } from "@/lib/types";
import { useNavigate } from "react-router-dom";

export function TimelineView({ db, rows }: { db: Database; view: DatabaseViewConfig; rows: Page[] }) {
  const navigate = useNavigate();
  const dateProp = db.properties.find(p => p.type === "date");
  const sorted = [...rows].sort((a, b) => {
    const av = (a.rowProps?.[dateProp?.id ?? ""] as any)?.date ?? "";
    const bv = (b.rowProps?.[dateProp?.id ?? ""] as any)?.date ?? "";
    return av.localeCompare(bv);
  });
  return (
    <div className="p-4">
      <div className="text-xs text-muted-foreground mb-3">Timeline (placeholder visualization)</div>
      <ol className="relative border-l-2 border-border ml-3 space-y-3">
        {sorted.map(r => {
          const date = (r.rowProps?.[dateProp?.id ?? ""] as any)?.date;
          return (
            <li key={r.id} className="ml-4">
              <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-brand" />
              <button onClick={() => navigate(`/p/${r.id}`)} className="flex flex-col text-left rounded-md border border-border bg-card p-2 hover:border-border-strong w-full">
                <div className="text-xs text-muted-foreground">{date ?? "No date"}</div>
                <div className="text-sm font-medium">{r.icon} {r.title || "Untitled"}</div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
