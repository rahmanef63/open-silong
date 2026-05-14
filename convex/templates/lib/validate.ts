import { z } from "zod";

const BLOCK_TYPES = [
  "paragraph", "h1", "h2", "h3", "h4", "todo", "bullet", "numbered",
  "quote", "code", "divider", "callout",
  "page", "database",
  "columns2", "columns3", "columns4", "columns5", "toggle",
  "image", "equation", "table", "embed", "button",
] as const;

const PROPERTY_TYPES = [
  "text", "number", "select", "multi_select", "status",
  "date", "person", "checkbox", "url", "email", "phone",
  "files", "relation", "rollup", "formula",
  "created_time", "created_by", "last_edited_time", "last_edited_by",
  "unique_id", "button", "place",
] as const;

const VIEW_TYPES = [
  "table", "board", "list", "gallery", "calendar", "timeline",
  "chart", "dashboard", "feed", "map", "form",
] as const;

const TplOption = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
});

const TplProperty = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(PROPERTY_TYPES),
  options: z.array(TplOption).max(50).optional(),
  numberFormat: z.enum(["plain", "number", "decimal", "currency", "percent"]).optional(),
  numberCurrencyCode: z.string().max(8).optional(),
  numberDecimals: z.number().int().min(0).max(4).optional(),
  formulaExpression: z.string().max(500).optional(),
  /** Cross-db relation target (refers to a TplDatabase.ref). */
  relationDatabaseRef: z.string().optional(),
  relationTwoWay: z.boolean().optional(),
  uniqueIdPrefix: z.string().max(16).optional(),
});

const TplView = z.object({
  id: z.string().min(1),
  type: z.enum(VIEW_TYPES),
  name: z.string().min(1),
  isDefault: z.boolean().optional(),
  groupBy: z.string().optional(),
  /** Free-form view config payload — sprayed onto DatabaseViewConfig
   *  on instantiate. Use for chart/dashboard/calendar/etc. specifics
   *  (chartKind, chartXProp, dashboardKPIs, calendarDateProp, etc.). */
  payload: z.record(z.unknown()).optional(),
});

const TplSeedRow = z.object({ props: z.record(z.unknown()) });

const TplDatabase = z.object({
  ref: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
  properties: z.array(TplProperty).min(1).max(50),
  views: z.array(TplView).max(20).optional(),
  seedRows: z.array(TplSeedRow).max(200).optional(),
});

interface TplBlockI {
  type: typeof BLOCK_TYPES[number];
  text?: string;
  checked?: boolean;
  lang?: string;
  databaseRef?: string;
  pageRef?: string;
  payload?: Record<string, unknown>;
  /** For columns2 / columns3 — array of arrays of nested template
   *  blocks. Length must match the column count (2 or 3). */
  columns?: TplBlockI[][];
  /** For toggle — child blocks. */
  children?: TplBlockI[];
}

const TplBlock: z.ZodType<TplBlockI> = z.lazy(() =>
  z.object({
    type: z.enum(BLOCK_TYPES),
    text: z.string().max(10_000).optional(),
    checked: z.boolean().optional(),
    lang: z.string().max(40).optional(),
    databaseRef: z.string().optional(),
    pageRef: z.string().optional(),
    payload: z.record(z.unknown()).optional(),
    columns: z.array(z.array(TplBlock).max(80)).max(5).optional(),
    children: z.array(TplBlock).max(80).optional(),
  }),
) as z.ZodType<TplBlockI>;

interface TplPage {
  ref?: string;
  title: string;
  icon: string;
  cover?: string | null;
  blocks: TplBlockI[];
  databases?: z.infer<typeof TplDatabase>[];
  children?: TplPage[];
}

const TplPageSchema: z.ZodType<TplPage> = z.lazy(() =>
  z.object({
    ref: z.string().optional(),
    title: z.string().max(200),
    icon: z.string(),
    cover: z.union([z.string(), z.null()]).optional(),
    blocks: z.array(TplBlock).max(500),
    databases: z.array(TplDatabase).max(20).optional(),
    children: z.array(TplPageSchema).max(50).optional(),
  }),
) as z.ZodType<TplPage>;

