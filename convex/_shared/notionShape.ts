/** Notion-canonical JSON adapter.
 *
 *  Bidirectional translation between Nosion's internal shapes and the
 *  Notion API JSON shape. Used by:
 *    - The MCP HTTP surface (`convex/http.ts`) — emits Notion-shaped
 *      JSON so an LLM client can drive Nosion the same way it drives
 *      Notion.
 *    - The future `notion-import` action — accepts Notion API JSON
 *      and writes it as Nosion blocks/properties/pages.
 *
 *  PURE — no Convex / React / DOM deps. Safe to import from server,
 *  client, or any test.
 *
 *  Reference: https://developers.notion.com/reference/block,
 *  https://developers.notion.com/reference/property-schema-object
 *
 *  ─── Coverage ─────────────────────────────────────────────────
 *  Block types (Nosion ⇄ Notion):
 *    paragraph ⇄ paragraph
 *    h1/h2/h3 ⇄ heading_1/2/3
 *    todo ⇄ to_do
 *    bullet ⇄ bulleted_list_item
 *    numbered ⇄ numbered_list_item
 *    quote ⇄ quote
 *    code ⇄ code
 *    divider ⇄ divider
 *    callout ⇄ callout
 *    page ⇄ child_page
 *    database ⇄ child_database
 *    columns2/3 ⇄ column_list (with column children)
 *    toggle ⇄ toggle
 *    image ⇄ image
 *    equation ⇄ equation
 *    table ⇄ table (with table_row children)
 *    embed ⇄ embed
 *    button ⇄ (Notion has no public button block — emitted as a
 *             `paragraph` with a single rich_text link; on the
 *             reverse side we don't reconstruct it, the round-trip
 *             is paragraph→paragraph for foreign callers.)
 *
 *  Property types: 23 of Notion's 23 (full parity).
 */

// ─── Common types ──────────────────────────────────────────────────

export interface Annotations {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  underline: boolean;
  code: boolean;
  color: string;
}

export interface RichTextSegment {
  type: "text" | "equation";
  text?: { content: string; link?: { url: string } | null };
  equation?: { expression: string };
  annotations: Annotations;
  plain_text: string;
  href: string | null;
}

const blankAnnotations = (): Annotations => ({
  bold: false,
  italic: false,
  strikethrough: false,
  underline: false,
  code: false,
  color: "default",
});

// ─── Inline-md tokenizer (pure, mirrors frontend/shared/lib/inlineMd.tsx) ──

type Token =
  | { kind: "text"; value: string }
  | { kind: "bold" | "italic" | "strike" | "code" | "math"; inner: string }
  | { kind: "link"; label: string; href: string };

