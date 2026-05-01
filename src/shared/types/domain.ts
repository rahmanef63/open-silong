export type BlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "todo"
  | "bullet"
  | "numbered"
  | "quote"
  | "code"
  | "divider"
  | "callout"
  | "page"
  | "database"
  | "columns2"   // 2-column layout
  | "columns3"   // 3-column layout
  | "toggle"     // collapsible block
  | "image"      // image embed (URL)
  | "equation"   // LaTeX block equation
  | "table"      // simple table (rows × cols of strings)
  | "embed"      // iframe embed (YouTube / Vimeo / Loom / Figma / generic)
  | "button";    // CTA button → URL or page

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
  lang?: string;
  pageId?: string;
  databaseId?: string;
  /** for columns2/columns3: array of column block arrays */
  columns?: Block[][];
  /** for toggle: child blocks */
  children?: Block[];
  collapsed?: boolean;
  /** for image: source URL and optional caption */
  url?: string;
  caption?: string;
  /** for table: 2D grid of cell text */
  tableRows?: string[][];
  /** for table: include first row as header */
  tableHeader?: boolean;
  /** for image: width as % of container (e.g. 60 = 60%); undefined = auto */
  width?: number;
  /** for image: horizontal alignment within its row; default = "center" */
  align?: "left" | "center" | "right";
  /** for columns2/3: per-column width as % of container; sum should ≈ 100 */
  colWidths?: number[];
  /** Notion-style text color palette key (see slices/editor/lib/colors.ts) */
  color?: string;
  /** Notion-style background color palette key */
  bgColor?: string;
}

export type PageFont = "default" | "serif" | "mono";

export interface Page {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  cover?: string | null;
  blocks: Block[];
  favorite: boolean;
  trashed: boolean;
  createdAt: number;
  updatedAt: number;
  /** Sharing */
  isPublic?: boolean;
  /** Snapshots are kept separately on the workspace; pages just live. */
  /** Database row metadata: if this page belongs to a db row */
  rowOfDatabaseId?: string;
  /** Property values when this page is a database row */
  rowProps?: Record<string, PropertyValue>;
  /** Layout / typography */
  font?: PageFont;
  smallText?: boolean;
  fullWidth?: boolean;
  /** Lock prevents editing */
  locked?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  emoji: string;
}

export type ThemePref = "light" | "dark" | "system";
export type SidebarDensity = "compact" | "comfortable";
export type PageSort = "manual" | "title" | "updated" | "created";
export type LandingView = "dashboard" | "recent" | "favorites" | "last";
export type EditorBehavior = "default" | "minimal";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  bio: string;
  icon: string; // emoji avatar
  color: string; // hsl color string for avatar bg
}

export interface Preferences {
  theme: ThemePref;
  sidebarDensity: SidebarDensity;
  defaultPageSort: PageSort;
  editorBehavior: EditorBehavior;
  landingView: LandingView;
  lastOpenedPageId: string | null;
}

/** ===== Database / properties ===== */

export type PropertyType =
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "status"
  | "date"
  | "person"
  | "checkbox"
  | "url"
  | "email"
  | "phone"
  | "files"
  | "relation"
  | "rollup"
  | "formula"
  | "created_time"
  | "created_by"
  | "last_edited_time"
  | "last_edited_by"
  | "unique_id";

export interface SelectOption {
  id: string;
  name: string;
  color: string; // semantic palette key
}

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  hidden?: boolean;
  options?: SelectOption[]; // select / multi_select / status
  /** Mock relation target; null/undefined means all database rows. */
  relationDatabaseId?: string | null;
  /** Mock rollup configuration. */
  rollupRelationPropertyId?: string | null;
  rollupTargetPropertyId?: string | null;
  rollupAggregate?: "count" | "values" | "sum" | "checked" | "latest";
  /** Mock formula expression. Supports {{title}}, {{Property}}, and simple =math. */
  formulaExpression?: string;
  /** Unique-ID config */
  uniqueIdPrefix?: string;
}

export type PropertyValue =
  | string
  | number
  | boolean
  | null
  | string[] // multi_select option ids, person ids, relation ids, or mock files
  | { date?: string };

export type DbView = "table" | "board" | "list" | "gallery" | "calendar" | "timeline";

export interface DatabaseFilter {
  propertyId: string;
  op: "contains" | "equals" | "not_empty" | "is_empty" | "checked" | "unchecked";
  value?: string;
}

export interface DatabaseSort {
  propertyId: string;
  direction: "asc" | "desc";
}

export interface DatabaseViewConfig {
  id: string;
  name: string;
  type: DbView;
  groupBy?: string;     // property id (for board)
  sorts: DatabaseSort[];
  filters: DatabaseFilter[];
  search: string;
}

export interface Database {
  id: string;
  name: string;
  icon: string;
  properties: Property[];
  /** ordered row-page ids */
  rowIds: string[];
  views: DatabaseViewConfig[];
  activeViewId: string;
  createdAt: number;
  updatedAt: number;
  /** Atomic counter for unique_id properties */
  uniqueIdCounter?: number;
  /** Saved row templates */
  templates?: DatabaseTemplate[];
  /** Default template id applied on plain New */
  defaultTemplateId?: string | null;
  /** Sub-items relation property id (parent → children) */
  subItemsParentPropId?: string | null;
  /** Soft-delete flag */
  trashed?: boolean;
}

export interface DatabaseTemplate {
  id: string;
  name: string;
  icon?: string;
  /** Seed body blocks for the row page */
  blocks: Block[];
  /** Seed property values keyed by property id */
  rowProps?: Record<string, PropertyValue>;
}

/** ===== Version history ===== */

export interface PageSnapshot {
  id: string;
  pageId: string;
  authorId: string;
  authorName: string;
  takenAt: number;
  title: string;
  icon: string;
  cover?: string | null;
  blocks: Block[];
  rowProps?: Record<string, PropertyValue>;
}
