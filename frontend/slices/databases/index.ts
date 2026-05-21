export { DatabaseBlock, PROPERTY_TYPE_LABELS } from "./DatabaseBlock";
export { DatabasePage } from "./DatabasePage";
export { PropertyCell } from "./PropertyCell";

// Render-prop seam for peer-slice overrides (today: BlockEditor +
// RowPropertiesPanel from @/slices/editor). Symmetric to editor's
// EditorComponentsProvider. Consumers wanting to swap impls mount this
// provider above DatabasePage / RowDetailSheet / RowDetailDialog.
export {
  DatabasesComponentsProvider, useDatabasesComponents,
  type DatabasesComponentsRegistry, type DatabasesComponentsProviderProps,
} from "./lib/componentsRegistry";

// Lib surface — re-exported so peer slices (editor/row-properties/*,
// database-csv) don't deep-import into `databases/lib/*`.
export {
  PROPERTY_TYPE_META,
  PROPERTY_TYPE_ICONS,
  PROPERTY_TYPES,
  defaultPropName,
  type PropertyTypeCategory,
  type PropertyTypeMeta,
} from "./lib/propertyTypeMeta";

// Row sub-namespace (formerly @/slices/database-row)
export {
  RowDetailSheet,
  RowDetailDialog,
  RowDetailBody,
  RowPeek,
  RowOpenModeSwitcher,
  InlineRowTitle,
  AddColumnHeader,
  AddRowFooter,
  useRowOpenMode,
} from "./row";
export type { RowOpenMode } from "./row";

// Row-selection sub-namespace (formerly @/slices/database-row-selection)
export {
  RowSelectionProvider,
  useRowSelection,
  useRowSelectionOptional,
  RowMarqueeOverlay,
  RowSelectionToolbar,
  RowSelectionKeyboard,
} from "./row-selection";
export type { RowSelectionApi, RowSelectionState } from "./row-selection";