const BOLD = /\*\*([^*\n]+)\*\*/;
const STRIKE = /~~([^~\n]+)~~/;
const CODE = /`([^`\n]+)`/;
const ITALIC = /(?:\*([^*\n]+)\*|_([^_\n]+)_)/;
const MATH = /\$([^$\n]+)\$/;
const LINK_MD = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/;
const BARE_URL = /(https?:\/\/[^\s)]+)/;

function tokenize(input: string): Token[] {
  if (!input) return [];
  const out: Token[] = [];
  let buf = input;
  while (buf.length > 0) {
    const matches: Array<{ idx: number; len: number; tok: Token }> = [];
    push(matches, buf.match(CODE), (m) => ({ kind: "code", inner: m[1] }));
    push(matches, buf.match(MATH), (m) => ({ kind: "math", inner: m[1] }));
    push(matches, buf.match(BOLD), (m) => ({ kind: "bold", inner: m[1] }));
    push(matches, buf.match(STRIKE), (m) => ({ kind: "strike", inner: m[1] }));
    push(matches, buf.match(ITALIC), (m) => ({ kind: "italic", inner: m[1] ?? m[2] }));
    push(matches, buf.match(LINK_MD), (m) => ({ kind: "link", label: m[1], href: m[2] }));
    push(matches, buf.match(BARE_URL), (m) => ({ kind: "link", label: m[1], href: m[1] }));
    if (matches.length === 0) {
      out.push({ kind: "text", value: buf });
      break;
    }
    matches.sort((a, b) => a.idx - b.idx);
    const first = matches[0];
    if (first.idx > 0) out.push({ kind: "text", value: buf.slice(0, first.idx) });
    out.push(first.tok);
    buf = buf.slice(first.idx + first.len);
  }
  return out;
}

function push(
  out: Array<{ idx: number; len: number; tok: Token }>,
  m: RegExpMatchArray | null,
  build: (m: RegExpMatchArray) => Token,
) {
  if (m && m.index !== undefined) out.push({ idx: m.index, len: m[0].length, tok: build(m) });
}

// ─── inline-md ⇄ rich_text ─────────────────────────────────────────

/** Convert Nosion plain-text-with-markers into a Notion rich_text
 *  array. Single-annotation per segment (no bold+italic stacking) —
 *  matches what Nosion's tokenizer produces. */
export function inlineMdToRichText(text: string): RichTextSegment[] {
  const toks = tokenize(text ?? "");
  return toks.map<RichTextSegment>((t) => {
    const a = blankAnnotations();
    if (t.kind === "text") {
      return { type: "text", text: { content: t.value, link: null }, annotations: a, plain_text: t.value, href: null };
    }
    if (t.kind === "math") {
      return { type: "equation", equation: { expression: t.inner }, annotations: a, plain_text: t.inner, href: null };
    }
    if (t.kind === "link") {
      return { type: "text", text: { content: t.label, link: { url: t.href } }, annotations: a, plain_text: t.label, href: t.href };
    }
    if (t.kind === "bold") a.bold = true;
    if (t.kind === "italic") a.italic = true;
    if (t.kind === "strike") a.strikethrough = true;
    if (t.kind === "code") a.code = true;
    return { type: "text", text: { content: t.inner, link: null }, annotations: a, plain_text: t.inner, href: null };
  });
}

/** Reverse — convert a Notion rich_text array into Nosion's
 *  plain-text-with-markers source. Marker stacking order: code →
 *  bold → italic → strike (outermost first). */
export function richTextToInlineMd(rt: RichTextSegment[] | undefined): string {
  if (!rt || !rt.length) return "";
  return rt.map((seg) => {
    if (seg.type === "equation") return `$${seg.equation?.expression ?? ""}$`;
    const content = seg.text?.content ?? seg.plain_text ?? "";
    if (seg.text?.link?.url) return `[${content}](${seg.text.link.url})`;
    let s = content;
    const a = seg.annotations ?? blankAnnotations();
    if (a.code) s = `\`${s}\``;
    if (a.bold) s = `**${s}**`;
    if (a.italic) s = `_${s}_`;
    if (a.strikethrough) s = `~~${s}~~`;
    return s;
  }).join("");
}

// ─── Block types ──────────────────────────────────────────────────

export interface NotionBlock {
  object: "block";
  id?: string;
  type: string;
  has_children?: boolean;
  archived?: boolean;
  [key: string]: unknown;
}

interface BlockLike {
  id?: string;
  type?: string;
  text?: string;
  caption?: string;
  checked?: boolean;
  lang?: string;
  pageId?: string;
  databaseId?: string;
  url?: string;
  children?: BlockLike[];
  columns?: BlockLike[][];
  tableRows?: string[][];
  tableHeader?: boolean;
  collapsed?: boolean;
  [k: string]: unknown;
}

