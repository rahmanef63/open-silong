import { DynamicIcon } from "@/shared/components/icon-picker";
import type { AIRowDraft, DatabaseExportV1 } from "../../lib/serialize";

export function DbPreview({ genDb }: { genDb: DatabaseExportV1 }) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-md bg-muted/50 p-3 text-xs">
      <div className="mb-1 flex items-center gap-1 text-sm font-medium">
        <DynamicIcon value={genDb.database.icon} className="text-base" fallback="🗂️" /> {genDb.database.name}
      </div>
      <div className="text-muted-foreground">
        {genDb.database.properties.length} properties · {genDb.database.views.length} views · {genDb.rows.length} rows
      </div>
      <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
        {genDb.database.properties.slice(0, 12).map((p) => (
          <li key={p.id}>
            · {p.name} <span className="opacity-60">({p.type}{p.type === "formula" && p.formulaExpression ? ` = ${p.formulaExpression}` : ""})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RowsPreview({ genRows }: { genRows: AIRowDraft[] }) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-md bg-muted/50 p-3 text-xs">
      <div className="mb-1 text-sm font-medium">{genRows.length} rows generated</div>
      <ul className="space-y-0.5 text-[11px] text-muted-foreground">
        {genRows.slice(0, 8).map((r, i) => (
          <li key={i} className="flex items-center gap-1">
            · <DynamicIcon value={r.icon} className="text-sm" /> {r.title}
          </li>
        ))}
        {genRows.length > 8 && <li className="opacity-60">… +{genRows.length - 8} more</li>}
      </ul>
    </div>
  );
}
