import { Folder, FileText, Database as DbIcon } from "lucide-react";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";
import type { pageSource } from "../../lib/groupPages";

export function SourceCell({
  source,
  onOpenSource,
}: {
  source: ReturnType<typeof pageSource>;
  onOpenSource?: (kind: "page" | "database", id: string) => void;
}) {
  if (source.kind === "root") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Folder className="h-3 w-3 opacity-60" />
        <span>Root</span>
      </span>
    );
  }
  const Icon = source.kind === "database" ? DbIcon : FileText;
  const label = (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      {source.icon ? (
        <DynamicIcon value={source.icon} className="text-xs" />
      ) : (
        <Icon className="h-3 w-3 opacity-60" />
      )}
      <span className="truncate">{source.label}</span>
    </span>
  );
  if (onOpenSource && source.targetId) {
    return (
      <Button
        variant="ghost"
        type="button"
        onClick={() => onOpenSource(source.kind === "database" ? "database" : "page", source.targetId!)}
        className="h-auto max-w-full justify-start truncate p-0 text-xs font-normal hover:bg-transparent hover:text-foreground"
      >
        {label}
      </Button>
    );
  }
  return label;
}
