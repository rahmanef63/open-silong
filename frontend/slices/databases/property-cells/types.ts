import type { Database, Page, Property, PropertyValue } from "@/shared/types/domain";

export interface CellProps {
  db: Database;
  prop: Property;
  row: Page;
  value: PropertyValue | undefined;
  onSet: (value: PropertyValue) => void;
  cellClass: string;
}

// Re-export so existing call-sites keep working; SSOT lives in shared.
export { OPTION_COLORS } from "@/shared/lib/format";