const NOSION_TO_NOTION_TYPE: Record<string, string> = {
  paragraph: "paragraph",
  h1: "heading_1",
  h2: "heading_2",
  h3: "heading_3",
  h4: "heading_3", // Notion API has only 3 heading levels — collapse to heading_3

  todo: "to_do",
  bullet: "bulleted_list_item",
  numbered: "numbered_list_item",
  quote: "quote",
  code: "code",
  divider: "divider",
  callout: "callout",
  page: "child_page",
  database: "child_database",
  columns2: "column_list",
  columns3: "column_list",
  columns4: "column_list",
  columns5: "column_list",
  toggle: "toggle",
  image: "image",
  equation: "equation",
  table: "table",
  embed: "embed",
  button: "paragraph", // graceful degrade — Notion has no public button block
};

const NOTION_TO_NOSION_TYPE: Record<string, string> = {
  paragraph: "paragraph",
  heading_1: "h1",
  heading_2: "h2",
  heading_3: "h3",
  to_do: "todo",
  bulleted_list_item: "bullet",
  numbered_list_item: "numbered",
  quote: "quote",
  code: "code",
  divider: "divider",
  callout: "callout",
  child_page: "page",
  child_database: "database",
  column_list: "columns2", // default; caller can re-expand to columns3 by counting children
  column: "paragraph", // column children are flattened on import
  toggle: "toggle",
  image: "image",
  equation: "equation",
  table: "table",
  embed: "embed",
};

/** Nosion block → Notion block. Recurses through `children` and
 *  `columns` to emit nested column blocks. */
export function blockToNotion(b: BlockLike): NotionBlock {
  const ntype = NOSION_TO_NOTION_TYPE[b.type ?? "paragraph"] ?? "paragraph";
  const out: NotionBlock = { object: "block", id: b.id, type: ntype, has_children: false };
  const rt = (s?: string) => inlineMdToRichText(s ?? "");

  switch (ntype) {
    case "paragraph":
    case "quote":
    case "bulleted_list_item":
    case "numbered_list_item":
    case "toggle":
      out[ntype] = { rich_text: rt(b.text), color: "default" };
      if (Array.isArray(b.children) && b.children.length) {
        (out[ntype] as { children?: NotionBlock[] }).children = b.children.map(blockToNotion);
        out.has_children = true;
      }
      break;
    case "heading_1":
    case "heading_2":
    case "heading_3":
      out[ntype] = { rich_text: rt(b.text), color: "default", is_toggleable: false };
      break;
    case "to_do":
      out.to_do = { rich_text: rt(b.text), checked: !!b.checked, color: "default" };
      if (Array.isArray(b.children) && b.children.length) {
        (out.to_do as { children?: NotionBlock[] }).children = b.children.map(blockToNotion);
        out.has_children = true;
      }
      break;
    case "code":
      out.code = { rich_text: rt(b.text), caption: rt(b.caption), language: b.lang ?? "plain text" };
      break;
    case "divider":
      out.divider = {};
      break;
    case "callout":
      out.callout = { rich_text: rt(b.text), color: "default", icon: null };
      break;
    case "child_page":
      out.child_page = { title: b.text ?? "" };
      break;
    case "child_database":
      out.child_database = { title: b.text ?? "" };
      break;
    case "column_list": {
      const colArrays = b.columns ?? [];
      out.column_list = {
        children: colArrays.map((col) => ({
          object: "block",
          type: "column",
          column: {
            children: (col ?? []).map(blockToNotion),
          },
        } as NotionBlock)),
      };
      out.has_children = true;
      break;
    }
    case "image":
      out.image = b.url
        ? { type: "external", external: { url: b.url }, caption: rt(b.caption) }
        : { type: "external", external: { url: "" }, caption: [] };
      break;
    case "equation":
      out.equation = { expression: b.text ?? "" };
      break;
    case "table": {
      const rows = b.tableRows ?? [];
      const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
      out.table = {
        table_width: width,
        has_column_header: !!b.tableHeader,
        has_row_header: false,
        children: rows.map((cells) => ({
          object: "block",
          type: "table_row",
          table_row: { cells: cells.map((c) => inlineMdToRichText(c)) },
        } as NotionBlock)),
      };
      out.has_children = true;
      break;
    }
    case "embed":
      out.embed = { url: b.url ?? "", caption: rt(b.caption) };
      break;
  }
  return out;
}