export const TemplateJsonSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1).max(120),
  icon: z.string().min(1),
  category: z.string().min(1).max(60),
  description: z.string().max(500).optional(),
  /** Promotional images for the gallery — first item is the hero thumbnail
   *  shown on cards + featured banners. Rest render in the detail-view
   *  accordion. URLs only; admin-curated. */
  images: z.array(z.string().url().max(2048)).max(10).optional(),
  page: TplPageSchema,
});

export type TemplateJson = z.infer<typeof TemplateJsonSchema>;
export type TplBlockT = TplBlockI;
export type TplDatabaseT = z.infer<typeof TplDatabase>;
export type TplPropertyT = z.infer<typeof TplProperty>;
export type TplViewT = z.infer<typeof TplView>;
export type TplPageT = TplPage;

/** Parse + cross-ref validate. Throws Error with all violations joined. */
export function validateTemplate(input: unknown): TemplateJson {
  const parsed = TemplateJsonSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 10)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Template invalid: ${issues}`);
  }
  const data = parsed.data;

  // Cross-ref: collect all db refs across the whole tree, every page ref too.
  const dbRefs = new Set<string>();
  const pageRefs = new Set<string>();
  const errors: string[] = [];

  function walk(p: TplPageT) {
    if (p.ref) {
      if (pageRefs.has(p.ref)) errors.push(`duplicate page ref "${p.ref}"`);
      pageRefs.add(p.ref);
    }
    for (const db of p.databases ?? []) {
      if (dbRefs.has(db.ref)) errors.push(`duplicate database ref "${db.ref}"`);
      dbRefs.add(db.ref);
    }
    for (const child of p.children ?? []) walk(child);
  }
  walk(data.page);

  function checkBlocks(p: TplPageT) {
    function visit(b: TplBlockI, ctxPage: TplPageT) {
      if (b.type === "database") {
        if (!b.databaseRef) errors.push(`database block missing databaseRef on page "${ctxPage.title}"`);
        else if (!dbRefs.has(b.databaseRef)) errors.push(`unknown databaseRef "${b.databaseRef}"`);
      }
      if (b.type === "page") {
        if (b.pageRef && !pageRefs.has(b.pageRef)) errors.push(`unknown pageRef "${b.pageRef}"`);
      }
      if (b.type === "columns2" && b.columns && b.columns.length !== 2) {
        errors.push(`columns2 must have exactly 2 columns (got ${b.columns.length}) on "${ctxPage.title}"`);
      }
      if (b.type === "columns3" && b.columns && b.columns.length !== 3) {
        errors.push(`columns3 must have exactly 3 columns (got ${b.columns.length}) on "${ctxPage.title}"`);
      }
      if (b.type === "columns4" && b.columns && b.columns.length !== 4) {
        errors.push(`columns4 must have exactly 4 columns (got ${b.columns.length}) on "${ctxPage.title}"`);
      }
      if (b.type === "columns5" && b.columns && b.columns.length !== 5) {
        errors.push(`columns5 must have exactly 5 columns (got ${b.columns.length}) on "${ctxPage.title}"`);
      }
      for (const col of b.columns ?? []) for (const cb of col) visit(cb, ctxPage);
      for (const child of b.children ?? []) visit(child, ctxPage);
    }
    for (const b of p.blocks) visit(b, p);
    for (const child of p.children ?? []) checkBlocks(child);
  }
  checkBlocks(data.page);

  // Cross-ref: relationDatabaseRef on properties must resolve.
  function checkRelations(p: TplPageT) {
    for (const db of p.databases ?? []) {
      for (const prop of db.properties) {
        if (prop.relationDatabaseRef && !dbRefs.has(prop.relationDatabaseRef)) {
          errors.push(`unknown relationDatabaseRef "${prop.relationDatabaseRef}" on db "${db.name}"`);
        }
      }
    }
    for (const c of p.children ?? []) checkRelations(c);
  }
  checkRelations(data.page);

  if (errors.length) throw new Error(`Template invalid: ${errors.join("; ")}`);
  return data;
}
