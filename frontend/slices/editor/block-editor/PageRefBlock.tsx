import { FileText } from "lucide-react";
import { useNavigate } from "@/shared/lib/router";
import { useStore } from "@/shared/lib/store";
import { DynamicIcon } from "@/shared/components/icon-picker";
import type { Block } from "@/shared/types/domain";

export function PageRefBlock({ block }: { block: Block }) {
  const navigate = useNavigate();
  const { getPage } = useStore();
  const target = block.pageId ? getPage(block.pageId) : undefined;
  return (
    <button
      onClick={() => target ? navigate(`/p/${target.id}`) : undefined}
      draggable={!!target}
      onDragStart={(e) => {
        if (!target) return;
        e.dataTransfer.setData("application/x-page-id", target.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      title={target ? "Drag to sidebar to re-parent" : undefined}
      className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left hover:bg-accent transition cursor-grab active:cursor-grabbing"
    >
      <DynamicIcon value={target?.icon} className="text-base shrink-0" />
      <span className="flex-1 text-sm font-medium underline-offset-2 hover:underline">
        {target?.title || target ? (target?.title || "Untitled") : "Missing page"}
      </span>
      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}
