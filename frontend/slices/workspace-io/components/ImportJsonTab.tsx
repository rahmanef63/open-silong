"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { pickFile } from "@/shared/lib/markdown";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { cn } from "@/shared/lib/utils";

export function ImportJsonTab({ onClose }: { onClose: () => void }) {
  const importJson = useMutation(api["import/workspace"].importFromJson);
  const jsonImport = useAsyncError("workspaceImport");
  const [dragOver, setDragOver] = useState(false);

  async function runImport(file: File) {
    if (jsonImport.pending) return;
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      toast.error("Pick a .json file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File too large (max 8 MB)");
      return;
    }
    if (!confirm(`Import "${file.name}"? Existing pages and databases stay; the import is additive.`)) return;
    const ok = await jsonImport.execute(async () => {
      const text = await file.text();
      const res = await importJson({ json: text });
      const extra = [
        res.snapshots ? `${res.snapshots} snapshots` : null,
        res.slugCollisions ? `${res.slugCollisions} slug collision(s) dropped` : null,
      ].filter(Boolean).join(", ");
      toast.success(
        `Imported ${res.pages} pages, ${res.databases} databases${extra ? ` (${extra})` : ""}`,
      );
      return res;
    });
    if (ok) onClose();
  }

  function pickJson() {
    pickFile("application/json,.json").then((f) => f && runImport(f));
  }

  function dropJson(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) runImport(file);
  }

  return (
    <div className="space-y-4 mt-4">
      <div
        onDrop={dropJson}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={pickJson}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") pickJson(); }}
        className={cn(
          "rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition",
          dragOver ? "border-brand bg-brand/10" : "border-border bg-card hover:bg-accent",
          jsonImport.pending && "pointer-events-none opacity-60",
        )}
      >
        {jsonImport.pending ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        )}
        <p className="mt-2 text-sm font-medium">
          {jsonImport.pending ? "Importing…" : dragOver ? "Drop to import" : "Drag a .json file here, or click to choose"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Accepts the workspace export shape. Cap: 8 MB · 500 pages · 50 databases.
        </p>
      </div>

      <ul className="text-xs text-muted-foreground space-y-1.5">
        <li>· Additive — your existing pages and databases stay.</li>
        <li>· Imported blocks get fresh ids; cross-refs (parent links, database rows, page+database blocks, inline <code>/p/&lt;id&gt;</code> mentions, relation arrays, button actions) are remapped automatically.</li>
        <li>· Snapshots are restored against new page ids.</li>
        <li>· Share slugs that collide with existing pages are dropped silently.</li>
      </ul>
    </div>
  );
}
