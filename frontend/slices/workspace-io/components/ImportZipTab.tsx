"use client";

import { useImperativeHandle, useRef, useState, forwardRef } from "react";
import { useAction } from "convex/react";
import { Loader2, Upload, FileArchive, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { useFileUpload } from "@/slices/files/hooks/useFileUpload";
import { parseFileRef } from "@/slices/files/lib/parse";
import { cn } from "@/shared/lib/utils";
import type { ZipSummary } from "../lib/types";

export interface ImportZipTabHandle {
  reset: () => void;
}

interface Props {
  zipParentId?: string | null;
  onClose: () => void;
}

export const ImportZipTab = forwardRef<ImportZipTabHandle, Props>(function ImportZipTab(
  { zipParentId = null, onClose },
  ref,
) {
  const importZip = useAction(api.import.zip.importZip);
  const { upload, uploading } = useFileUpload();
  const zipImport = useAsyncError("workspaceImport.zip");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipSummary, setZipSummary] = useState<ZipSummary | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = zipImport.pending || uploading;

  useImperativeHandle(ref, () => ({
    reset: () => {
      setZipFile(null);
      setZipSummary(null);
      zipImport.clear();
      if (inputRef.current) inputRef.current.value = "";
    },
  }), [zipImport]);

  async function runImport() {
    if (!zipFile) return;
    setZipSummary(null);
    const result = await zipImport.execute(async () => {
      const refStr = await upload(zipFile);
      const parsed = parseFileRef(refStr);
      const storageId = parsed.kind === "storage" ? parsed.storageId : undefined;
      if (!storageId) throw new Error("Upload tidak menghasilkan storageId");
      return await importZip({ storageId, parentId: zipParentId });
    });
    if (result) setZipSummary(result);
  }

  function dropZip(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setZipFile(file);
  }

  return (
    <div className="space-y-4 mt-4">
      {!zipSummary && (
        <>
          <div
            onDrop={dropZip}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            className={cn(
              "rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition",
              dragOver ? "border-brand bg-brand/10" : "border-border bg-card hover:bg-accent",
              busy && "pointer-events-none opacity-60",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              disabled={busy}
              onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            {busy ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <FileArchive className="mx-auto h-8 w-8 text-muted-foreground" />
            )}
            <p className="mt-2 text-sm font-medium">
              {busy ? "Uploading…" : dragOver ? "Drop to upload" : zipFile ? `Picked: ${zipFile.name}` : "Drag a .zip file here, or click to choose"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Notion-style export. Markdown, CSV, HTML, PDF, images. Cap: 50 MB.
            </p>
            {zipFile && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {(zipFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>

          {zipImport.error?.message && (
            <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5" /> {zipImport.error?.message}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={runImport} disabled={!zipFile || busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
              {busy ? "Importing…" : "Import ZIP"}
            </Button>
          </div>
        </>
      )}

      {zipSummary && (
        <div className="space-y-2">
          <div className={cn(
            "flex items-center gap-2",
            zipSummary.pages + zipSummary.databases + zipSummary.files > 0 ? "text-emerald-600" : "text-amber-600",
          )}>
            <CheckCircle2 className="h-4 w-4" /> Import done
          </div>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>Pages: <strong className="text-foreground">{zipSummary.pages}</strong></li>
            <li>Databases: <strong className="text-foreground">{zipSummary.databases}</strong></li>
            <li>Files: <strong className="text-foreground">{zipSummary.files}</strong></li>
            <li>Skipped: {zipSummary.skipped}</li>
          </ul>
          {zipSummary.diagnostics && (
            <div className="text-[10px] text-muted-foreground font-mono">
              {zipSummary.diagnostics.blobBytes}b · entries={zipSummary.diagnostics.entryCount}
              {zipSummary.diagnostics.wasGzipWrapped && " · gunzipped"}
              {" · head="}{zipSummary.diagnostics.firstBytesHex}
            </div>
          )}
          {zipSummary.errors.length > 0 && (
            <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-300">
              <div className="font-medium mb-1">{zipSummary.errors.length} entry error</div>
              <ul className="space-y-0.5 max-h-48 overflow-auto">
                {zipSummary.errors.slice(0, 50).map((er, i) => (
                  <li key={i} className="break-all">
                    <code className="text-[10px]">{er.path}</code> — {er.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end pt-1">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </div>
  );
});
