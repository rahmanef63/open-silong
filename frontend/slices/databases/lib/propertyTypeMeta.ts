/** Single source of truth for property-type metadata.
 *
 *  Replaces 4× duplicated `Record<PropertyType, string>` and 2×
 *  `Record<PropertyType, ElementType>` scattered across DatabaseBlock,
 *  PropertyConfigPanel, ColumnHeaderMenu, TableView, RowPropertiesPanel,
 *  and databaseActions.
 *
 *  Add a new PropertyType variant? Add ONE row here and every consumer
 *  (label, icon, default name, slash-group) updates automatically.
 */

import {
  Type, Hash, ChevronDown, Tags, Circle, Calendar, User, CheckSquare,
  Link2, Mail, Phone, Paperclip, ArrowUpRight, Sigma, Calculator, Clock,
  UserCheck, Fingerprint, MousePointer, MapPin, ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { PropertyType } from "@/shared/types/domain";

export type PropertyTypeCategory =
  | "text" | "numeric" | "option" | "date" | "people"
  | "boolean" | "contact" | "media" | "relational" | "computed"
  | "system" | "automation" | "location" | "wiki";

export interface PropertyTypeMeta {
  /** UI label shown in menus + headers. */
  label: string;
  /** Lucide icon component. */
  icon: LucideIcon;
  /** Default name when adding a new column of this type. */
  defaultName: string;
  /** Bucket for grouping in the slash menu / change-type submenu. */
  category: PropertyTypeCategory;
  /** Notion-canonical API name (matches user's reference JSON). */
  apiName: string;
  /** True when value is computed server / from page metadata —
   *  cell renders read-only. */
  readOnlyValue?: boolean;
}

/** Master table — every PropertyType variant. */
export const PROPERTY_TYPE_META: Record<PropertyType, PropertyTypeMeta> = {
  text:             { label: "Text",             icon: Type,         defaultName: "Text",         category: "text",        apiName: "rich_text" },
  number:           { label: "Number",           icon: Hash,         defaultName: "Number",       category: "numeric",     apiName: "number" },
  select:           { label: "Select",           icon: ChevronDown,  defaultName: "Select",       category: "option",      apiName: "select" },
  multi_select:     { label: "Multi-select",     icon: Tags,         defaultName: "Tags",         category: "option",      apiName: "multi_select" },
  status:           { label: "Status",           icon: Circle,       defaultName: "Status",       category: "option",      apiName: "status" },
  date:             { label: "Date",             icon: Calendar,     defaultName: "Date",         category: "date",        apiName: "date" },
  person:           { label: "Person",           icon: User,         defaultName: "Person",       category: "people",      apiName: "people" },
  checkbox:         { label: "Checkbox",         icon: CheckSquare,  defaultName: "Done",         category: "boolean",     apiName: "checkbox" },
  url:              { label: "URL",              icon: Link2,        defaultName: "URL",          category: "contact",     apiName: "url" },
  email:            { label: "Email",            icon: Mail,         defaultName: "Email",        category: "contact",     apiName: "email" },
  phone:            { label: "Phone",            icon: Phone,        defaultName: "Phone",        category: "contact",     apiName: "phone_number" },
  files:            { label: "Files",            icon: Paperclip,    defaultName: "Files",        category: "media",       apiName: "files" },
  relation:         { label: "Relation",         icon: ArrowUpRight, defaultName: "Relation",     category: "relational",  apiName: "relation" },
  rollup:           { label: "Rollup",           icon: Sigma,        defaultName: "Rollup",       category: "computed",    apiName: "rollup",          readOnlyValue: true },
  formula:          { label: "Formula",          icon: Calculator,   defaultName: "Formula",      category: "computed",    apiName: "formula",         readOnlyValue: true },
  created_time:     { label: "Created time",     icon: Clock,        defaultName: "Created",      category: "system",      apiName: "created_time",    readOnlyValue: true },
  created_by:       { label: "Created by",       icon: UserCheck,    defaultName: "Created by",   category: "system",      apiName: "created_by",      readOnlyValue: true },
  last_edited_time: { label: "Last edited time", icon: Clock,        defaultName: "Last edited",  category: "system",      apiName: "last_edited_time",readOnlyValue: true },
  last_edited_by:   { label: "Last edited by",   icon: UserCheck,    defaultName: "Last edited by", category: "system",    apiName: "last_edited_by",  readOnlyValue: true },
  unique_id:        { label: "Unique ID",        icon: Fingerprint,  defaultName: "ID",           category: "system",      apiName: "unique_id",       readOnlyValue: true },
  button:           { label: "Button",           icon: MousePointer, defaultName: "Action",       category: "automation",  apiName: "button" },
  place:            { label: "Place",            icon: MapPin,       defaultName: "Place",        category: "location",    apiName: "place" },
  verification:     { label: "Verification",     icon: ShieldCheck,  defaultName: "Verified",     category: "wiki",        apiName: "verification" },
};

/** Convenience derived maps (computed once at module-load). */
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = Object.fromEntries(
  (Object.entries(PROPERTY_TYPE_META) as [PropertyType, PropertyTypeMeta][])
    .map(([k, v]) => [k, v.label]),
) as Record<PropertyType, string>;

export const PROPERTY_TYPE_ICONS: Record<PropertyType, LucideIcon> = Object.fromEntries(
  (Object.entries(PROPERTY_TYPE_META) as [PropertyType, PropertyTypeMeta][])
    .map(([k, v]) => [k, v.icon]),
) as Record<PropertyType, LucideIcon>;

export function defaultPropName(type: PropertyType): string {
  return PROPERTY_TYPE_META[type].defaultName;
}

/** All known PropertyType keys, in declaration order. */
export const PROPERTY_TYPES: PropertyType[] = Object.keys(PROPERTY_TYPE_META) as PropertyType[];
