import { Database, DatabaseViewConfig, Page } from "@/lib/types";
import { useNavigate } from "react-router-dom";

export function CalendarView({ db, rows }: { db: Database; view: DatabaseViewConfig; rows: Page[] }) {
  const navigate = useNavigate();
  const dateProp = db.properties.find(p => p.type === "date");
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  const rowsByDate = new Map<string, Page[]>();
  if (dateProp) {
    for (const r of rows) {
      const v = (r.rowProps?.[dateProp.id] as any)?.date;
      if (!v) continue;
      const arr = rowsByDate.get(v) ?? [];
      arr.push(r);
      rowsByDate.set(v, arr);
    }
  }
  return (
    <div className="p-3">
      <div className="text-sm font-semibold mb-2">{first.toLocaleString("default", { month: "long", year: "numeric" })}{!dateProp && <span className="text-xs text-muted-foreground ml-2">(placeholder — add a Date property)</span>}</div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden text-xs">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="bg-muted/40 px-2 py-1 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">{d}</div>
        ))}
        {cells.map((d, i) => {
          const key = d ? `${year}-${String(month+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : `e${i}`;
          const items = d ? (rowsByDate.get(key) ?? []) : [];
          return (
            <div key={key} className="bg-card min-h-20 p-1.5">
              {d && <div className="text-[10px] text-muted-foreground mb-1">{d.getDate()}</div>}
              <div className="space-y-0.5">
                {items.map(r => (
                  <button key={r.id} onClick={() => navigate(`/p/${r.id}`)} className="w-full text-left truncate rounded bg-brand/15 text-brand px-1 py-0.5 hover:bg-brand/25">
                    {r.icon} {r.title || "Untitled"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
