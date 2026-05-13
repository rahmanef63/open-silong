import type { Database, Property } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import type { DateValue } from "../lib/dateFormat";
import { DatePicker } from "./date-cell/DatePicker";

interface Props {
  db: Database;
  prop: Property;
  rowId: string;
  value: DateValue | null;
  cellClass: string;
}

export function DateCell({ db, prop, rowId, value, cellClass }: Props) {
  const { setRowValue, updateProperty } = useStore();
  return (
    <DatePicker
      value={value}
      prop={prop}
      onChange={(next) => setRowValue(db.id, rowId, prop.id, next)}
      onPropPatch={(patch) => updateProperty(db.id, prop.id, patch)}
      triggerClass={cellClass}
    />
  );
}
