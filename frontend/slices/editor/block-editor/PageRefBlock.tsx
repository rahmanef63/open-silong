import { FileText } from "lucide-react";
import { useNavigate } from "@/shared/lib/router";
import { useEditorAdapter } from "@/slices/editor/lib/useEditorAdapter";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";
import type { Block } from "@/shared/types/domain";

export function PageRefBlock({ block }: { block: Block }) {
  const navigate = useNavigate();
  const { getPage } = useEditorAdapter();
  const target = block.pageId ? getPage(block.pageId) : undefined;
  return (
    <Button
      variant="outline"
      onClick={() => target ? navigate(`/p/${target.id}`) : undefined}
      draggable={!!target}
      onDragStart={(e) => {
        if (!target) return;
        e.dataTransfer.setData("application/x-page-id", target.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      title={target ? "Drag to sidebar to re-parent" : undefined}
      className="h-auto w-full cursor-grab justify-start gap-2 rounded-md bg-card px-3 py-2 text-left font-normal transition active:cursor-grabbing [&_svg]:size-3.5"
    >
      <DynamicIcon value={target?.icon} className="text-base shrink-0" />
      <span className="flex-1 text-sm font-medium underline-offset-2 hover:underline">
        {target?.title || target ? (target?.title || "Untitled") : "Missing page"}
      </span>
      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  );
}
