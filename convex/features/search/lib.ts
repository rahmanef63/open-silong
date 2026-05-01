/** Recursively flatten Block.text + nested children + columns text into a single string.
 *  Used to denormalize searchText on every page write so Convex searchIndex
 *  can match content, not just title. Truncated to keep index docs small. */
const MAX_LEN = 8000;

interface BlockLike {
  text?: string;
  caption?: string;
  children?: BlockLike[];
  columns?: BlockLike[][];
  tableRows?: string[][];
}

export function flattenBlocksText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  const parts: string[] = [];
  walk(blocks as BlockLike[], parts);
  let out = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (out.length > MAX_LEN) out = out.slice(0, MAX_LEN);
  return out;
}

function walk(blocks: BlockLike[], parts: string[]) {
  for (const b of blocks) {
    if (b.text) parts.push(b.text);
    if (b.caption) parts.push(b.caption);
    if (Array.isArray(b.children)) walk(b.children, parts);
    if (Array.isArray(b.columns)) {
      for (const col of b.columns) if (Array.isArray(col)) walk(col, parts);
    }
    if (Array.isArray(b.tableRows)) {
      for (const row of b.tableRows) {
        if (Array.isArray(row)) for (const cell of row) if (cell) parts.push(cell);
      }
    }
  }
}

export function buildSearchText(title: string | undefined, blocks: unknown): string {
  const head = (title ?? "").trim();
  const body = flattenBlocksText(blocks);
  return body ? `${head} ${body}`.trim() : head;
}
