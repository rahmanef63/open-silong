import { Folder, FileText, Database as DbIcon } from "lucide-react";
import { DynamicIcon } from "@/shared/components/icon-picker";
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
      <button
        type="button"
        onClick={() => onOpenSource(source.kind === "database" ? "database" : "page", source.targetId!)}
        className="hover:text-foreground transition truncate max-w-full"
      >
        {label}
      </button>
    );
  }
  return label;
}
