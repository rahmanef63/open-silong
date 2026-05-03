"use client";

import { useState, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Upload, Loader2, FileArchive, CheckCircle2, AlertTriangle } from "lucide-react";
import { useFileUpload } from "@/slices/files/hooks/useFileUpload";
import { parseFileRef } from "@/slices/files/lib/parse";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where imported pages are parented. null = root. */
  parentId?: string | null;
}

interface Summary {
  pages: number;
  databases: number;
  files: number;
  skipped: number;
  errors: { path: string; reason: string }[];
}

export function ImportZipDialog({ open, onOpenChange, parentId = null }: Props) {
  const importZip = useAction(api.import.zip.importZip);
  const { upload, uploading } = useFileUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  function reset() {
    setPicked(null);
    setError(null);
    setSummary(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleImport() {
    if (!picked) return;
    setError(null);
    setSummary(null);
    setPending(true);
    try {
      const ref = await upload(picked);
      const parsed = parseFileRef(ref);
      const storageId = parsed.kind === "storage" ? parsed.storageId : undefined;
      if (!storageId) throw new Error("Upload tidak menghasilkan storageId");
      const result = await importZip({ storageId, parentId });
      setSummary(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  const busy = pending || uploading;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-4 w-4" /> Import ZIP
          </DialogTitle>
          <DialogDescription className="text-xs">
            Notion-style export. Accepts <code>.md</code>, <code>.csv</code>,{" "}
            <code>.html</code>, <code>.pdf</code> and images. CSV becomes a
            database; markdown/HTML become pages.
          </DialogDescription>
        </DialogHeader>

        {!summary && (
          <div className="space-y-3 py-2">
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              disabled={busy}
              onChange={(e) => setPicked(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-accent/80"
            />
            {picked && (
              <div className="text-xs text-muted-foreground">
                {picked.name} · {(picked.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
            {error && (
              <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5" /> {error}
              </div>
            )}
          </div>
        )}

        {summary && (
          <div className="space-y-2 py-2 text-sm">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Import selesai
            </div>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>Pages: <strong className="text-foreground">{summary.pages}</strong></li>
              <li>Databases: <strong className="text-foreground">{summary.databases}</strong></li>
              <li>Files: <strong className="text-foreground">{summary.files}</strong></li>
              <li>Skipped: {summary.skipped}</li>
            </ul>
            {summary.errors.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-amber-600">
                  {summary.errors.length} entry error
                </summary>
                <ul className="mt-1 space-y-0.5 max-h-40 overflow-auto">
                  {summary.errors.slice(0, 50).map((er, i) => (
                    <li key={i} className="text-muted-foreground">
                      <code>{er.path}</code> — {er.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <DialogFooter>
          {summary ? (
            <Button onClick={() => { reset(); onOpenChange(false); }}>Done</Button>
          ) : (
            <Button onClick={handleImport} disabled={!picked || busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
              {busy ? "Importing…" : "Import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
