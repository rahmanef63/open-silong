import type { Database, Page, Property, PropertyValue } from "@/lib/types";

export interface CellProps {
  db: Database;
  prop: Property;
  row: Page;
  value: PropertyValue | undefined;
  onSet: (value: PropertyValue) => void;
  cellClass: string;
}

export const OPTION_COLORS = [
  "gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red",
] as const;
