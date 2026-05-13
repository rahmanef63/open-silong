import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector, isTextInputTarget } from "@/shared/lib/keyboard";
import { colorClass } from "@/shared/lib/format";
import { DynamicIcon } from "@/shared/components/icon-picker";
import type { Page, Property } from "@/shared/types/domain";
import { PropertyCell } from "../../PropertyCell";

export function BoardCard({ row, db, onOpen, cardPadding, colorByProp, cardPropIds, viewVisible }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id });
  const visibleSet = new Set<string>((viewVisible as Property[]).map((p) => p.id));
  const visibleProps: Property[] = cardPropIds?.length
    ? cardPropIds
        .map((id: string) => db.properties.find((p: Property) => p.id === id))
        .filter((p: Property | undefined): p is Property => !!p && visibleSet.has(p.id))
    : (viewVisible as Property[]).filter((p) => p.type !== "text").slice(0, 3);
  const colorOpt: { color?: string } | null = colorByProp
    ? colorByProp.options?.find((o: any) => o.id === row.rowProps?.[colorByProp.id]) ?? null
    : null;
  const accentBar = colorOpt?.color
    ? cn("border-l-4", colorClass(colorOpt.color).split(" ").find((c) => c.startsWith("border-")) ?? "")
    : "";
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (isTextInputTarget(e.target)) return;
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", e.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };
  return (
    <div
      ref={setNodeRef}
      {...attributes} {...listeners}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="button"
      data-db-nav-item
      className={cn(
        "rounded-md bg-card border border-border shadow-soft cursor-grab active:cursor-grabbing hover:border-border-strong transition",
        cardPadding, accentBar, isDragging && "opacity-50",
      )}
    >
      <div className="flex items-center gap-1.5 text-sm font-medium mb-1">
        <DynamicIcon value={row.icon} className="text-sm" />
        <span className="truncate">{(row as Page).title || "Untitled"}</span>
      </div>
      <div className="flex flex-wrap gap-1 -mx-1">
        {visibleProps.map((p: Property) => (
          <div key={p.id} onClick={(e) => e.stopPropagation()} className="text-xs">
            <PropertyCell db={db} prop={p} row={row} compact />
          </div>
        ))}
      </div>
    </div>
  );
}