/** Notion block → Nosion block. Foreign block types collapse to
 *  paragraph with empty text — preserves position, drops content. */
export function blockFromNotion(n: NotionBlock): BlockLike {
  const ntype = n.type;
  const noType = NOTION_TO_NOSION_TYPE[ntype] ?? "paragraph";
  const payload = (n as Record<string, unknown>)[ntype] as Record<string, unknown> | undefined;
  const rt = payload?.rich_text as RichTextSegment[] | undefined;
  const out: BlockLike = { id: n.id, type: noType, text: richTextToInlineMd(rt) };

  if (ntype === "to_do") out.checked = !!payload?.checked;
  if (ntype === "code") {
    out.lang = (payload?.language as string) ?? "plain text";
    out.caption = richTextToInlineMd(payload?.caption as RichTextSegment[]);
  }
  if (ntype === "child_page" || ntype === "child_database") {
    out.text = (payload?.title as string) ?? "";
  }
  if (ntype === "image") {
    const ext = payload?.external as { url?: string } | undefined;
    const file = payload?.file as { url?: string } | undefined;
    out.url = ext?.url ?? file?.url ?? "";
    out.caption = richTextToInlineMd(payload?.caption as RichTextSegment[]);
  }
  if (ntype === "equation") out.text = (payload?.expression as string) ?? "";
  if (ntype === "embed") {
    out.url = (payload?.url as string) ?? "";
    out.caption = richTextToInlineMd(payload?.caption as RichTextSegment[]);
  }
  if (ntype === "column_list") {
    const cols = (payload?.children as NotionBlock[] | undefined) ?? [];
    out.type =
      cols.length >= 5 ? "columns5" :
      cols.length === 4 ? "columns4" :
      cols.length === 3 ? "columns3" : "columns2";
    out.columns = cols.map((c) => {
      const colPayload = (c as Record<string, unknown>).column as { children?: NotionBlock[] } | undefined;
      return (colPayload?.children ?? []).map(blockFromNotion);
    });
  }
  if (ntype === "table") {
    const rows = (payload?.children as NotionBlock[] | undefined) ?? [];
    out.tableRows = rows.map((r) => {
      const tr = (r as Record<string, unknown>).table_row as { cells?: RichTextSegment[][] } | undefined;
      return (tr?.cells ?? []).map((cellRt) => richTextToInlineMd(cellRt));
    });
    out.tableHeader = !!payload?.has_column_header;
  }
  if ((ntype === "paragraph" || ntype === "to_do" || ntype === "toggle" ||
       ntype === "bulleted_list_item" || ntype === "numbered_list_item" || ntype === "quote") &&
      Array.isArray(payload?.children)) {
    out.children = (payload!.children as NotionBlock[]).map(blockFromNotion);
  }
  return out;
}

// ─── Properties ───────────────────────────────────────────────────

interface PropertyLike {
  id?: string;
  name?: string;
  type?: string;
  description?: string;
  options?: Array<{ id: string; name: string; color: string }>;
  numberFormat?: string;
  numberCurrencyCode?: string;
  relationDatabaseId?: string | null;
  relationTwoWay?: boolean;
  relationInversePropertyId?: string;
  rollupRelationPropertyId?: string | null;
  rollupTargetPropertyId?: string | null;
  rollupAggregate?: string;
  formulaExpression?: string;
  uniqueIdPrefix?: string;
  buttonLabel?: string;
  [k: string]: unknown;
}

export interface NotionPropertySchemaEntry {
  id?: string;
  name: string;
  type: string;
  description?: string;
  [key: string]: unknown;
}

