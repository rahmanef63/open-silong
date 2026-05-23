import { getErrorMessage } from "@/shared/lib/error";
import { useState } from "react";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { Upload, AlertCircle, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { useStore } from "@/shared/lib/store";
import { parseCsv, type ParsedCsv } from "../lib/csv";
import type { Database } from "@/shared/types/domain";
import { SKIP, TITLE } from "./csv-import/constants";
import { MappingList } from "./csv-import/MappingList";
import { runCsvImport } from "./csv-import/runImport";

interface Props {
  db: Database;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CsvImportDialog({ db, open, onOpenChange }: Props) {
  const { addRow, setRowValue, updatePage, updateDatabase, pages } = useStore();
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [imported, setImported] = useState<number | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const importAsync = useAsyncError("CsvImportDialog.import");
  const importing = importAsync.pending;
  const error = parseError ?? importAsync.error?.message ?? null;

  const reset = () => {
    setParsed(null);
    setMapping({});
    setImported(null);
    setParseError(null);
    importAsync.clear();
  };

  const onFile = async (file: File) => {
    setParseError(null);
    try {
      const text = await file.text();
      const csv = parseCsv(text);
      if (csv.headers.length === 0) {
        setParseError("CSV is empty.");
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
      setParseError(getErrorMessage(e, "Failed to parse CSV"));
    }
  };

  const onImport = async () => {
    if (!parsed) return;
    setParseError(null);
    const count = await importAsync.execute(async () =>
      runCsvImport(parsed, mapping, db, { addRow, setRowValue, updatePage, updateDatabase, pages }),
    );
    if (typeof count === "number") setImported(count);
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
          <MappingList parsed={parsed} mapping={mapping} onChange={setMapping} db={db} />
        )}

        {imported !== null && (
          <div className="rounded-md border border-success/30 bg-success/10 p-4 text-center text-sm">
            <Check className="mx-auto h-6 w-6 text-success mb-2" />
            Imported {imported} row{imported === 1 ? "" : "s"} into {db.name}.
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          {parsed && imported === null && (
            <Button onClick={onImport} disabled={importing}>
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
