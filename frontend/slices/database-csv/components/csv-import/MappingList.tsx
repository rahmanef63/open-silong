import { Plus } from "lucide-react";
import { PROPERTY_TYPE_LABELS } from "@/slices/databases";
import type { Database } from "@/shared/types/domain";
import type { ParsedCsv } from "../../lib/csv";
import { COMPUTED_TYPES, NEW_PREFIX, NEW_TYPES, SKIP, TITLE } from "./constants";

export function MappingList({
  parsed, mapping, onChange, db,
}: {
  parsed: ParsedCsv;
  mapping: Record<number, string>;
  onChange: (next: Record<number, string>) => void;
  db: Database;
}) {
  return (
    <div className="space-y-2 max-h-[420px] overflow-y-auto">
      <div className="text-xs text-muted-foreground">
        Detected {parsed.headers.length} columns × {parsed.rows.length} rows.
      </div>
      {parsed.headers.map((h, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="flex-1 truncate font-medium">{h || `Column ${i + 1}`}</span>
          <span className="text-muted-foreground">→</span>
          <select
            value={mapping[i] ?? SKIP}
            onChange={(e) => onChange({ ...mapping, [i]: e.target.value })}
            className="bg-background border border-border rounded px-2 py-1 text-xs min-w-48"
          >
            <option value={SKIP}>(skip)</option>
            <option value={TITLE}>Title</option>
            <optgroup label="Existing properties">
              {db.properties.map((p) => {
                const computed = COMPUTED_TYPES.includes(p.type) || p.type === "person" || p.type === "files";
                return (
                  <option key={p.id} value={p.id} disabled={computed}>
                    {p.name} · {p.type}{computed ? " (read-only)" : ""}
                  </option>
                );
              })}
            </optgroup>
            <optgroup label="+ Create new property">
              {NEW_TYPES.map((t) => (
                <option key={t} value={`${NEW_PREFIX}${t}`}>+ New · {PROPERTY_TYPE_LABELS[t]}</option>
              ))}
            </optgroup>
          </select>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground pt-2">
        <Plus className="h-3 w-3 inline -mt-0.5" /> Relation matches by row title. Rollup, Formula, and
        system fields (Created/Last edited/Unique ID) are computed and aren't writable from CSV.
      </p>
    </div>
  );
}
