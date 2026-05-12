#!/usr/bin/env node
/**
 * Walks frontend/slices/<slice>/ files, extracts cross-cutting imports
 * (`@/shared/*`, `@/slices/*`, `convex/*`, `@convex/*`), and writes a
 * starter slice.manifest.json next to each slice.
 *
 * Re-runnable. Existing manifests are merged (preserves any hand-edited
 * `description`, `peerOptional`, `notes` fields) — just deps lists get
 * regenerated.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const SLICES = path.join(REPO, "frontend", "slices");

const slices = (await fs.readdir(SLICES, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

let writes = 0;
for (const slice of slices) {
  const dir = path.join(SLICES, slice);
  const files = await collectFiles(dir);
  const deps = { shared: new Set(), slices: new Set(), convex: new Set() };
  for (const f of files) {
    const src = await fs.readFile(f, "utf-8");
    const re = /from\s+["']([^"']+)["']/g;
    let m;
    while ((m = re.exec(src))) {
      const p = m[1];
      if (p.startsWith("@/shared/")) {
        const parts = p.slice("@/shared/".length).split("/");
        deps.shared.add(parts.slice(0, 2).join("/"));
      } else if (p.startsWith("@/slices/")) {
        const peer = p.slice("@/slices/".length).split("/")[0];
        if (peer !== slice) deps.slices.add(peer);
      } else if (p.startsWith("@convex/") || p.includes("convex/_generated")) {
        const tail = p.replace(/^@convex\//, "").replace(/^.*convex\//, "");
        const head = tail.split("/")[0];
        if (head && head !== "_generated") deps.convex.add(head);
        else deps.convex.add("_generated");
      } else if (p.includes("/convex/")) {
        const tail = p.split("/convex/")[1] ?? "";
        const head = tail.split("/")[0];
        if (head && head !== "_generated") deps.convex.add(head);
      }
    }
  }
  const existing = await readJson(path.join(dir, "slice.manifest.json"));
  const next = {
    name: slice,
    description: existing?.description ?? "",
    deps: {
      shared: [...deps.shared].sort(),
      slices: [...deps.slices].sort(),
      convex: [...deps.convex].sort(),
    },
    notes: existing?.notes ?? "",
  };
  await fs.writeFile(
    path.join(dir, "slice.manifest.json"),
    JSON.stringify(next, null, 2) + "\n",
    "utf-8",
  );
  writes += 1;
}
console.log(`✓ wrote ${writes} slice manifests`);

async function collectFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await collectFiles(p));
    else if (/\.(tsx?|mts|cts)$/.test(e.name)) out.push(p);
  }
  return out;
}

async function readJson(p) {
  try { return JSON.parse(await fs.readFile(p, "utf-8")); } catch { return null; }
}
