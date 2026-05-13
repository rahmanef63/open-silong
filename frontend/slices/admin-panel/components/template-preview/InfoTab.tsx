import { Database, FileText, Boxes, Rows3 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { SectionLabel, StatTile } from "./parts";

type Stats = {
  pages: number;
  blocks: number;
  databases: number;
  seedRows: number;
  blockTypes: Record<string, number>;
};

export function InfoTab({
  stats, template,
}: {
  stats: Stats | null;
  template: { _id: string; category: string; isPublished: boolean; isSeed: boolean };
}) {
  return (
    <div className="px-6 py-5 space-y-5">
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
          <SectionLabel>Block mix</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.blockTypes)
              .sort((a, b) => b[1] - a[1])
              .map(([type, n]) => (
                <Badge key={type} variant="outline" className="text-[11px] font-normal">
                  <span className="text-foreground/80">{type}</span>
                  <span className="ml-1 text-muted-foreground tabular-nums">×{n}</span>
                </Badge>
              ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel>Metadata</SectionLabel>
        <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">ID</dt>
          <dd className="font-mono text-xs truncate">{template._id}</dd>
          <dt className="text-muted-foreground">Category</dt>
          <dd>{template.category}</dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{template.isPublished ? "Live" : "Draft"}</dd>
          <dt className="text-muted-foreground">Origin</dt>
          <dd>{template.isSeed ? "Seed (built-in)" : "Custom"}</dd>
        </dl>
      </div>
    </div>
  );
}
