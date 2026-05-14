export type BlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
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
  | "columns4"   // 4-column layout
  | "columns5"   // 5-column layout
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
  /** Per-block active view selection for linked database views. When a
   *  block of type "database" references a DB embedded in multiple
   *  places, this lets each instance show a different tab without
   *  fighting over `db.activeViewId`. Falls back to the DB's own
   *  activeViewId when unset. */
  activeViewId?: string;
  /** Per-block view-config overrides. Maps view-id → partial config
   *  that overlays the source view's filter/sort/hidden/etc. Lets
   *  linked-view instances customise without polluting the source DB.
   *  Only "non-structural" fields override here (filters, sorts,
   *  hiddenPropIds, frozenPropIds, search, tableCalcs, groupBy);
   *  rename / delete / view-type changes still write to the DB. */
  viewOverrides?: Record<string, Partial<{
    filters: unknown[];
    sorts: unknown[];
    groupBy: string | undefined;
    search: string;
    hiddenPropIds: string[];
    frozenPropIds: string[];
    tableCalcs: Record<string, string>;
  }>>;
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
  /** Denormalized list of database IDs hosted by `database` blocks on this
   *  page. Populated from the slim `pages.listMeta` query so consumers can
   *  find a database's host page without scanning blocks. Empty for the
   *  full per-page query (use `blocks` directly there). */
  databaseHostFor?: string[];
  /** Block count on this page — slim signal for previews / sort. */
  blockCount?: number;
  /** First text-bearing block (truncated 120 chars). From slim listMeta. */
  previewText?: string;
  /** Custom share-link slug. When set, /share/<slug> resolves to this page. */
  shareSlug?: string;
  /** Allow search engines to index the public share. Off by default. */
  shareIndexable?: boolean;
  /** Wiki mode metadata — present when this page is the canonical entry
   *  for a topic. */
  wiki?: {
    ownerId: string;
    ownerName: string;
    ownerIcon: string;
    verified: boolean;
    verifiedAt?: number;
  };
}

export interface Workspace {
  id: string;
  name: string;
  emoji: string;
  slug?: string;
  isPersonal?: boolean;
  role?: "owner" | "editor" | "viewer";
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
  | "unique_id"
  | "button"
  | "place";

/** Calculate aggregate for the table footer. Mirrors Notion's
 *  per-type set; UI gates which aggregates are valid for which
 *  property type (see `lib/calcAggregate.ts`). */
export type CalcKind =
  | "none"
  | "count_all"
  | "count_values"
  | "count_unique_values"
  | "count_empty"
  | "count_not_empty"
  | "percent_empty"
  | "percent_not_empty"
  | "sum"
  | "average"
  | "median"
  | "min"
  | "max"
  | "range"
  | "checked"
  | "unchecked"
  | "percent_checked"
  | "percent_unchecked"
  | "earliest_date"
  | "latest_date"
  | "date_range";

/** Button property action. Minimal runner — extend with action engine later. */
export type ButtonAction =
  | { kind: "open_url"; url: string }
  | { kind: "open_page"; pageId: string }
  | { kind: "edit_property"; propId: string; value: PropertyValue }
  | { kind: "show_confirmation"; message: string };

export interface SelectOption {
  id: string;
  name: string;
  color: string; // semantic palette key
}

export type NumberFormat = "number" | "decimal" | "percent" | "currency";

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  hidden?: boolean;
  /** Optional column-level description (shown in property panel + form view). */
  description?: string;
  options?: SelectOption[]; // select / multi_select / status

  /** ─── Number formatting (type === "number") ───────────────── */
  /** Display format. Default: "number" (plain). */
  numberFormat?: NumberFormat;
  /** Fraction digits 0-4. Default: 0 for "number", 2 for decimal/currency, 0 for percent. */
  numberDecimals?: number;
  /** ISO 4217 code when numberFormat === "currency". e.g. "USD","EUR","IDR","GBP","JPY". */
  numberCurrencyCode?: string;

