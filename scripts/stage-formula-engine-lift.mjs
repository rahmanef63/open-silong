#!/usr/bin/env node
/**
 * stage-formula-engine-lift — assemble the rahman-shared payload for the
 * formula engine (FORMULA-ENGINE-API.md §7, the 1.G.2 step A publish).
 *
 * The engine at frontend/slices/databases/lib/formulaEngine/ is CI-proven
 * zero-dependency (see __boundary__.test.ts), so the lift is a verbatim
 * copy — this script makes that copy deterministic and prints the exact
 * package.json patch + handoff checklist so the external publish is rote.
 *
 * Usage:
 *   node scripts/stage-formula-engine-lift.mjs            # dry-run (list + patch)
 *   node scripts/stage-formula-engine-lift.mjs --to ../rahman-shared/src/formulaEngine
 *
 * What ships: production .ts only. Test files (*.test.ts, incl. the two
 * gates) stay in this repo's CI for now — test parity moves to rahman-shared
 * in a later step (§8 #4, deferred). The directory has zero runtime deps,
 * so the consumer's bundler tree-shakes; "sideEffects": false is safe.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const ENGINE_DIR = path.join(
  REPO,
  "frontend",
  "slices",
  "databases",
  "lib",
  "formulaEngine",
);

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(`
stage-formula-engine-lift — assemble the rahman-shared formula-engine payload.

Usage:
  node scripts/stage-formula-engine-lift.mjs                 dry-run (list + patch)
  node scripts/stage-formula-engine-lift.mjs --to <dest>     copy payload to <dest>

Args:
  --to <dest>    Destination dir (e.g. ../rahman-shared/src/formulaEngine).
                 Created if absent; production .ts files copied preserving
                 their sub-structure (functions/*, etc.).
`);
  process.exit(0);
}

const toIdx = args.indexOf("--to");
const dest = toIdx !== -1 && args[toIdx + 1] ? path.resolve(args[toIdx + 1]) : null;

const isTest = (name) => /\.test\.tsx?$/.test(name);

/** Production .ts files under the engine dir, relative to ENGINE_DIR. */
async function collectPayload(dir, rel = "") {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const relPath = rel ? path.posix.join(rel, entry.name) : entry.name;
    if (entry.isDirectory()) {
      out.push(...(await collectPayload(path.join(dir, entry.name), relPath)));
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (isTest(entry.name)) continue;
    out.push(relPath);
  }
  return out.sort();
}

const PACKAGE_JSON_PATCH = `
  Apply in rahman-shared/package.json (bump 0.2.0 -> 0.3.0; additive = MINOR):

    {
      "version": "0.3.0",
      "sideEffects": false,
      "exports": {
        ".": "./src/index.ts",
        "./hooks/*": "./src/hooks/*.ts",
        "./lib/*": "./src/lib/*.ts",
        "./formulaEngine": "./src/formulaEngine/index.ts"
      }
    }
`;

const CHECKLIST = `
  Handoff checklist (FORMULA-ENGINE-API.md §7-§8):

  1. rahman-shared repo: drop the copied payload at src/formulaEngine/,
     apply the package.json patch above, commit, publish 0.3.0.
  2. open-silong: pnpm update rahman-shared. Swap the barrel
     frontend/slices/databases/lib/formulaEngine.ts imports
     ./formulaEngine/index -> rahman-shared/formulaEngine. silongHost in
     lib/formula.ts stays consumer-side (unchanged).
  3. Move frontend/slices/databases/lib/convexHost.ts ->
     convex/features/formulas/host.ts, swap its engine import to
     rahman-shared/formulaEngine, then run convex deploy. This VALIDATES
     the only residual unknown: that Convex resolves a .ts subpath export
     (§8 #3). If deploy chokes on .ts, ship a .js build entry for that
     subpath only.
  4. Test parity (§8 #4): bring the engine *.test.ts (incl. __boundary__ +
     __surface__, fixing their hardcoded ENGINE_DIR path) into rahman-shared
     CI; keep a thin proxy test here asserting no consumer leak back in.
  5. After one release of bake time, delete the local lib/formulaEngine/
     (keep on a branch for rollback). Until then it is the source of truth.
`;

async function main() {
  const payload = await collectPayload(ENGINE_DIR);

  console.log(`\nformula-engine lift payload — ${payload.length} production file(s):\n`);
  for (const rel of payload) console.log(`  src/formulaEngine/${rel}`);

  if (dest) {
    for (const rel of payload) {
      const from = path.join(ENGINE_DIR, rel);
      const to = path.join(dest, rel);
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.copyFile(from, to);
    }
    console.log(`\nCopied ${payload.length} file(s) -> ${dest}`);
  } else {
    console.log(`\n(dry-run — pass --to <dest> to copy)`);
  }

  console.log(PACKAGE_JSON_PATCH);
  console.log(CHECKLIST);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
