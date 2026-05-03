import { getErrorMessage } from "@/shared/lib/error";
import { useState } from "react";
import { Upload, AlertCircle, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { useStore } from "@/shared/lib/store";
import { applyImport, parseExport, type DatabaseExportV1 } from "../lib/serialize";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, the imported DB is opened in a new toast/page automatically. */
  onImported?: (dbId: string) => void;
}

export function JsonImportDialog({ open, onOpenChange, onImported }: Props) {
  const { createDatabase, updateDatabase, addRow, setRowValue, updatePage } = useStore();
  const [parsed, setParsed] = useState<DatabaseExportV1 | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedDbId, setImportedDbId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setParsed(null); setImporting(false); setImportedDbId(null); setError(null); };

  const onFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      setParsed(parseExport(text));
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to parse JSON."));
    }
  };

  const onApply = async () => {
    if (!parsed) return;
    setImporting(true);
    setError(null);
    try {
      const { dbId } = await applyImport(parsed, {
        createDatabase,
        updateDatabase,
        addRow,
        setRowValue,
        updatePage,
      });
      setImportedDbId(dbId);
      onImported?.(dbId);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Import failed."));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import database (JSON)</DialogTitle>
          <DialogDescription>
            Pick a previously exported `.json` file. Imports as a new database — all ids are regenerated.
          </DialogDescription>
        </DialogHeader>

        {!parsed && (
          <label className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-8 cursor-pointer hover:bg-accent/30 transition">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm">Click to choose .json file</span>
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
          </label>
        )}

        {parsed && importedDbId === null && (
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            <div className="rounded-md bg-muted/50 p-3 text-xs">
              <div className="font-medium text-sm mb-1">{parsed.database.icon} {parsed.database.name}</div>
              <div className="text-muted-foreground">
                {parsed.database.properties.length} properties · {parsed.database.views.length} views · {parsed.rows.length} rows
              </div>
              {parsed.database.properties.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                  {parsed.database.properties.slice(0, 12).map((p) => (
                    <li key={p.id}>· {p.name} <span className="opacity-60">({p.type})</span></li>
                  ))}
                  {parsed.database.properties.length > 12 && <li className="opacity-60">… +{parsed.database.properties.length - 12} more</li>}
                </ul>
              )}
            </div>
          </div>
        )}

        {importedDbId !== null && (
          <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 text-center text-sm">
            <Check className="mx-auto h-6 w-6 text-green-600 mb-2" />
            Imported {parsed?.rows.length ?? 0} row{parsed?.rows.length === 1 ? "" : "s"}.
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          {parsed && importedDbId === null && (
            <Button onClick={onApply} disabled={importing}>
              {importing ? "Importing…" : `Import ${parsed.rows.length} rows`}
            </Button>
          )}
          {importedDbId !== null && (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