  /** ─── Relation (type === "relation") ──────────────────────── */
  /** Target database. null/undefined means "all database rows" (legacy). */
  relationDatabaseId?: string | null;
  /** When true, link is mirrored on the target db's inverse property. */
  relationTwoWay?: boolean;
  /** Inverse property id on the target db. Created automatically when
   *  twoWay flips on; cleared when it flips off. */
  relationInversePropertyId?: string;

  /** ─── Rollup (type === "rollup") ──────────────────────────── */
  /** Property id of the relation prop on THIS db that points to the
   *  target db. */
  rollupRelationPropertyId?: string | null;
  /** Property id on the target db whose value is being rolled up. */
  rollupTargetPropertyId?: string | null;
  rollupAggregate?:
    | "count"
    | "count_unique"
    | "values"
    | "sum"
    | "avg"
    | "min"
    | "max"
    | "earliest"
    | "latest"
    | "checked"
    | "percent_checked";

  /** ─── Formula (type === "formula") ────────────────────────── */
  /** Mock formula expression. Supports {{title}}, {{Property}}, and simple =math. */
  formulaExpression?: string;

  /** ─── Unique ID (type === "unique_id") ────────────────────── */
  uniqueIdPrefix?: string;

  /** ─── Button (type === "button") ──────────────────────────── */
  buttonLabel?: string;
  buttonActions?: ButtonAction[];

  /** ─── Date (type === "date") ──────────────────────────────── */
  /** Display format for dates in cells. Default: "full". */
  dateFormat?: "full" | "short" | "mdy" | "dmy" | "ymd" | "relative";
  /** Clock format when `dateIncludeTime` is on. Default: "12h". */
  timeFormat?: "12h" | "24h";
  /** When true, cells render a time alongside the date. */
  dateIncludeTime?: boolean;
  /** Reminder offset before the date. "none" = no reminder. */
  dateNotification?: "none" | "at_time" | "5m" | "10m" | "30m" | "1h" | "1d" | "2d";
}

export type PropertyValue =
  | string
  | number
  | boolean
  | null
  | string[] // multi_select option ids, person ids, relation ids, or mock files
  | { date?: string; end?: string; time?: string; endTime?: string };
  // date prop: `date`/`time` = start; `end`/`endTime` = optional range end.
  // `date`/`end` are YYYY-MM-DD; `time`/`endTime` are HH:mm (24h) regardless of display timeFormat.

export type DbView =
  | "table" | "board" | "list" | "gallery" | "calendar" | "timeline"
  | "chart" | "dashboard" | "feed" | "map" | "form";

