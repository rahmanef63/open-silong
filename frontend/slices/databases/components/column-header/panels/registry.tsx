/** PropertyType → panel renderer mapping for the Edit-property submenu.
 *
 *  Keys absent here render only the shared Name + Description rows.
 *  Each panel receives the same `(db, prop, updateProperty)` shape so
 *  swapping renderers is mechanical. */

import type { ComponentType } from "react";
import { useDbAdapter } from "../../../lib/useDbAdapter";
import type { Database, Property, PropertyType } from "@/shared/types/domain";
import { NumberConfig } from "../../property-config/NumberConfig";
import { DateConfig } from "../../property-config/DateConfig";
import { RelationConfig } from "../../property-config/RelationConfig";
import { RollupConfig } from "../../property-config/RollupConfig";
import { FormulaConfig, UniqueIdConfig, PlaceConfig, SelectConfig } from "../../property-config/misc";

export type TypePanelProps = {
  db: Database;
  prop: Property;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
};

const RelationPanel = ({ db, prop, updateProperty }: TypePanelProps) => {
  const { databases, setRelationTwoWay } = useDbAdapter();
  return (
    <RelationConfig
      db={db}
      prop={prop}
      databases={databases}
      setRelationTwoWay={setRelationTwoWay}
      updateProperty={updateProperty}
    />
  );
};

const RollupPanel = ({ db, prop, updateProperty }: TypePanelProps) => {
  const { databases } = useDbAdapter();
  return (
    <RollupConfig db={db} prop={prop} databases={databases} updateProperty={updateProperty} />
  );
};

const SelectPanel = ({ prop }: TypePanelProps) => <SelectConfig prop={prop} />;
const PlacePanel = () => <PlaceConfig />;

export const PROPERTY_TYPE_PANEL: Partial<Record<PropertyType, ComponentType<TypePanelProps>>> = {
  number: NumberConfig,
  date: DateConfig,
  relation: RelationPanel,
  rollup: RollupPanel,
  formula: FormulaConfig,
  unique_id: UniqueIdConfig,
  place: PlacePanel,
  select: SelectPanel,
  multi_select: SelectPanel,
  status: SelectPanel,
  created_time: DateConfig,
  last_edited_time: DateConfig,
};
