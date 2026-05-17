"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { ClipboardPaste, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { pickFile } from "@/shared/lib/markdown";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { useConfirm } from "@/shared/components/ConfirmProvider";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

const MAX_BYTES = 8 * 1024 * 1024;

export function ImportJsonTab({ onClose }: { onClose: () => void }) {
  const importJson = useMutation(api["import/workspace"].importFromJson);
  const jsonImport = useAsyncError("workspaceImport");
  const [dragOver, setDragOver] = useState(false);
  const [pasted, setPasted] = useState("");
  const confirm = useConfirm();

  async function runImport(jsonText: string, label: string) {
    if (jsonImport.pending) return;
    const bytes = new Blob([jsonText]).size;
    if (bytes > MAX_BYTES) {
      toast.error(`JSON too large (${(bytes / 1024 / 1024).toFixed(2)} MB; max 8 MB)`);
      return;
    }
    try {
      JSON.parse(jsonText);
    } catch {
      toast.error("Not valid JSON");
      return;
    }
    const ok2 = await confirm({
      title: `Import ${label}?`,
      description: "Existing pages and databases stay; the import is additive.",
      confirmLabel: "Import",
    });
    if (!ok2) return;
    const ok = await jsonImport.execute(async () => {
      const res = await importJson({ json: jsonText });
      const extra = [
        res.snapshots ? `${res.snapshots} snapshots` : null,
        res.slugCollisions ? `${res.slugCollisions} slug collision(s) dropped` : null,
      ].filter(Boolean).join(", ");
      toast.success(
        `Imported ${res.pages} pages, ${res.databases} databases${extra ? ` (${extra})` : ""}`,
      );
      return res;
    });
    if (ok) {
      setPasted("");
      onClose();
    }
  }

  async function runImportFile(file: File) {
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      toast.error("Pick a .json file");
      return;
    }
    const text = await file.text();
    await runImport(text, `"${file.name}"`);
  }

  function pickJson() {
    pickFile("application/json,.json").then((f) => f && runImportFile(f));
  }

  function dropJson(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) runImportFile(file);
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error("Clipboard is empty");
        return;
      }
      setPasted(text);
    } catch {
      toast.error("Clipboard read denied — paste into the box instead");
    }
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
          "rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition",
          dragOver ? "border-brand bg-brand/10" : "border-border bg-card hover:bg-accent",
          jsonImport.pending && "pointer-events-none opacity-60",
        )}
      >
        {jsonImport.pending ? (
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="mx-auto h-7 w-7 text-muted-foreground" />
        )}
        <p className="mt-2 text-sm font-medium">
          {jsonImport.pending ? "Importing…" : dragOver ? "Drop to import" : "Drag a .json file here, or click to choose"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Cap: 8 MB · 500 pages · 50 databases.</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or paste JSON</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder='Paste workspace JSON here — e.g. {"version":1,"pages":[…],"databases":[…]}'
          spellCheck={false}
          className="w-full h-32 rounded-md border border-border bg-card px-3 py-2 text-xs font-mono outline-none focus:border-brand resize-y"
          disabled={jsonImport.pending}
        />
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" onClick={pasteFromClipboard} disabled={jsonImport.pending} className="gap-1.5">
            <ClipboardPaste className="h-3.5 w-3.5" />
            Paste from clipboard
          </Button>
          <Button
            type="button"
            onClick={() => runImport(pasted, "pasted JSON")}
            disabled={!pasted.trim() || jsonImport.pending}
            className="gap-1.5"
          >
            {jsonImport.pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Import pasted JSON
          </Button>
        </div>
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
