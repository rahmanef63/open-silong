import { useState } from "react";
import { Upload, AlertCircle, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { useStore } from "@/lib/store";
import { parseCsv, valueFromString, type ParsedCsv } from "../lib/csv";
import type { Database } from "@/lib/types";

interface Props {
  db: Database;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SKIP = "__skip__";
const TITLE = "__title__";

export function CsvImportDialog({ db, open, onOpenChange }: Props) {
  const { addRow, setRowValue, updatePage } = useStore();
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
    } catch (e: any) {
      setError(e?.message ?? "Failed to parse CSV");
    }
  };

  const runImport = async () => {
    if (!parsed) return;
    setImporting(true);
    let count = 0;
    try {
      for (const row of parsed.rows) {
        if (row.every((c) => c.trim() === "")) continue;
        const newRow = await addRow(db.id);
        let title = "";
        for (let i = 0; i < parsed.headers.length; i++) {
          const target = mapping[i];
          if (!target || target === SKIP) continue;
          const raw = row[i] ?? "";
          if (target === TITLE) {
            title = raw.trim();
            continue;
          }
          const prop = db.properties.find((p) => p.id === target);
          if (!prop) continue;
          const value = valueFromString(raw, prop);
          if (value === null) continue;
          await setRowValue(db.id, newRow.id, prop.id, value);
        }
        if (title) await updatePage(newRow.id, { title });
        count++;
      }
      setImported(count);
    } catch (e: any) {
      setError(e?.message ?? "Import failed mid-way");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import CSV → {db.name}</DialogTitle>
          <DialogDescription>
            Map each CSV column to a database property. First row is treated as headers.
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
                  className="bg-background border border-border rounded px-2 py-1 text-xs min-w-40"
                >
                  <option value={SKIP}>(skip)</option>
                  <option value={TITLE}>Title</option>
                  <optgroup label="Properties">
                    {db.properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} · {p.type}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            ))}
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
            <Button onClick={runImport} disabled={importing}>
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
