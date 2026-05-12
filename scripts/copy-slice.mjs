#!/usr/bin/env node
/**
 * copy-slice — port a Nosion slice into another Next 16 / React 19 project.
 *
 * Usage:
 *   node scripts/copy-slice.mjs <slice-name> --to <dest-project>
 *   node scripts/copy-slice.mjs <slice-name> --to ../my-app/src/features
 *
 * What it does:
 *   1. Reads frontend/slices/<slice>/slice.manifest.json (if present).
 *   2. Resolves declared deps:
 *        - shared.* paths    → copied into <dest>/shared/
 *        - convex.* files    → copied into <dest>/convex/ (if present)
 *        - peer slices       → copied recursively under <dest>/<slices-dir>/
 *   3. Copies the slice itself to <dest>/<slice>.
 *   4. Reports what was copied + what manual steps remain
 *      (router basename, store wiring, env vars, schema additions).
 *
 * No magic — slices stay decoupled by following the manifest contract.
 * If a slice has no manifest, copy-slice copies just the slice folder
 * with a warning and prints a grep summary of its likely cross-imports.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const SLICES_DIR = path.join(REPO, "frontend", "slices");
const SHARED_DIR = path.join(REPO, "frontend", "shared");
const CONVEX_DIR = path.join(REPO, "convex");

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help") {
  console.log(`
copy-slice — port a Nosion slice into another project.

Usage:
  node scripts/copy-slice.mjs <slice> --to <dest>
  node scripts/copy-slice.mjs <slice> --to <dest> --slices-dir features

Args:
  <slice>        Name of slice under frontend/slices/
  --to <dest>    Destination directory (will create <dest>/<slice>)
  --slices-dir   Subdir inside dest for slices (default "slices")
  --dry-run      Print what would be copied
`);
  process.exit(0);
}

const slice = args[0];
const toIdx = args.indexOf("--to");
if (toIdx === -1 || !args[toIdx + 1]) {
  console.error("missing --to <dest>");
  process.exit(1);
}
const dest = path.resolve(args[toIdx + 1]);
const slicesDirName = (() => {
  const i = args.indexOf("--slices-dir");
  return i !== -1 ? args[i + 1] : "slices";
})();
const dryRun = args.includes("--dry-run");

const slicePath = path.join(SLICES_DIR, slice);
if (!(await exists(slicePath))) {
  console.error(`slice not found: ${slicePath}`);
  process.exit(1);
}

const manifest = await readManifest(slicePath);

console.log(`\n→ Copying slice "${slice}" → ${dest}`);
if (!manifest) {
  console.warn(`  ⚠ no slice.manifest.json — copying slice folder only.`);
  console.warn(`    Cross-imports (review manually):`);
  await printCrossImports(slicePath);
}

const copied = { slices: new Set(), shared: new Set(), convex: new Set() };
const queue = [slice];
const seen = new Set();

while (queue.length) {
  const current = queue.shift();
  if (seen.has(current)) continue;
  seen.add(current);
  const m = await readManifest(path.join(SLICES_DIR, current));
  await copyDir(
    path.join(SLICES_DIR, current),
    path.join(dest, slicesDirName, current),
  );
  copied.slices.add(current);
  if (m) {
    for (const dep of m.deps?.slices ?? []) queue.push(dep);
    for (const sh of m.deps?.shared ?? []) {
      await copyDepEntry(path.join(SHARED_DIR, sh), path.join(dest, "shared", sh), copied.shared, sh);
    }
    for (const cx of m.deps?.convex ?? []) {
      await copyDepEntry(path.join(CONVEX_DIR, cx), path.join(dest, "convex", cx), copied.convex, cx);
    }
  }
}

console.log(`\n✓ Copied:`);
console.log(`  slices  (${copied.slices.size}): ${[...copied.slices].join(", ")}`);
console.log(`  shared  (${copied.shared.size}): ${[...copied.shared].join(", ")}`);
console.log(`  convex  (${copied.convex.size}): ${[...copied.convex].join(", ")}`);

console.log(`
Next steps in <dest>:
  1. Wrap your layout: <RouterProvider basename="/your-mount">…</RouterProvider>
  2. If using StoreProvider, wrap higher than these slices.
  3. Add convex schema entries for any newly-copied tables (review convex/schema.ts deltas).
  4. Add env vars: NEXT_PUBLIC_CONVEX_URL, CONVEX_DEPLOY_KEY, etc.
  5. Run: npx convex dev (or your equivalent) to regenerate _generated/api.
`);

if (dryRun) console.log(`(dry-run — no files actually written)\n`);

async function readManifest(dir) {
  try {
    const raw = await fs.readFile(path.join(dir, "slice.manifest.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function copyDir(src, dst) {
  if (dryRun) {
    console.log(`  copy ${path.relative(REPO, src)} → ${path.relative(process.cwd(), dst)}`);
    return;
  }
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

async function copyFile(src, dst) {
  if (dryRun) {
    console.log(`  copy ${path.relative(REPO, src)} → ${path.relative(process.cwd(), dst)}`);
    return;
  }
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.copyFile(src, dst);
}

async function copyDepEntry(src, dst, set, label) {
  // Try the path as-is, then with .ts/.tsx extensions (manifest entries
  // are typically leafless because import paths drop the extension).
  for (const candidate of [src, src + ".ts", src + ".tsx", src + ".mjs"]) {
    if (!(await exists(candidate))) continue;
    const stat = await fs.stat(candidate);
    if (stat.isDirectory()) {
      await copyDir(candidate, dst);
      set.add(label);
      return;
    }
    const dstWithExt = candidate === src ? dst : dst + path.extname(candidate);
    await copyFile(candidate, dstWithExt);
    set.add(label);
    return;
  }
  console.warn(`  ⚠ dep not found: ${path.relative(REPO, src)}`);
}

async function printCrossImports(dir) {
  const files = await collectFiles(dir);
  const externals = new Set();
  for (const f of files) {
    const src = await fs.readFile(f, "utf-8");
    const re = /from\s+["'](@\/[^"']+)["']/g;
    let m;
    while ((m = re.exec(src))) {
      const path = m[1];
      if (path.startsWith(`@/slices/${slice}`)) continue;
      externals.add(path);
    }
  }
  for (const e of [...externals].sort()) console.warn(`      ${e}`);
}

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
