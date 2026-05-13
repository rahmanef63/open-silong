import { Database as DatabaseIcon } from "lucide-react";
import type { TemplateDb } from "./types";

function formatCell(v: unknown): React.ReactNode {
  if (v === null || v === undefined || v === "") return <span className="text-muted-foreground/40">—</span>;
  if (typeof v === "boolean") return v ? "✓" : "—";
  if (typeof v === "number") return v.toLocaleString();
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return <code className="font-mono text-[10px]">{JSON.stringify(v)}</code>;
  return String(v);
}

export function DatabaseStub({ db, databaseRef }: { db: TemplateDb | undefined; databaseRef?: string }) {
  if (!db) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-2 text-xs text-muted-foreground italic flex items-center gap-2">
        <DatabaseIcon className="h-3.5 w-3.5" />
        Database reference: {databaseRef ?? "?"} (not defined on this page)
      </div>
    );
  }
  const props = db.properties ?? [];
  const rows = db.seedRows ?? [];
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 text-sm bg-muted/30">
        <span className="text-base">{db.icon ?? "📊"}</span>
        <span className="font-medium truncate">{db.name ?? "Database"}</span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {props.length} props · {rows.length} rows
        </span>
      </div>
      {props.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/20">
              <tr>
                {props.map((p, i) => (
                  <th key={i} className="text-left font-medium px-3 py-1.5 border-b border-border whitespace-nowrap">
                    {p.name}
                    <span className="ml-1 text-[10px] uppercase text-muted-foreground/70">{p.type}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row, ri) => (
                <tr key={ri} className="border-b border-border/60">
                  {props.map((p, pi) => {
                    const v = row[p.id ?? p.name];
                    return (
                      <td key={pi} className="px-3 py-1.5 align-top text-muted-foreground">
                        {formatCell(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={props.length}
                    className="px-3 py-3 text-center text-[11px] text-muted-foreground italic"
                  >
                    No seed rows
                  </td>
                </tr>
              )}
              {rows.length > 5 && (
                <tr>
                  <td
                    colSpan={props.length}
                    className="px-3 py-1.5 text-center text-[11px] text-muted-foreground"
                  >
                    +{rows.length - 5} more rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-3 py-3 text-xs text-muted-foreground italic">No properties defined.</div>
      )}
    </div>
  );
}