export type ChartKind = "bar" | "line" | "area" | "pie" | "donut";
export type ChartAggregate = "count" | "sum" | "avg" | "min" | "max";

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
  /** UI-level per-view lock — when true, filter / sort / group / hidden /
   *  frozen / calc / search edits are gated in the frontend. Independent
   *  from `Database.locked` (which gates structural property edits). */
  locked?: boolean;
  groupBy?: string;     // property id (for board)
  sorts: DatabaseSort[];
  filters: DatabaseFilter[];
  search: string;
  /** Chart view: kind of plot */
  chartKind?: ChartKind;
  /** Chart view: category / X axis property id */
  chartXProp?: string;
  /** Chart view: numeric Y property id (omit when aggregate=count) */
  chartYProp?: string;
  /** Chart view: aggregate function */
  chartAggregate?: ChartAggregate;
  /** Map view: numeric latitude property id */
  mapLatProp?: string;
  /** Map view: numeric longitude property id */
  mapLngProp?: string;
  /** Form view: required-field property ids (defaults: all visible) */
  formRequiredProps?: string[];
  /** Form view: shown-field property ids (defaults: all non-hidden) */
  formShownProps?: string[];
  /** Form view: success message after submit */
  formSuccessMessage?: string;

  /** Per-view hidden property ids — independent of global Property.hidden so
   *  hiding a column in one view never affects another. */
  hiddenPropIds?: string[];
  /** Per-view frozen-pinned property ids (Table view). Frozen columns
   *  stick to the left edge with `position: sticky`. */
  frozenPropIds?: string[];
  /** Per-column calculate aggregate (Table view footer). Map propId →
   *  CalcKind. Empty / "none" hides the cell. */
  tableCalcs?: Record<string, string>;
  /** Feed view: secondary timestamp source */
  feedTimestamp?: "createdAt" | "updatedAt";

  // ─── Table view ──────────────────────────────────────
  tableWrapCells?: boolean;
  tableRowHeight?: "short" | "medium" | "tall";

  // ─── Board view ──────────────────────────────────────
  /** Number of card props rendered (besides title). */
  boardCardSize?: "small" | "medium" | "large";
  /** Property ids shown on each card. */
  boardCardProps?: string[];
  /** Hide groups with zero rows. */
  boardHideEmptyGroups?: boolean;
  /** Property id used to color cards (select/status). */
  boardColorByProp?: string;
  /** Persisted column order (option ids). The trailing `null` slot for
   *  "no value" is implicit — included if explicitly listed. */
  boardColumnOrder?: string[];

  // ─── Gallery view ────────────────────────────────────
  gallerySize?: "small" | "medium" | "large";
  galleryCoverSource?: "cover" | "property" | "none";
  galleryCoverProp?: string;
  galleryCoverFit?: "cover" | "contain";
  galleryCardProps?: string[];
  galleryAspect?: "square" | "video" | "portrait";

  // ─── List view ───────────────────────────────────────
  listSummaryProps?: string[];
  listDensity?: "compact" | "comfortable";

  // ─── Calendar view ───────────────────────────────────
  calendarDateProp?: string;
  calendarEndProp?: string;
  calendarColorByProp?: string;
  calendarWeekStart?: 0 | 1; // Sunday | Monday
  calendarShowWeekends?: boolean;
  calendarMode?: "month" | "week";
  calendarShowOverdue?: boolean;

  // ─── Timeline view ───────────────────────────────────
  timelineStartProp?: string;
  timelineEndProp?: string;
  timelineZoom?: "day" | "week" | "month" | "quarter";
  timelineColorByProp?: string;

  // ─── Chart view (additional) ─────────────────────────
  chartShowLegend?: boolean;
  chartShowGrid?: boolean;
  chartTopN?: number;       // 0 = all
  chartSortBy?: "name" | "value";
  chartSortDir?: "asc" | "desc";
  chartPalette?: "warm" | "cool" | "rainbow" | "mono";
  chartDecimals?: number;   // 0..4
  chartTitle?: string;
  chartXLabel?: string;
  chartYLabel?: string;
  chartShowValues?: boolean;
  chartHeight?: "small" | "medium" | "large";

  // ─── Dashboard view ──────────────────────────────────
  dashboardKPIs?: string[];     // numeric / checkbox prop ids
  dashboardBreakdowns?: string[]; // select / status prop ids
  dashboardRecentLimit?: number;

  // ─── Feed view (additional) ──────────────────────────
  feedDensity?: "compact" | "comfortable";
  feedSummaryProps?: string[];

  // ─── Map view (additional) ───────────────────────────
  mapPinColorProp?: string;
  mapShowList?: boolean;

  // ─── Form view (additional) ──────────────────────────
  formTitle?: string;
  formDescription?: string;
  /** Public form: when true, anyone can submit via /forms/<formSlug>
   *  without auth. Submissions land as new rows owned by the database
   *  owner. */
  formIsPublic?: boolean;
  /** Slug for the public form URL. Auto-derived from view.id if blank. */
  formSlug?: string;
}

/** UI-level lock — gates property/view structural edits in the
 *  frontend. Backend doesn't enforce (workspace owner can override
 *  via direct API). Matches Notion's "Lock database" UX. */
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
  /** UI lock — prevents property / view structural edits in the
   *  frontend. Backend doesn't enforce (admin override). */
  locked?: boolean;
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
