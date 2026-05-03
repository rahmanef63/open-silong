import { getErrorMessage } from "@/shared/lib/error";
import { useState } from "react";
import { Upload, AlertCircle, Check, Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { useStore } from "@/shared/lib/store";
import { parseCsv, valueFromString, type ParsedCsv } from "../lib/csv";
import type { Database, Property, PropertyType, SelectOption } from "@/shared/types/domain";
import { PROPERTY_TYPE_LABELS } from "@/slices/databases/DatabaseBlock";

const uid = () => Math.random().toString(36).slice(2, 10);
const OPTION_COLORS = ["default", "gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];

interface Props {
  db: Database;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SKIP = "__skip__";
const TITLE = "__title__";
const NEW_PREFIX = "__new:";

/** Types that can be created fresh from a CSV column. Excludes computed
 *  fields (rollup, formula, created_time, created_by, last_edited_time,
 *  last_edited_by, unique_id) and types whose values can't come from raw
 *  CSV strings (person, files — those need real ids). */
const NEW_TYPES: PropertyType[] = [
  "text", "number", "select", "multi_select", "status", "date",
  "checkbox", "url", "email", "phone", "relation",
];

const COMPUTED_TYPES: PropertyType[] = [
  "rollup", "formula", "created_time", "created_by",
  "last_edited_time", "last_edited_by", "unique_id",
];

export function CsvImportDialog({ db, open, onOpenChange }: Props) {
  const { addRow, setRowValue, updatePage, updateDatabase, pages } = useStore();
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setParsed(null); setMapping({}); setImporting(false); setImported(null); setError(null); };

  const onFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const csv = parseCsv(text);
      if (csv.headers.length === 0) {
        setError("CSV is empty.");
        return;
      }
      setParsed(csv);
      const initial: Record<number, string> = {};
      csv.headers.forEach((h, i) => {
        const lower = h.toLowerCase().trim();
        if (lower === "title" || lower === "name" || (i === 0 && !mapping[0])) {
          initial[i] = TITLE;
          return;
        }
        const matched = db.properties.find((p) => p.name.toLowerCase() === lower);
        initial[i] = matched ? matched.id : SKIP;
      });
      setMapping(initial);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to parse CSV"));
    }
  };

  /** For "create new" mappings — collect option names per column so we can
   *  seed select/multi_select/status options before importing values. */
  const collectNewOptionNames = (colIdx: number, type: PropertyType): string[] => {
    if (!parsed) return [];
    if (type !== "select" && type !== "multi_select" && type !== "status") return [];
    // Case-insensitive dedupe; preserve first-seen casing.
    const seen = new Map<string, string>();
    const add = (n: string) => {
      const lc = n.toLowerCase();
      if (!seen.has(lc)) seen.set(lc, n);
    };
    for (const row of parsed.rows) {
      const raw = (row[colIdx] ?? "").trim();
      if (!raw) continue;
      if (type === "multi_select") {
        raw.split(/[;,]/).map((s) => s.trim()).filter(Boolean).forEach(add);
      } else {
        add(raw);
      }
    }
    return [...seen.values()];
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import CSV → {db.name}</DialogTitle>
          <DialogDescription>
            Map each CSV column to an existing property, skip it, or create a new property.
          </DialogDescription>
        </DialogHeader>

        {!parsed && (
          <label className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-8 cursor-pointer hover:bg-accent/30 transition">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm">Click to choose .csv file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
          </label>
        )}

        {parsed && imported === null && (
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
                  onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value }))}
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
        )}

        {imported !== null && (
          <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 text-center text-sm">
            <Check className="mx-auto h-6 w-6 text-green-600 mb-2" />
            Imported {imported} row{imported === 1 ? "" : "s"} into {db.name}.
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          {parsed && imported === null && (
            <Button onClick={async () => {
              if (!parsed) return;
              setImporting(true);
              setError(null);
              try {
                // 1) Build all "+ Create new" properties LOCALLY, then commit them
                //    in a single updateDatabase call. Calling addProperty in a loop
                //    races on the React-state baseline (each call sees the same
                //    stale db.properties → last write wins → only one prop survives).
                const resolved: Record<number, string> = { ...mapping };
                const createdProps = new Map<string, Property>();
                const newProps: Property[] = [];
                for (let i = 0; i < parsed.headers.length; i++) {
                  const target = resolved[i];
                  if (!target?.startsWith(NEW_PREFIX)) continue;
                  const type = target.slice(NEW_PREFIX.length) as PropertyType;
                  const name = parsed.headers[i] || `Column ${i + 1}`;
                  const propId = uid();

                  let options: SelectOption[] | undefined;
                  if (type === "select" || type === "multi_select" || type === "status") {
                    const optionNames = collectNewOptionNames(i, type);
                    options = optionNames.map((n, idx) => ({
                      id: `${propId}_opt_${idx}`,
                      name: n,
                      color: OPTION_COLORS[idx % OPTION_COLORS.length],
                    }));
                  }

                  const prop: Property = { id: propId, name, type, options };
                  newProps.push(prop);
                  createdProps.set(propId, prop);
                  resolved[i] = propId;
                }

                if (newProps.length > 0) {
                  await updateDatabase(db.id, { properties: [...db.properties, ...newProps] });
                }

                const propLookup = (id: string) =>
                  db.properties.find((p) => p.id === id) ?? createdProps.get(id);

                let count = 0;
                for (const row of parsed.rows) {
                  if (row.every((c) => c.trim() === "")) continue;
                  const newRow = await addRow(db.id);
                  let title = "";
                  for (let i = 0; i < parsed.headers.length; i++) {
                    const target = resolved[i];
                    if (!target || target === SKIP) continue;
                    const raw = row[i] ?? "";
                    if (target === TITLE) { title = raw.trim(); continue; }
                    const prop = propLookup(target);
                    if (!prop) continue;
                    const value = valueFromString(raw, prop, { pages });
                    if (value === null) continue;
                    await setRowValue(db.id, newRow.id, prop.id, value);
                  }
                  if (title) await updatePage(newRow.id, { title });
                  count++;
                }
                setImported(count);
              } catch (e: unknown) {
                setError(getErrorMessage(e, "Import failed mid-way"));
              } finally {
                setImporting(false);
              }
            }} disabled={importing}>
              {importing ? "Importing…" : `Import ${parsed.rows.length} rows`}
            </Button>
          )}
          {imported !== null && (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
