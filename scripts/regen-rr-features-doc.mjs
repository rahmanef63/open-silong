#!/usr/bin/env node
/**
 * regen-rr-features-doc — auto-rebuild docs/rr-sync/features.md from rr-sync.json.
 *
 * Output:
 *   - Summary table (slice / version / files / shared dup / last sync)
 *   - Per-slice file list (slice/* + shared/*)
 *   - Shared file map (which slices depend on each shared path)
 *
 * Re-run after every sync OR `node scripts/sync-to-rr.mjs --regen-doc`.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const REGISTRY = path.join(REPO, "rr-sync.json");
const DOC = path.join(REPO, "docs", "rr-sync", "features.md");

export async function main() {
  const reg = JSON.parse(await fs.readFile(REGISTRY, "utf8"));
  const tracked = reg.tracked ?? {};
  const slugs = Object.keys(tracked).sort();

  // shared file → consumers map
  const sharedConsumers = new Map();
  for (const slug of slugs) {
    for (const rel of tracked[slug].files) {
      if (!rel.startsWith("frontend/shared/")) continue;
      const arr = sharedConsumers.get(rel) ?? [];
      arr.push(slug);
      sharedConsumers.set(rel, arr);
    }
  }

  const lines = [];
  lines.push("# rr-sync — feature inventory");
  lines.push("");
  lines.push(`> **Auto-generated.** Edit \`rr-sync.json\` (registry) or rerun sync — DO NOT hand-edit this file.`);
  lines.push(`> Regenerate: \`node scripts/sync-to-rr.mjs --regen-doc\``);
  lines.push("");
  lines.push(`Tracked slices: **${slugs.length}**  ·  Source: notion-page-clone  ·  Dest: \`${reg.rrRoot}\``);
  lines.push("");

  if (!slugs.length) {
    lines.push("_No slices tracked yet._ Lift your first slice with `pnpm sync:rr <slice>`.");
    await fs.mkdir(path.dirname(DOC), { recursive: true });
    await fs.writeFile(DOC, lines.join("\n") + "\n");
    return;
  }

  // summary table
  lines.push("## Summary");
  lines.push("");
  lines.push("| slice | version | files | shared (shared+) | last sync |");
  lines.push("|---|---|---|---|---|");
  for (const slug of slugs) {
    const t = tracked[slug];
    const sharedCount = t.files.filter((f) => f.startsWith("frontend/shared/")).length;
    const dupCount = t.files.filter((f) => (sharedConsumers.get(f)?.length ?? 0) >= 2).length;
    lines.push(`| ${slug} | ${t.version ?? "?"} | ${t.files.length} | ${sharedCount} (${dupCount}+) | ${t.syncedAt.slice(0, 10)} |`);
  }
  lines.push("");
  lines.push("- **shared+** = count of shared files this slice depends on that ALSO consumed by another tracked slice. High value = shared infra that must stay coherent.");
  lines.push("");

  // per-slice
  lines.push("## Per-slice file lists");
  lines.push("");
  for (const slug of slugs) {
    const t = tracked[slug];
    lines.push(`### \`${slug}\``);
    lines.push("");
    lines.push(`- **version:** ${t.version ?? "?"}`);
    lines.push(`- **synced:** ${t.syncedAt} (commit \`${(t.syncedFromCommit ?? "?").slice(0, 7)}\`)`);
    lines.push(`- **slicePath:** \`${t.slicePath}\``);
    lines.push("");
    const sliceFiles = t.files.filter((f) => f.startsWith(t.slicePath + "/")).sort();
    const sharedFiles = t.files.filter((f) => f.startsWith("frontend/shared/")).sort();
    const convexFiles = t.files.filter((f) => f.startsWith("convex/")).sort();

    if (sliceFiles.length) {
      lines.push(`**slice files (${sliceFiles.length}):**`);
      lines.push("");
      for (const f of sliceFiles) lines.push(`- \`${f}\``);
      lines.push("");
    }
    if (sharedFiles.length) {
      lines.push(`**shared deps (${sharedFiles.length}):**`);
      lines.push("");
      for (const f of sharedFiles) {
        const cons = sharedConsumers.get(f) ?? [];
        const peers = cons.filter((c) => c !== slug);
        const tag = peers.length ? `  _(also: ${peers.join(", ")})_` : "";
        lines.push(`- \`${f}\`${tag}`);
      }
      lines.push("");
    }
    if (convexFiles.length) {
      lines.push(`**convex deps (${convexFiles.length}):**`);
      lines.push("");
      for (const f of convexFiles) lines.push(`- \`${f}\``);
      lines.push("");
    }
  }

  // shared map (cross-reference)
  lines.push("## Shared file → consumers map");
  lines.push("");
  lines.push("_Files used by 2+ tracked slices. Keep these in sync — corruption here breaks every consumer._");
  lines.push("");
  const dups = [...sharedConsumers.entries()].filter(([_, cons]) => cons.length >= 2);
  if (!dups.length) {
    lines.push("_(none yet — first multi-consumer shared file will surface here)_");
  } else {
    lines.push("| shared file | consumers |");
    lines.push("|---|---|");
    for (const [f, cons] of dups.sort()) {
      lines.push(`| \`${f}\` | ${cons.sort().join(", ")} |`);
    }
  }
  lines.push("");

  await fs.mkdir(path.dirname(DOC), { recursive: true });
  await fs.writeFile(DOC, lines.join("\n") + "\n");
  console.log(`✓ regen ${path.relative(REPO, DOC)}`);
}

// run when invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