const NOSION_TO_NOTION_PROP_TYPE: Record<string, string> = {
  text: "rich_text",
  number: "number",
  select: "select",
  multi_select: "multi_select",
  status: "status",
  date: "date",
  person: "people",
  checkbox: "checkbox",
  url: "url",
  email: "email",
  phone: "phone_number",
  files: "files",
  relation: "relation",
  rollup: "rollup",
  formula: "formula",
  created_time: "created_time",
  created_by: "created_by",
  last_edited_time: "last_edited_time",
  last_edited_by: "last_edited_by",
  unique_id: "unique_id",
  button: "button",
  place: "place",
  verification: "verification",
};

const NOTION_TO_NOSION_PROP_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(NOSION_TO_NOTION_PROP_TYPE).map(([k, v]) => [v, k]),
);

/** Convert a Nosion Property → Notion property-schema entry payload
 *  (the value side of `properties: { name → entry }`). */
export function propertyToNotionSchema(p: PropertyLike): NotionPropertySchemaEntry {
  const ntype = NOSION_TO_NOTION_PROP_TYPE[p.type ?? "text"] ?? "rich_text";
  const out: NotionPropertySchemaEntry = {
    id: p.id,
    name: p.name ?? "",
    type: ntype,
    description: p.description,
  };
  switch (ntype) {
    case "number":
      out.number = { format: notionNumberFormat(p.numberFormat, p.numberCurrencyCode) };
      break;
    case "select":
    case "multi_select":
      out[ntype] = { options: (p.options ?? []).map((o) => ({ id: o.id, name: o.name, color: o.color })) };
      break;
    case "status":
      out.status = {
        options: (p.options ?? []).map((o) => ({ id: o.id, name: o.name, color: o.color })),
        groups: [],
      };
      break;
    case "relation":
      out.relation = {
        database_id: p.relationDatabaseId ?? "",
        type: p.relationTwoWay ? "dual_property" : "single_property",
        ...(p.relationTwoWay && p.relationInversePropertyId
          ? { dual_property: { synced_property_id: p.relationInversePropertyId, synced_property_name: "" } }
          : { single_property: {} }),
      };
      break;
    case "rollup":
      out.rollup = {
        relation_property_id: p.rollupRelationPropertyId ?? "",
        rollup_property_id: p.rollupTargetPropertyId ?? "",
        function: p.rollupAggregate ?? "count",
      };
      break;
    case "formula":
      out.formula = { expression: p.formulaExpression ?? "" };
      break;
    case "unique_id":
      out.unique_id = { prefix: p.uniqueIdPrefix ?? null };
      break;
    case "button":
      out.button = {};
      break;
    default:
      out[ntype] = {};
  }
  return out;
}

/** Inverse: Notion property-schema entry → Nosion Property partial.
 *  `id` is preserved if Notion supplied one; otherwise caller assigns. */
export function propertyFromNotionSchema(entry: NotionPropertySchemaEntry): PropertyLike {
  const ntype = entry.type;
  const noType = NOTION_TO_NOSION_PROP_TYPE[ntype] ?? "text";
  const out: PropertyLike = { id: entry.id, name: entry.name, type: noType, description: entry.description };
  const cfg = (entry as Record<string, unknown>)[ntype] as Record<string, unknown> | undefined;
  if (ntype === "number" && cfg) {
    const fmt = cfg.format as string | undefined;
    const nf = nosionNumberFormat(fmt);
    if (nf.format) out.numberFormat = nf.format;
    if (nf.currency) out.numberCurrencyCode = nf.currency;
  }
  if ((ntype === "select" || ntype === "multi_select" || ntype === "status") && Array.isArray(cfg?.options)) {
    out.options = (cfg!.options as Array<{ id: string; name: string; color: string }>).map((o) => o);
  }
  if (ntype === "relation" && cfg) {
    out.relationDatabaseId = (cfg.database_id as string) ?? null;
    out.relationTwoWay = (cfg.type as string) === "dual_property";
    const dp = cfg.dual_property as { synced_property_id?: string } | undefined;
    if (dp?.synced_property_id) out.relationInversePropertyId = dp.synced_property_id;
  }
  if (ntype === "rollup" && cfg) {
    out.rollupRelationPropertyId = (cfg.relation_property_id as string) ?? null;
    out.rollupTargetPropertyId = (cfg.rollup_property_id as string) ?? null;
    out.rollupAggregate = (cfg.function as string) ?? "count";
  }
  if (ntype === "formula" && cfg) out.formulaExpression = (cfg.expression as string) ?? "";
  if (ntype === "unique_id" && cfg) out.uniqueIdPrefix = (cfg.prefix as string) ?? undefined;
  return out;
}

