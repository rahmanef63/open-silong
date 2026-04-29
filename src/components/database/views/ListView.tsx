import { Database, DatabaseViewConfig, Page } from "@/lib/types";
import { useNavigate } from "react-router-dom";
import { PropertyCell } from "../PropertyCell";

export function ListView({ db, rows }: { db: Database; view: DatabaseViewConfig; rows: Page[] }) {
  const navigate = useNavigate();
  const summaryProp = db.properties.find(p => !p.hidden && p.type !== "text");
  return (
    <div className="divide-y divide-border">
      {rows.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">No rows</div>
      )}
      {rows.map(r => (
        <button
          key={r.id}
          onClick={() => navigate(`/p/${r.id}`)}
          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent transition"
        >
          <span className="text-base">{r.icon}</span>
          <span className="flex-1 text-sm truncate">{r.title || "Untitled"}</span>
          {summaryProp && <div onClick={e => e.stopPropagation()}><PropertyCell db={db} prop={summaryProp} row={r} compact /></div>}
        </button>
      ))}
    </div>
  );
}
