import type { PropertyType } from "@/shared/types/domain";
import { PROPERTY_TYPE_ICONS, PROPERTY_TYPE_LABELS } from "../lib/propertyTypeMeta";
import { cn } from "@/shared/lib/utils";

interface Props {
  type: PropertyType;
  /** className passed to the underlying lucide icon. Default
   *  matches the column-header sizing. */
  className?: string;
  /** When true, renders an `aria-label` with the property-type name. */
  labeled?: boolean;
}

/** Reusable property-type icon. Pulls from the single-source
 *  `PROPERTY_TYPE_ICONS` map so icon swaps land in one place. */
export function PropertyTypeIcon({ type, className, labeled = true }: Props) {
  const Icon = PROPERTY_TYPE_ICONS[type];
  return (
    <Icon
      className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground", className)}
      aria-label={labeled ? PROPERTY_TYPE_LABELS[type] : undefined}
    />
  );
}
