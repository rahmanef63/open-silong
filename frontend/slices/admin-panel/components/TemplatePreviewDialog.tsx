"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { DynamicIcon } from "@/slices/icon-picker";
import { Pencil, Database, FileText, Boxes, Rows3 } from "lucide-react";
import { walkTemplateTree, templateStats, type TemplateTreeNode } from "../lib/previewTemplate";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    _id: string;
    name: string;
    icon: string;
    category: string;
    description?: string | null;
    isPublished: boolean;
    isSeed: boolean;
    json: unknown;
  } | null;
  onEdit?: () => void;
}

export function TemplatePreviewDialog({ open, onOpenChange, template, onEdit }: Props) {
  const tree = useMemo(() => (template ? walkTemplateTree(template.json) : null), [template]);
  const stats = useMemo(() => (template ? templateStats(template.json) : null), [template]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        {template && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <DynamicIcon value={template.icon} className="text-4xl shrink-0" />
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-xl flex items-center gap-2 flex-wrap">
                    <span className="truncate">{template.name}</span>
                    {template.isSeed && <Badge variant="secondary" className="text-[10px]">seed</Badge>}
                    {template.isPublished ? (
                      <Badge variant="default" className="text-[10px]">published</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-400">draft</Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {template.category}
                    {template.description ? ` · ${template.description}` : ""}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatTile icon={<FileText className="h-4 w-4" />} label="Pages" value={stats.pages} />
                <StatTile icon={<Boxes className="h-4 w-4" />} label="Blocks" value={stats.blocks} />
                <StatTile icon={<Database className="h-4 w-4" />} label="Databases" value={stats.databases} />
                <StatTile icon={<Rows3 className="h-4 w-4" />} label="Seed rows" value={stats.seedRows} />
              </div>
            )}

            {stats && Object.keys(stats.blockTypes).length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Block mix</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(stats.blockTypes)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, n]) => (
                      <Badge key={type} variant="outline" className="text-[11px]">
                        {type} <span className="ml-1 text-muted-foreground">×{n}</span>
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Structure</div>
              <div className="rounded-lg border border-border bg-muted/20 p-3 max-h-[40vh] overflow-auto">
                {tree ? <TreeNode node={tree} /> : <div className="text-xs text-muted-foreground">(invalid template JSON)</div>}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              {onEdit && (
                <Button onClick={onEdit}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit template
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 flex items-center gap-2.5">
      <div className="text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <div className="text-base font-semibold leading-none">{value}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function TreeNode({ node }: { node: TemplateTreeNode }) {
  const indent = node.depth * 14;
  return (
    <div>
      <div
        className="flex items-baseline gap-1.5 text-sm leading-relaxed"
        style={{ paddingLeft: indent }}
      >
        {node.kind === "page" ? (
          <span className="text-base shrink-0">{node.icon ?? "📄"}</span>
        ) : node.kind === "database" ? (
          <span className="text-base shrink-0">{node.icon ?? "📊"}</span>
        ) : (
          <span className="text-muted-foreground/50 shrink-0">·</span>
        )}
        <span
          className={
            node.kind === "page"
              ? "font-medium"
              : node.kind === "database"
                ? "text-blue-600 dark:text-blue-400"
                : "text-muted-foreground"
          }
        >
          {node.label}
        </span>
        {node.detail && (
          <span className="text-xs text-muted-foreground/80 truncate">{node.detail}</span>
        )}
      </div>
      {node.children?.map((c, i) => <TreeNode key={i} node={c} />)}
    </div>
  );
}
