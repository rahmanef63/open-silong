"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FolderTree } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { cn } from "@/shared/lib/utils";
import { runExport, type ExportFormat } from "../lib/runExport";
import { flattenPageTree } from "../lib/pageTree";
import { DEPTH_OPTIONS, type DepthLevel } from "../lib/types";

export function ExportTab({ preselectPageId }: { preselectPageId?: string }) {
  const { workspace, preferences, pages, databases } = useStore();
  const [selected, setSelected] = useState<Set<string>>(
    () => preselectPageId ? new Set([preselectPageId]) : new Set(),
  );
  const [depth, setDepth] = useState<DepthLevel>(2);
  const [includeDatabases, setIncludeDatabases] = useState(true);
  const [includeRows, setIncludeRows] = useState(true);
  const [filter, setFilter] = useState("");
  const [format, setFormat] = useState<ExportFormat>("json");

  const orderedPages = useMemo(() => flattenPageTree(pages), [pages]);
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? orderedPages.filter((p) => p.title.toLowerCase().includes(q)) : orderedPages;
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleExport() {
    const rootIds = [...selected];
    if (rootIds.length === 0) {
      toast.error("Pick at least one page to export");
      return;
    }
    const { counts } = await runExport({
      rootIds, allPages: pages, allDatabases: databases,
      depth, includeDatabases, includeRows,
      workspace: { name: workspace.name, emoji: workspace.emoji },
      preferences, format,
    });
    toast.success(`Exported ${counts.pages} pages, ${counts.databases} databases`);
  }

  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label className="text-xs uppercase text-muted-foreground">Pages</Label>
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter pages…"
          className="mt-1 mb-1"
        />
        <div className="rounded-md border border-border bg-card max-h-72 overflow-y-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={toggleAll}
            className="w-full h-auto justify-start gap-2 px-3 py-2 text-xs font-normal text-muted-foreground border-b border-border rounded-none [&_svg]:size-3"
          >
            <input type="checkbox" checked={allFilteredSelected} readOnly className="h-3.5 w-3.5" />
            <FolderTree className="h-3 w-3" />
            {allFilteredSelected ? "Deselect all" : `Select all (${filtered.length})`}
            <span className="ml-auto">{selected.size} picked</span>
          </Button>
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
            <Button
              key={opt.value}
              type="button"
              variant="outline"
              onClick={() => setDepth(opt.value)}
              title={opt.hint}
              className={cn(
                "h-auto rounded-md px-2.5 py-1 text-xs font-normal",
                depth === opt.value
                  ? "border-brand bg-brand/10 text-foreground hover:bg-brand/10"
                  : "bg-card text-muted-foreground",
              )}
            >
              {opt.label}
            </Button>
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

      <div>
        <Label className="text-xs uppercase text-muted-foreground">Format</Label>
        <div className="mt-1 flex gap-1.5">
          {(["json", "zip"] as ExportFormat[]).map((f) => (
            <Button
              key={f}
              type="button"
              variant="outline"
              onClick={() => setFormat(f)}
              className={cn(
                "h-auto rounded-md px-2.5 py-1 text-xs font-normal",
                format === f
                  ? "border-brand bg-brand/10 text-foreground hover:bg-brand/10"
                  : "bg-card text-muted-foreground",
              )}
            >
              {f === "json" ? "JSON (Nosion native)" : "ZIP (Notion-compatible)"}
            </Button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {format === "json"
            ? "Full-fidelity round-trip via Settings → Backup → Restore."
            : "Folder of .md pages + databases/*.csv. Drop into Notion's Import → All in one ZIP."}
        </p>
      </div>

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          File: <code className="font-mono">nosion-export-YYYY-MM-DD.{format}</code>
        </p>
        <Button onClick={handleExport} disabled={selected.size === 0}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Download {format.toUpperCase()}
        </Button>
      </div>
    </div>
  );
}
