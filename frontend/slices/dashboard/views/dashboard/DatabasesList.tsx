import { DynamicIcon, DEFAULT_DATABASE_ICON } from "@/shared/components/icon-picker";
import { formatRelTime as relTime } from "@/shared/lib/format";
import type { Database } from "@/shared/types/domain";

export function DatabasesList({ databases }: { databases: Database[] }) {
  return (
    <div className="rounded-lg border border-border divide-y divide-border bg-card">
      {databases
        .slice()
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(db => (
          <div key={db.id} className="flex items-center gap-3 px-4 py-3">
            <DynamicIcon value={db.icon} className="text-lg" fallback={DEFAULT_DATABASE_ICON} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{db.name}</div>
              <div className="text-xs text-muted-foreground">
                {db.rowIds.length} row{db.rowIds.length !== 1 ? "s" : ""} · {db.properties.length} propert{db.properties.length !== 1 ? "ies" : "y"}
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{relTime(db.updatedAt)}</span>
          </div>
        ))}
    </div>
  );
}
