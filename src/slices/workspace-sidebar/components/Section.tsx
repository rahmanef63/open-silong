import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import type { DensityConfig } from "../lib/density";

interface Props {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  density: DensityConfig;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function Section({ title, action, children, density, onDragOver, onDrop }: Props) {
  return (
    <div className={density.section} onDragOver={onDragOver} onDrop={onDrop}>
      {title && (
        <div className="flex items-center justify-between px-2 mb-1">
          <span className={cn("uppercase tracking-wider font-semibold text-muted-foreground", density.sectionTitle)}>
            {title}
          </span>
          {action}
        </div>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
