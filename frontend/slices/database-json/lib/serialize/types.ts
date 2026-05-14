import type {
  Block, DatabaseTemplate, DatabaseViewConfig, Property, PropertyValue,
} from "@/shared/types/domain";

/* Wire format (versioned) */

export interface DatabaseExportV1 {
  version: 1;
  exportedAt: string;
  database: {
    name: string;
    icon: string;
    properties: Property[];
    views: DatabaseViewConfig[];
    activeViewId?: string;
    templates?: DatabaseTemplate[];
    defaultTemplateId?: string | null;
    subItemsParentPropId?: string | null;
    uniqueIdCounter?: number;
  };
  rows: RowExport[];
}

export interface RowExport {
  title: string;
  icon: string;
  cover?: string | null;
  blocks?: Block[];
  rowProps?: Record<string, PropertyValue>;
  favorite?: boolean;
  isPublic?: boolean;
}

export interface AIRowDraft {
  title: string;
  icon?: string;
  rowProps?: Record<string, unknown>;
}

export interface RemapTables {
  props: Map<string, string>;
  options: Map<string, string>;
  views: Map<string, string>;
  templates: Map<string, string>;
  /** original row id (if present in JSON's rowProps relation values) → new id. */
  rows: Map<string, string>;
}

export { uid } from "@/shared/lib/uid";
