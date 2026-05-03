import { z } from "zod";

const BLOCK_TYPES = [
  "paragraph", "h1", "h2", "h3", "todo", "bullet", "numbered",
  "quote", "code", "divider", "callout",
  "page", "database",
  "columns2", "columns3", "toggle",
  "image", "equation", "table", "embed", "button",
] as const;

const PROPERTY_TYPES = [
  "text", "number", "select", "multi_select", "status",
  "date", "person", "checkbox", "url", "email", "phone",
  "files", "relation", "rollup", "formula",
  "created_time", "created_by", "last_edited_time", "last_edited_by",
  "unique_id",
] as const;

const VIEW_TYPES = ["table", "board", "list", "gallery", "calendar", "timeline"] as const;

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
  numberFormat: z.enum(["plain", "currency", "percent"]).optional(),
  formulaExpression: z.string().max(500).optional(),
});

const TplView = z.object({
  id: z.string().min(1),
  type: z.enum(VIEW_TYPES),
  name: z.string().min(1),
  isDefault: z.boolean().optional(),
  groupBy: z.string().optional(),
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

const TplBlock = z.object({
  type: z.enum(BLOCK_TYPES),
  text: z.string().max(10_000).optional(),
  checked: z.boolean().optional(),
  lang: z.string().max(40).optional(),
  databaseRef: z.string().optional(),
  pageRef: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

interface TplPage {
  ref?: string;
  title: string;
  icon: string;
  cover?: string | null;
  blocks: z.infer<typeof TplBlock>[];
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
);

export const TemplateJsonSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1).max(120),
  icon: z.string().min(1),
  category: z.string().min(1).max(60),
  description: z.string().max(500).optional(),
  page: TplPageSchema,
});

export type TemplateJson = z.infer<typeof TemplateJsonSchema>;
export type TplBlockT = z.infer<typeof TplBlock>;
export type TplDatabaseT = z.infer<typeof TplDatabase>;
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
    for (const b of p.blocks) {
      if (b.type === "database") {
        if (!b.databaseRef) errors.push(`database block missing databaseRef on page "${p.title}"`);
        else if (!dbRefs.has(b.databaseRef)) errors.push(`unknown databaseRef "${b.databaseRef}"`);
      }
      if (b.type === "page") {
        if (b.pageRef && !pageRefs.has(b.pageRef)) errors.push(`unknown pageRef "${b.pageRef}"`);
      }
    }
    for (const child of p.children ?? []) checkBlocks(child);
  }
  checkBlocks(data.page);

  if (errors.length) throw new Error(`Template invalid: ${errors.join("; ")}`);
  return data;
}
