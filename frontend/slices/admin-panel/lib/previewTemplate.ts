/** Walk template JSON, return human-readable structure summary. Defensive —
 *  any shape error bubbles up as "—" without crashing the editor. */
export function summarizeTemplate(json: unknown): { lines: string[]; ok: boolean } {
  const lines: string[] = [];
  try {
    const j = json as any;
    if (!j?.page) return { lines: ["(no root page)"], ok: false };
    walkPage(j.page, 0, lines);
    return { lines, ok: true };
  } catch {
    return { lines: ["(invalid)"], ok: false };
  }
}

function walkPage(p: any, depth: number, lines: string[]) {
  const pad = "  ".repeat(depth);
  lines.push(`${pad}${p.icon ?? "📄"} ${p.title ?? "(no title)"}`);
  for (const b of p.blocks ?? []) {
    if (b.type === "database") {
      lines.push(`${pad}  · [database] → ${b.databaseRef ?? "?"}`);
    } else {
      const text = typeof b.text === "string" && b.text ? ` "${b.text.slice(0, 40)}"` : "";
      lines.push(`${pad}  · ${b.type}${text}`);
    }
  }
  for (const db of p.databases ?? []) {
    lines.push(`${pad}  📊 ${db.name} (${(db.properties ?? []).length} props, ${(db.seedRows ?? []).length} rows)`);
  }
  for (const c of p.children ?? []) walkPage(c, depth + 1, lines);
}

export interface TemplateTreeNode {
  kind: "page" | "block" | "database";
  icon?: string;
  label: string;
  detail?: string;
  depth: number;
  children?: TemplateTreeNode[];
}

/** Structured tree of the template — pages, blocks, embedded databases. UI
 *  renders this as a collapsible tree (not flat text). */
export function walkTemplateTree(json: unknown): TemplateTreeNode | null {
  try {
    const j = json as any;
    if (!j?.page) return null;
    return pageToNode(j.page, 0);
  } catch {
    return null;
  }
}

function pageToNode(p: any, depth: number): TemplateTreeNode {
  const children: TemplateTreeNode[] = [];
  for (const b of p.blocks ?? []) {
    if (b.type === "database") {
      children.push({
        kind: "database",
        icon: "📊",
        label: `[database] → ${b.databaseRef ?? "?"}`,
        depth: depth + 1,
      });
    } else {
      const text = typeof b.text === "string" && b.text ? `"${b.text.slice(0, 60)}"` : undefined;
      children.push({
        kind: "block",
        label: b.type,
        detail: text,
        depth: depth + 1,
      });
    }
  }
  for (const db of p.databases ?? []) {
    children.push({
      kind: "database",
      icon: "📊",
      label: db.name ?? "(unnamed db)",
      detail: `${(db.properties ?? []).length} props · ${(db.seedRows ?? []).length} rows`,
      depth: depth + 1,
    });
  }
  for (const c of p.children ?? []) children.push(pageToNode(c, depth + 1));
  return {
    kind: "page",
    icon: p.icon ?? "📄",
    label: p.title ?? "(no title)",
    depth,
    children,
  };
}

export interface TemplateStats {
  pages: number;
  blocks: number;
  databases: number;
  seedRows: number;
  blockTypes: Record<string, number>;
}

/** Aggregate counts across the entire template tree. */
export function templateStats(json: unknown): TemplateStats {
  const acc: TemplateStats = {
    pages: 0,
    blocks: 0,
    databases: 0,
    seedRows: 0,
    blockTypes: {},
  };
  try {
    const j = json as any;
    if (!j?.page) return acc;
    countPage(j.page, acc);
  } catch {
    /* defensive */
  }
  return acc;
}

function countPage(p: any, acc: TemplateStats) {
  acc.pages += 1;
  for (const b of p.blocks ?? []) {
    acc.blocks += 1;
    const t = String(b.type ?? "unknown");
    acc.blockTypes[t] = (acc.blockTypes[t] ?? 0) + 1;
    if (b.type === "database") acc.databases += 1;
  }
  for (const db of p.databases ?? []) {
    acc.databases += 1;
    acc.seedRows += (db.seedRows ?? []).length;
  }
  for (const c of p.children ?? []) countPage(c, acc);
}