/** Notion `number.format` is one enum (`"number" | "percent" | "dollar"
 *  | "yen" | …`). Nosion splits format vs ISO 4217 currency code. */
function notionNumberFormat(format: string | undefined, currency: string | undefined): string {
  if (format === "percent") return "percent";
  if (format !== "currency") return format ?? "number";
  switch ((currency ?? "USD").toUpperCase()) {
    case "USD": return "dollar";
    case "EUR": return "euro";
    case "GBP": return "pound";
    case "JPY": return "yen";
    case "CNY": return "yuan";
    case "RUB": return "ruble";
    case "INR": return "rupee";
    case "KRW": return "won";
    case "BRL": return "real";
    case "IDR": return "rupiah";
    default: return "dollar";
  }
}

function nosionNumberFormat(notion: string | undefined): { format?: string; currency?: string } {
  if (!notion || notion === "number" || notion === "decimal") return { format: notion };
  if (notion === "percent") return { format: "percent" };
  const map: Record<string, string> = {
    dollar: "USD", euro: "EUR", pound: "GBP", yen: "JPY",
    yuan: "CNY", ruble: "RUB", rupee: "INR", won: "KRW",
    real: "BRL", rupiah: "IDR",
  };
  if (map[notion]) return { format: "currency", currency: map[notion] };
  return { format: notion };
}

/** Nosion stores properties as an ORDERED ARRAY (display order
 *  matters); Notion stores them as a NAME-KEYED MAP. Caller picks
 *  which side they want at the boundary. */
export function propertiesArrayToMap(props: PropertyLike[]): Record<string, NotionPropertySchemaEntry> {
  const out: Record<string, NotionPropertySchemaEntry> = {};
  for (const p of props) out[p.name ?? p.id ?? ""] = propertyToNotionSchema(p);
  return out;
}

/** Inverse — preserves declaration order from Object.keys. */
export function propertiesMapToArray(map: Record<string, NotionPropertySchemaEntry>): PropertyLike[] {
  return Object.values(map).map(propertyFromNotionSchema);
}

// ─── Property values (rowProps) ───────────────────────────────────

export type NosionPropertyValue =
  | string | number | boolean | null
  | string[] | { date?: string }
  | { verified: boolean; by?: string; at?: number };

export interface NotionPropertyValue {
  id?: string;
  type: string;
  [key: string]: unknown;
}

/** Nosion stores raw values (`"selectedOptionId"`, `["a","b"]`,
 *  `42`, `true`); Notion wraps every value in a typed envelope. */
