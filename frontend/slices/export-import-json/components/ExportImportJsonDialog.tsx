"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Download, Upload, FileJson, Loader2, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { useStore } from "@/shared/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Input } from "@/shared/ui/input";
import { downloadFile, pickFile } from "@/shared/lib/markdown";
import { reportError } from "@/shared/lib/error";
import { buildSelectionExport } from "../lib/buildExport";
import { DynamicIcon } from "@/slices/icon-picker";
import { cn } from "@/shared/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEPTH_OPTIONS: ReadonlyArray<{ value: 0 | 1 | 2 | 3 | 4 | 5; label: string; hint: string }> = [
  { value: 0, label: "None",     hint: "Just the selected pages" },
  { value: 1, label: "1 level",  hint: "Direct children" },
  { value: 2, label: "2 levels", hint: "Up to grandchildren" },
  { value: 3, label: "3 levels", hint: "Three levels deep" },
  { value: 4, label: "4 levels", hint: "Four levels deep" },
  { value: 5, label: "5 levels", hint: "Whole subtree (max)" },
];

export function ExportImportJsonDialog({ open, onOpenChange }: Props) {
  const { workspace, preferences, pages, databases } = useStore();
  const importJson = useMutation(api["import/workspace"].importFromJson);

  // ─── Export state ───────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [depth, setDepth] = useState<0 | 1 | 2 | 3 | 4 | 5>(2);
  const [includeDatabases, setIncludeDatabases] = useState(true);
  const [includeRows, setIncludeRows] = useState(true);
  const [filter, setFilter] = useState("");

  // ─── Import state ───────────────────────────────────────────
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  /** Build a quick top-level + nested page list (no children inline —
   *  rendered indented based on parentId chain depth). */
  const orderedPages = useMemo(() => {
    const livePages = pages.filter((p) => !p.trashed);
    const byParent = new Map<string | null, typeof livePages>();
    for (const p of livePages) {
      const arr = byParent.get(p.parentId) ?? [];
      arr.push(p);
      byParent.set(p.parentId, arr);
    }
    for (const arr of byParent.values()) arr.sort((a, b) => a.title.localeCompare(b.title));
    const out: Array<{ id: string; title: string; icon: string; depth: number; rowOf?: string }> = [];
    function walk(parentId: string | null, lvl: number) {
      for (const p of byParent.get(parentId) ?? []) {
        if (p.rowOfDatabaseId) continue; // hide row pages from picker
        out.push({ id: p.id, title: p.title || "Untitled", icon: p.icon, depth: lvl, rowOf: p.rowOfDatabaseId });
        if (lvl < 6) walk(p.id, lvl + 1);
      }
    }
    walk(null, 0);
    return out;
  }, [pages]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return orderedPages;
    return orderedPages.filter((p) => p.title.toLowerCase().includes(q));
  }, [orderedPages, filter]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) for (const p of filtered) next.delete(p.id);
      else for (const p of filtered) next.add(p.id);
      return next;
    });
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleExport() {
    const rootIds = [...selected];
    if (rootIds.length === 0) {
      toast.error("Pick at least one page to export");
      return;
    }
    const r = buildSelectionExport({
      rootIds,
      allPages: pages,
      allDatabases: databases,
      depth,
      includeDatabases,
      includeRows,
      workspace: { name: workspace.name, emoji: workspace.emoji },
      preferences,
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`nosion-export-${stamp}.json`, r.json, "application/json");
    toast.success(
      `Exported ${r.counts.pages} pages, ${r.counts.databases} databases`,
    );
  }

  // ─── Import handlers ────────────────────────────────────────
  async function runImport(file: File) {
    if (importing) return;
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      toast.error("Pick a .json file");
      return;
    }
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
      onOpenChange(false);
    } catch (err) {
      const safe = reportError("workspaceImport", err);
      toast.error(safe.message);
    } finally {
      setImporting(false);
    }
  }

  function onFilePick() {
    pickFile("application/json,.json").then((f) => f && runImport(f));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) runImport(file);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-brand" />
            Export / Import JSON
          </DialogTitle>
          <DialogDescription>
            Round-trip pages, databases, and snapshots as a portable JSON file.
            Drop a file in Import to restore — no overwrite, fresh ids assigned.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Import
            </TabsTrigger>
          </TabsList>

          {/* ─── Export tab ───────────────────────────────────── */}
          <TabsContent value="export" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Pages</Label>
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter pages…"
                className="mt-1 mb-1"
              />
              <div className="rounded-md border border-border bg-card max-h-72 overflow-y-auto">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground border-b border-border hover:bg-accent transition"
                >
                  <input type="checkbox" checked={allFilteredSelected} readOnly className="h-3.5 w-3.5" />
                  <FolderTree className="h-3 w-3" />
                  {allFilteredSelected ? "Deselect all" : `Select all (${filtered.length})`}
                  <span className="ml-auto">{selected.size} picked</span>
                </button>
                {filtered.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No pages match.</div>
                )}
                {filtered.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent cursor-pointer transition"
                    style={{ paddingLeft: `${0.75 + p.depth * 1}rem` }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      className="h-3.5 w-3.5"
                    />
                    <DynamicIcon value={p.icon} className="text-base shrink-0" />
                    <span className="truncate">{p.title}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Sub-page depth</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {DEPTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDepth(opt.value)}
                    title={opt.hint}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs transition",
                      depth === opt.value
                        ? "border-brand bg-brand/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {DEPTH_OPTIONS.find((o) => o.value === depth)?.hint}
              </p>
            </div>

            <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="dbs" className="text-sm">Include databases referenced by exported pages</Label>
                <Switch id="dbs" checked={includeDatabases} onCheckedChange={setIncludeDatabases} />
              </div>
              <div className={cn("flex items-center justify-between gap-2", !includeDatabases && "opacity-50")}>
                <Label htmlFor="rows" className="text-sm">Include row pages of those databases</Label>
                <Switch id="rows" checked={includeRows} onCheckedChange={setIncludeRows} disabled={!includeDatabases} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                File: <code className="font-mono">nosion-export-YYYY-MM-DD.json</code>
              </p>
              <Button onClick={handleExport} disabled={selected.size === 0}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download JSON
              </Button>
            </div>
          </TabsContent>

          {/* ─── Import tab ───────────────────────────────────── */}
          <TabsContent value="import" className="space-y-4 mt-4">
            <div
              ref={dropRef}
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={onFilePick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onFilePick(); }}
              className={cn(
                "rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition",
                dragOver ? "border-brand bg-brand/10" : "border-border bg-card hover:bg-accent",
                importing && "pointer-events-none opacity-60",
              )}
            >
              {importing ? (
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              )}
              <p className="mt-2 text-sm font-medium">
                {importing ? "Importing…" : dragOver ? "Drop to import" : "Drag a .json file here, or click to choose"}
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
