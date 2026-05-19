#!/usr/bin/env node
/**
 * sync-to-rr — incremental sync of a slice (+ its shared deps) from
 * notion-page-clone to ~/projects/resources (rr).
 *
 * Verbs:
 *   node scripts/sync-to-rr.mjs <slice>            # sync one slice
 *   node scripts/sync-to-rr.mjs <slice> --dry-run  # preview only
 *   node scripts/sync-to-rr.mjs <slice> --force    # overwrite rr-side local edits
 *   node scripts/sync-to-rr.mjs --regen-doc        # rebuild docs/rr-sync/features.md
 *   node scripts/sync-to-rr.mjs --list             # list tracked slices
 *
 * Contract:
 *   - SSOT for slice surface = frontend/slices/<slice>/slice.manifest.json
 *   - Resolves deps.shared[] → frontend/shared/<path> (recursive dir copy)
 *   - Resolves deps.slices[] → must already be tracked (else block — wave order)
 *   - Skips convex/_generated always (per-project codegen)
 *   - Per-file hash in rr-sync.json.fileHashes — drift detect on re-sync
 *   - Scrubs (nosion→host) applied on copy
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  loadTsconfigPaths,
  applyPathMap,
  rewriteImports,
  explainAliases,
} from "./_lib/rr-paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const SLICES_DIR = path.join(REPO, "frontend", "slices");
const SHARED_DIR = path.join(REPO, "frontend", "shared");
const CONVEX_DIR = path.join(REPO, "convex");
const REGISTRY = path.join(REPO, "rr-sync.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const explain = args.includes("--explain-imports");

if (args[0] === "--regen-doc") {
  await (await import("./regen-rr-features-doc.mjs")).main();
  process.exit(0);
}

if (args[0] === "--explain-imports") {
  const reg = await loadRegistry();
  const rrRoot = expandHome(reg.rrRoot);
  const srcCfg = await loadTsconfigPaths(REPO);
  const destCfg = await loadTsconfigPaths(rrRoot);
  explainAliases(srcCfg, destCfg, reg.pathMap ?? []);
  process.exit(0);
}

if (args[0] === "--list") {
  const r = await loadRegistry();
  const names = Object.keys(r.tracked);
  if (!names.length) {
    console.log("(no tracked slices yet)");
  } else {
    console.log("Tracked slices:");
    for (const n of names) {
      const t = r.tracked[n];
      console.log(`  ${n.padEnd(24)} files=${t.files.length}  last=${t.syncedAt}`);
    }
  }
  process.exit(0);
}

const slice = args[0];
if (!slice || slice.startsWith("--")) {
  console.error("usage: node scripts/sync-to-rr.mjs <slice> [--dry-run] [--force]");
  process.exit(1);
}

await main();

async function main() {
  const registry = await loadRegistry();
  const rrRoot = expandHome(registry.rrRoot);
  if (!(await exists(rrRoot))) {
    console.error(`✗ rrRoot does not exist: ${rrRoot}`);
    console.error(`  fix in rr-sync.json`);
    process.exit(1);
  }

  console.log(`\n→ sync slice "${slice}" → ${rrRoot}`);

  const manifest = await readManifest(slice);
  if (!manifest) {
    console.error(`✗ no slice.manifest.json for ${slice}`);
    process.exit(1);
  }

  // wave-order check: every slice-dep must already be tracked
  const peerSlices = manifest.deps?.slices ?? [];
  const untracked = peerSlices.filter((s) => !registry.tracked[s]);
  if (untracked.length) {
    console.error(`✗ blocked. peer slices not yet tracked in rr:`);
    for (const u of untracked) console.error(`    - ${u}`);
    console.error(`  lift those first (wave order keeps rr coherent).`);
    process.exit(1);
  }

  // 1. resolve full file list (slice + shared + convex, skip _generated)
  const files = [];
  files.push(...(await walkDir(path.join(SLICES_DIR, slice), REPO)));

  for (const sh of manifest.deps?.shared ?? []) {
    const resolved = await resolveDepPath(path.join(SHARED_DIR, sh));
    if (!resolved) {
      console.warn(`  ⚠ shared dep missing: shared/${sh}`);
      continue;
    }
    const stat = await fs.stat(resolved);
    if (stat.isDirectory()) files.push(...(await walkDir(resolved, REPO)));
    else files.push(path.relative(REPO, resolved));
  }

  for (const cx of manifest.deps?.convex ?? []) {
    if (cx === "_generated") continue; // skip codegen
    const resolved = await resolveDepPath(path.join(CONVEX_DIR, cx));
    if (!resolved) {
      console.warn(`  ⚠ convex dep missing: convex/${cx}`);
      continue;
    }
    const stat = await fs.stat(resolved);
    if (stat.isDirectory()) files.push(...(await walkDir(resolved, REPO)));
    else files.push(path.relative(REPO, resolved));
  }

  // 2. load tsconfigs + pathMap for dest mapping + import rewriting
  const scrubs = registry.scrubs ?? [];
  const pathMap = registry.pathMap ?? [];
  const srcCfg = await loadTsconfigPaths(REPO);
  const destCfg = await loadTsconfigPaths(rrRoot);

  // 3. per-file: resolve dest path, apply scrubs + import rewrites, hash, copy
  const report = { added: [], updated: [], skipped: [], conflicts: [], skipNpm: [] };
  const unresolvedImports = new Map(); // file → string[]
  const filesTracked = []; // src-rel paths that ended up in registry (non-SKIP_NPM)
  const fileDestMap = {}; // src-rel → dest-rel for registry

  for (const srcRel of files) {
    const mapped = applyPathMap(srcRel, pathMap);
    if (mapped.skip) {
      report.skipNpm.push({ srcRel, package: mapped.importAs ?? `(use rr-side ${mapped.destRel})` });
      continue;
    }
    const destRel = mapped.destRel;
    const srcAbs = path.join(REPO, srcRel);
    const dstAbs = path.join(rrRoot, destRel);

    // read + scrub + import-rewrite (text files only)
    let srcContent = await readScrubbed(srcAbs, scrubs);
    if (isTextFile(srcRel)) {
      const text = srcContent.toString("utf8");
      const rw = rewriteImports(text, srcCfg, destCfg, pathMap);
      if (rw.unresolved.length) unresolvedImports.set(srcRel, rw.unresolved);
      if (rw.rewrites.length) srcContent = Buffer.from(rw.content, "utf8");
    }

    const srcHash = sha(srcContent);
    const lastHash = registry.fileHashes[srcRel];
    const dstExists = await exists(dstAbs);
    const dstHash = dstExists ? sha(await fs.readFile(dstAbs)) : null;

    if (!dstExists) {
      report.added.push({ srcRel, destRel });
      if (!dryRun) {
        await fs.mkdir(path.dirname(dstAbs), { recursive: true });
        await fs.writeFile(dstAbs, srcContent);
      }
    } else if (dstHash === srcHash) {
      report.skipped.push({ srcRel, destRel });
    } else if (lastHash && dstHash === lastHash) {
      report.updated.push({ srcRel, destRel });
      if (!dryRun) await fs.writeFile(dstAbs, srcContent);
    } else {
      report.conflicts.push({ srcRel, destRel });
      if (force && !dryRun) await fs.writeFile(dstAbs, srcContent);
    }
    registry.fileHashes[srcRel] = srcHash;
    filesTracked.push(srcRel);
    fileDestMap[srcRel] = destRel;
  }

  // 4. emit report
  const fmt = (label, arr) =>
    arr.length
      ? `\n  ${label} (${arr.length}):\n${arr.map((r) => `    ${r.srcRel}  →  ${r.destRel}`).join("\n")}`
      : "";
  console.log(fmt("added", report.added));
  console.log(fmt("updated", report.updated));
  if (report.skipNpm.length) {
    console.log(`\n  npm-skipped (use package on rr-side, ${report.skipNpm.length}):`);
    for (const r of report.skipNpm) console.log(`    ${r.srcRel}  →  npm: ${r.package}`);
  }
  if (report.conflicts.length) {
    console.log(`\n  ⚠ conflicts (${report.conflicts.length}) — rr-side diverged from last sync:`);
    for (const c of report.conflicts) console.log(`    ${c.srcRel}  →  ${c.destRel}`);
    if (!force) {
      console.log(`\n  → resolve manually OR rerun with --force to overwrite rr-side.`);
      console.log(`  → registry NOT updated (conflicts unresolved).`);
      if (dryRun) console.log(`  (dry-run: nothing changed)`);
      process.exit(2);
    }
  }
  if (unresolvedImports.size) {
    console.log(`\n  ⚠ unresolved imports (${unresolvedImports.size} files) — left as-is:`);
    for (const [f, ims] of unresolvedImports) {
      console.log(`    ${f}: ${ims.join(", ")}`);
    }
    console.log(`  → may need pathMap or rr tsconfig update`);
  }
  console.log(`\n  skipped (already in sync): ${report.skipped.length}`);

  if (dryRun) {
    console.log("\n(dry-run: registry NOT updated)");
    process.exit(0);
  }

  // 5. update registry
  registry.tracked[slice] = {
    version: manifest.version ?? "0.1.0",
    syncedAt: new Date().toISOString(),
    syncedFromCommit: await gitSha(),
    slicePath: `frontend/slices/${slice}`,
    files: filesTracked,
    fileDestMap,
    skipNpm: report.skipNpm.map((r) => r.srcRel),
  };
  await fs.writeFile(REGISTRY, JSON.stringify(registry, null, 2) + "\n");

  // 5. regen doc
  await (await import("./regen-rr-features-doc.mjs")).main();

  // 6. suggest rr-side commit
  const totalChanged = report.added.length + report.updated.length + (force ? report.conflicts.length : 0);
  console.log(`\n✓ sync done. ${totalChanged} files changed in rr.`);

  // collect top-level dest dirs touched, for git add suggestion
  const destDirs = new Set();
  for (const r of [...report.added, ...report.updated, ...(force ? report.conflicts : [])]) {
    const top = r.destRel.split("/").slice(0, 2).join("/");
    destDirs.add(top);
  }
  console.log(`\nSuggested rr-side commit:`);
  console.log(`  cd ${rrRoot}`);
  console.log(`  git add ${[...destDirs].sort().join(" ")}`);
  console.log(`  git commit -m "feat(${slice}): sync from notion-page-clone@${(await gitSha()).slice(0, 7)}"`);
  console.log(`  git push origin main`);
}

function isTextFile(p) {
  return /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|scss|html|txt|yml|yaml)$/i.test(p);
}

// ───── helpers ─────

async function loadRegistry() {
  const raw = await fs.readFile(REGISTRY, "utf8");
  return JSON.parse(raw);
}

async function readManifest(name) {
  const p = path.join(SLICES_DIR, name, "slice.manifest.json");
  if (!(await exists(p))) return null;
  return JSON.parse(await fs.readFile(p, "utf8"));
}

// Resolve a manifest dep entry to an actual file/dir.
// Tries: exact path, .ts, .tsx, .js, .mjs, /index.ts, /index.tsx
async function resolveDepPath(p) {
  if (await exists(p)) return p;
  for (const ext of [".ts", ".tsx", ".js", ".mjs", ".jsx"]) {
    if (await exists(p + ext)) return p + ext;
  }
  for (const idx of ["index.ts", "index.tsx", "index.js"]) {
    const cand = path.join(p, idx);
    if (await exists(cand)) return path.dirname(cand); // copy the whole dir
  }
  return null;
}

async function walkDir(dir, repoRoot) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "_generated" || e.name === "node_modules" || e.name === ".next") continue;
      out.push(...(await walkDir(abs, repoRoot)));
    } else if (e.isFile()) {
      out.push(path.relative(repoRoot, abs));
    }
  }
  return out;
}

async function readScrubbed(p, scrubs) {
  const buf = await fs.readFile(p);
  if (!scrubs.length || isBinary(p)) return buf;
  let s = buf.toString("utf8");
  for (const [from, to] of scrubs) {
    s = s.split(from).join(to);
  }
  return Buffer.from(s, "utf8");
}

function isBinary(p) {
  return /\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|pdf|zip)$/i.test(p);
}

function sha(b) {
  return "sha256-" + crypto.createHash("sha256").update(b).digest("hex");
}

async function gitSha() {
  const { execSync } = await import("node:child_process");
  try {
    return execSync("git rev-parse HEAD", { cwd: REPO }).toString().trim();
  } catch {
    return "unknown";
  }
}

function expandHome(p) {
  if (p.startsWith("~/")) return path.join(process.env.HOME ?? "", p.slice(2));
  return p;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
