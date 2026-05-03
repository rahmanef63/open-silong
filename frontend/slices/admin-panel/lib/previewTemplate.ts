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