export function valueToNotion(value: NosionPropertyValue, prop: PropertyLike): NotionPropertyValue {
  const ntype = NOSION_TO_NOTION_PROP_TYPE[prop.type ?? "text"] ?? "rich_text";
  const out: NotionPropertyValue = { id: prop.id, type: ntype };
  switch (ntype) {
    case "rich_text":
      out.rich_text = inlineMdToRichText((value as string) ?? "");
      break;
    case "number":
      out.number = typeof value === "number" ? value : null;
      break;
    case "checkbox":
      out.checkbox = !!value;
      break;
    case "url":
      out.url = (value as string) || null;
      break;
    case "email":
      out.email = (value as string) || null;
      break;
    case "phone_number":
      out.phone_number = (value as string) || null;
      break;
    case "select": {
      const id = (value as string) ?? null;
      const opt = id ? (prop.options ?? []).find((o) => o.id === id) : null;
      out.select = opt ? { id: opt.id, name: opt.name, color: opt.color } : null;
      break;
    }
    case "multi_select":
    case "status": {
      const ids = Array.isArray(value) ? (value as string[]) : (value ? [value as string] : []);
      const opts = (prop.options ?? []).filter((o) => ids.includes(o.id));
      out[ntype] = ntype === "multi_select"
        ? opts.map((o) => ({ id: o.id, name: o.name, color: o.color }))
        : (opts[0] ? { id: opts[0].id, name: opts[0].name, color: opts[0].color } : null);
      break;
    }
    case "date": {
      const d = (value as { date?: string } | null) ?? null;
      out.date = d?.date ? { start: d.date, end: null, time_zone: null } : null;
      break;
    }
    case "people":
      out.people = ((value as string[]) ?? []).map((id) => ({ object: "user", id }));
      break;
    case "files":
      out.files = ((value as string[]) ?? []).map((url) => ({ name: url, type: "external", external: { url } }));
      break;
    case "relation":
      out.relation = ((value as string[]) ?? []).map((id) => ({ id }));
      break;
    case "unique_id":
      out.unique_id = typeof value === "string" || typeof value === "number" ? { number: Number(value), prefix: prop.uniqueIdPrefix ?? null } : null;
      break;
    case "verification": {
      const v = (value && typeof value === "object" && !Array.isArray(value) && "verified" in value)
        ? (value as { verified: boolean; by?: string; at?: number })
        : null;
      out.verification = v
        ? {
            state: v.verified ? "verified" : "unverified",
            verified_by: v.by ? { object: "user", id: v.by } : null,
            date: v.at ? { start: new Date(v.at).toISOString(), end: null, time_zone: null } : null,
          }
        : { state: "unverified", verified_by: null, date: null };
      break;
    }
    default:
      out[ntype] = value as unknown;
  }
  return out;
}

/** Strip the Notion envelope down to a Nosion raw value. */
export function valueFromNotion(nv: NotionPropertyValue, prop: PropertyLike): NosionPropertyValue {
  const ntype = nv.type;
  switch (ntype) {
    case "rich_text":
    case "title":
      return richTextToInlineMd(nv[ntype] as RichTextSegment[]);
    case "number":
      return (nv.number as number) ?? null;
    case "checkbox":
      return !!nv.checkbox;
    case "url":
    case "email":
    case "phone_number":
      return (nv[ntype] as string) ?? null;
    case "select":
    case "status": {
      const v = nv[ntype] as { id?: string } | null;
      return v?.id ?? null;
    }
    case "multi_select":
      return ((nv.multi_select as Array<{ id: string }>) ?? []).map((o) => o.id);
    case "date": {
      const v = nv.date as { start?: string } | null;
      return { date: v?.start };
    }
    case "people":
      return ((nv.people as Array<{ id: string }>) ?? []).map((u) => u.id);
    case "files":
      return ((nv.files as Array<{ external?: { url?: string }; file?: { url?: string } }>) ?? [])
        .map((f) => f.external?.url ?? f.file?.url ?? "")
        .filter(Boolean);
    case "relation":
      return ((nv.relation as Array<{ id: string }>) ?? []).map((r) => r.id);
    case "unique_id":
      return (nv.unique_id as { number?: number } | null)?.number ?? null;
    case "verification": {
      const v = nv.verification as {
        state?: string;
        verified_by?: { id?: string } | null;
        date?: { start?: string } | null;
      } | null;
      if (!v) return null;
      const at = v.date?.start ? Date.parse(v.date.start) : undefined;
      return {
        verified: v.state === "verified",
        by: v.verified_by?.id,
        at: Number.isFinite(at) ? at : undefined,
      };
    }
    default:
      return null;
  }
}
