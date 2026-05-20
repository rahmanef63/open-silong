"use client";

import { useState } from "react";
import { Download, Upload, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { useStore } from "@/shared/lib/store";
import { Field } from "@/shared/components/forms/Field";
import { downloadFile, pickFile } from "@/shared/lib/markdown";
import { reportError } from "@/shared/lib/error";
import { Button } from "@/shared/ui/button";

export function BackupSection() {
  const { workspace, preferences, pages, databases, snapshots } = useStore();
  const importJson = useMutation(api["import/workspace"].importFromJson);
  const [importing, setImporting] = useState(false);

  async function onImportWorkspace() {
    if (importing) return;
    const file = await pickFile("application/json,.json");
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File too large (max 8 MB)");
      return;
    }
    if (!confirm(`Import "${file.name}"? Existing pages and databases stay; the import is additive.`)) return;
    setImporting(true);
    try {
      const text = await file.text();
      const res = await importJson({ json: text });
      const extra = [
        res.snapshots ? `${res.snapshots} snapshots` : null,
        res.slugCollisions ? `${res.slugCollisions} slug collision(s) dropped` : null,
      ].filter(Boolean).join(", ");
      toast.success(
        `Imported ${res.pages} pages, ${res.databases} databases${extra ? ` (${extra})` : ""}`,
      );
    } catch (err) {
      const safe = reportError("workspaceImport", err);
      toast.error(safe.message);
    } finally {
      setImporting(false);
    }
  }

  function onExportWorkspace() {
    const livePages = pages.filter((p) => !p.trashed);
    const liveDbs = databases.filter((d) => !d.trashed);
    const livePageIds = new Set(livePages.map((p) => p.id));
    const liveSnapshots = snapshots.filter((s) => livePageIds.has(s.pageId));
    const payload = {
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      workspace: { name: workspace.name, emoji: workspace.emoji },
      preferences,
      pages: livePages,
      databases: liveDbs,
      snapshots: liveSnapshots,
    };
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(
      `silong-backup-${stamp}.json`,
      JSON.stringify(payload, null, 2),
      "application/json",
    );
    toast.success(
      `Exported ${livePages.length} pages, ${liveDbs.length} databases, ${liveSnapshots.length} snapshots`,
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Backup</h2>
      <Field label="Workspace export">
        <Button
          type="button"
          variant="outline"
          onClick={onExportWorkspace}
          className="h-auto gap-2 bg-background px-3 py-1.5 text-sm font-normal [&_svg]:size-3.5"
        >
          <Download className="h-3.5 w-3.5" />
          Download JSON backup
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Single-file backup of every live page, database, and version
          snapshot, plus your preferences. Trashed items are excluded.
        </p>
      </Field>
      <Field label="Workspace import">
        <Button
          type="button"
          variant="outline"
          onClick={onImportWorkspace}
          disabled={importing}
          className="h-auto gap-2 bg-background px-3 py-1.5 text-sm font-normal disabled:opacity-60 [&_svg]:size-3.5"
        >
          {importing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {importing ? "Importing…" : "Restore from JSON"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Additive — your existing pages and databases stay. Imported
          pages and blocks get fresh ids; cross-refs (parent links,
          database rows, page+database blocks, mentions, relation arrays,
          button actions) are remapped automatically. Cap: 8 MB / 500
          pages / 50 databases.
        </p>
      </Field>
    </div>
  );
}
