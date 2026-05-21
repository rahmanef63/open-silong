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
  scanNpmImports,
  loadPackageDeps,
  resolveSrcImport,
  stripJsonComments,
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
// --with-peers: recursively include peer slices declared in the
// manifest. Used by mega-bundles (e.g. the `notion` slice depends on
// editor + databases bundled internally — they get lifted together).
// Skips the wave-order check; peer slices are appended to the file
// list instead. Each peer's own peers are followed recursively.
const withPeers = args.includes("--with-peers");

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

  // wave-order check: every slice-dep must already be tracked, OR the
  // caller passed --with-peers to bundle them into this lift.
  const peerSlices = manifest.deps?.slices ?? [];
  const untracked = peerSlices.filter((s) => !registry.tracked[s]);
  if (untracked.length && !withPeers) {
    console.error(`✗ blocked. peer slices not yet tracked in rr:`);
    for (const u of untracked) console.error(`    - ${u}`);
    console.error(`  lift those first (wave order keeps rr coherent), OR`);
    console.error(`  re-run with --with-peers to bundle them into this lift.`);
    process.exit(1);
  }
  if (withPeers && untracked.length) {
    console.log(`  bundling untracked peer slices (--with-peers):`);
    for (const u of untracked) console.log(`    + ${u}`);
  }

  // 1. resolve full file list (slice + shared + convex, skip _generated)
  const files = [];
  files.push(...(await walkDir(path.join(SLICES_DIR, slice), REPO)));

  // 1a. --with-peers: walk untracked peer slices recursively
  if (withPeers) {
    const queue = [...untracked];
    const seen = new Set([slice, ...untracked]);
    while (queue.length) {
      const peerName = queue.shift();
      const peerManifest = await readManifest(peerName);
      if (peerManifest) {
        for (const p of peerManifest.deps?.slices ?? []) {
          if (!registry.tracked[p] && !seen.has(p)) {
            seen.add(p);
            queue.push(p);
          }
        }
        // Append peer's shared deps to the lift's shared set.
        for (const sh of peerManifest.deps?.shared ?? []) {
          if (!manifest.deps) manifest.deps = {};
          if (!manifest.deps.shared) manifest.deps.shared = [];
          if (!manifest.deps.shared.includes(sh)) manifest.deps.shared.push(sh);
        }
      }
      files.push(...(await walkDir(path.join(SLICES_DIR, peerName), REPO)));
    }
  }

  for (const sh of manifest.deps?.shared ?? []) {
    const resolved = await resolveDepPath(path.join(SHARED_DIR, sh));
    if (!resolved) {
      console.warn(`  ⚠ shared dep missing: shared/${sh}`);
      continue;
    }
    for (const r of resolved) {
      const stat = await fs.stat(r);
      if (stat.isDirectory()) files.push(...(await walkDir(r, REPO)));
      else files.push(path.relative(REPO, r));
    }
  }

  for (const cx of manifest.deps?.convex ?? []) {
    if (cx === "_generated") continue; // skip codegen
    const resolved = await resolveDepPath(path.join(CONVEX_DIR, cx));
    if (!resolved) {
      console.warn(`  ⚠ convex dep missing: convex/${cx}`);
      continue;
    }
    for (const r of resolved) {
      const stat = await fs.stat(r);
      if (stat.isDirectory()) files.push(...(await walkDir(r, REPO)));
      else files.push(path.relative(REPO, r));
    }
  }

  // 2. load tsconfigs + pathMap for dest mapping + import rewriting
  const scrubs = registry.scrubs ?? [];
  const pathMap = registry.pathMap ?? [];
  const skipFiles = registry.skipFiles ?? [];
  const srcCfg = await loadTsconfigPaths(REPO);
  const destCfg = await loadTsconfigPaths(rrRoot);

  // 2a. TRANSITIVE FOLLOWER — walk imports of every file we plan to copy.
  // If an import resolves to a nosion file that's NOT in our copy list AND
  // pathMap doesn't say skip, add it. Recurse until convergence.
  // Closes the "lib/store imports icon-picker but mentions manifest doesn't
  // declare icon-picker" class of break.
  const transitive = await followTransitiveImports(files, srcCfg, pathMap);
  if (transitive.added.length) {
    console.log(`\n  transitive deps auto-included (${transitive.added.length}):`);
    for (const f of transitive.added) console.log(`    + ${f}`);
    files.push(...transitive.added);
  }
  if (transitive.unresolvable.length) {
    console.log(`\n  ⚠ transitive imports we couldn't resolve to a file (${transitive.unresolvable.length}):`);
    for (const u of transitive.unresolvable.slice(0, 10)) console.log(`    ${u.from}: ${u.import}`);
    if (transitive.unresolvable.length > 10) console.log(`    ... +${transitive.unresolvable.length - 10} more`);
    console.log(`  → likely need pathMap entry OR target file moved/renamed`);
  }

  // filter out skipFiles — three patterns:
  //   "foo.ts"   → exact basename match
  //   "*.test.ts" → suffix wildcard
  //   "convexAdapter/" → directory match (any file under a path
  //                      segment named "convexAdapter")
  const skipMatch = (rel) => {
    const base = path.basename(rel);
    const segments = rel.split("/");
    for (const p of skipFiles) {
      if (p === base) return true;
      if (p.startsWith("*.") && base.endsWith(p.slice(1))) return true;
      if (p.endsWith("/") && segments.includes(p.slice(0, -1))) return true;
    }
    return false;
  };
  const filteredFiles = files.filter((rel) => !skipMatch(rel));
  const skippedByName = files.filter((rel) => skipMatch(rel));

  // 3. per-file: resolve dest path, apply scrubs + import rewrites, hash, copy
  const report = { added: [], updated: [], skipped: [], conflicts: [], skipNpm: [] };
  const unresolvedImports = new Map(); // file → string[]
  const filesTracked = []; // src-rel paths that ended up in registry (non-SKIP_NPM)
  const fileDestMap = {}; // src-rel → dest-rel for registry
  const npmPkgsUsed = new Set(); // bare npm pkgs imported by copied files

  for (const srcRel of filteredFiles) {
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
      // track bare npm pkg deps for cross-check vs rr package.json
      for (const p of scanNpmImports(text, srcCfg)) npmPkgsUsed.add(p);
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
  if (skippedByName.length) {
    console.log(`\n  skipped by name (${skippedByName.length}, see rr-sync.json.skipFiles):`);
    for (const f of skippedByName) console.log(`    ${f}`);
  }
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

  // npm-deps cross-check vs rr/package.json
  const nosionDeps = await loadPackageDeps(REPO);
  const rrDeps = await loadPackageDeps(rrRoot);
  // include rahman-shared if any SKIP_NPM mapping was hit
  for (const r of report.skipNpm) {
    if (r.package?.startsWith("rahman-")) {
      const root = r.package.split("/")[0];
      npmPkgsUsed.add(root);
    }
  }
  const missing = [];
  const mismatch = [];
  for (const pkg of [...npmPkgsUsed].sort()) {
    if (!rrDeps[pkg]) {
      const nosionVer = nosionDeps[pkg] ?? "(not in nosion either)";
      missing.push({ pkg, suggestedVer: nosionVer });
    } else if (nosionDeps[pkg] && rrDeps[pkg] !== nosionDeps[pkg]) {
      mismatch.push({ pkg, rrVer: rrDeps[pkg], nosionVer: nosionDeps[pkg] });
    }
  }
  if (missing.length) {
    console.log(`\n  ⚠ rr is MISSING npm deps (${missing.length}):`);
    for (const m of missing) console.log(`    ${m.pkg}  →  add ${m.suggestedVer}`);
    console.log(`  → cd ${rrRoot} && pnpm add ${missing.map((m) => m.suggestedVer.startsWith("(") ? m.pkg : `${m.pkg}@${m.suggestedVer}`).join(" ")}`);
  }
  if (mismatch.length) {
    console.log(`\n  ⓘ version drift (${mismatch.length}, not blocking):`);
    for (const m of mismatch) console.log(`    ${m.pkg}  rr:${m.rrVer}  nosion:${m.nosionVer}`);
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

/**
 * Transitive-import follower.
 *
 * Walk every text file in `seed`, scan its import literals, resolve each
 * via srcCfg, apply pathMap. If the resolved file is NOT already in our
 * copy set AND pathMap doesn't say skip → add it and recurse.
 *
 * Returns { added: [], unresolvable: [{from, import}] }.
 */
async function followTransitiveImports(seed, srcCfg, pathMap) {
  const inSet = new Set(seed);
  const added = [];
  const unresolvable = [];
  const queue = [...seed];
  const visited = new Set();
  const importRegex = /(\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*)(['"`])([^'"`]+)\2/g;

  while (queue.length) {
    const rel = queue.shift();
    if (visited.has(rel)) continue;
    visited.add(rel);
    const abs = path.join(REPO, rel);
    if (!isTextFile(rel) || !(await exists(abs))) continue;

    const stripped = stripJsonComments(await fs.readFile(abs, "utf8"));
    let m;
    while ((m = importRegex.exec(stripped)) !== null) {
      const imp = m[3];
      // relative imports → resolve to neighbor file in same dir tree
      if (imp.startsWith(".")) {
        const neighbour = await resolveRelativeImport(abs, imp);
        if (!neighbour) continue;
        const nrel = path.relative(REPO, neighbour);
        if (!inSet.has(nrel) && nrel.startsWith("frontend/")) {
          inSet.add(nrel);
          added.push(nrel);
          queue.push(nrel);
        }
        continue;
      }
      if (!imp.startsWith("@")) continue; // bare npm pkg
      const resolved = resolveSrcImport(imp, srcCfg);
      if (!resolved) continue;
      // Skip convex codegen — regenerated per-project on dest
      if (resolved.repoRelPath.startsWith("convex/_generated")) continue;
      // Apply pathMap to know if it's skip-able (npm pkg or alias-skip)
      const mapped = applyPathMap(resolved.repoRelPath, pathMap);
      if (mapped.skip) continue;
      // Find actual file(s) at nosion (may be [file, dir] for barrel pattern)
      const targets = await resolveDepPath(path.join(REPO, resolved.repoRelPath));
      if (!targets) {
        unresolvable.push({ from: rel, import: imp });
        continue;
      }
      for (const target of targets) {
        const stat = await fs.stat(target);
        const newFiles = stat.isDirectory()
          ? (await walkDir(target, REPO)).filter((f) => !f.includes("/_generated/"))
          : [path.relative(REPO, target)];
        for (const nrel of newFiles) {
          if (nrel.includes("/_generated/")) continue;
          if (!inSet.has(nrel)) {
            inSet.add(nrel);
            added.push(nrel);
            queue.push(nrel);
          }
        }
      }
    }
  }
  return { added, unresolvable };
}

async function resolveRelativeImport(fromAbs, importStr) {
  const baseDir = path.dirname(fromAbs);
  const target = path.resolve(baseDir, importStr);
  if (await exists(target)) {
    const s = await fs.stat(target);
    if (s.isFile()) return target;
    // dir → look for index.ts/tsx/js
    for (const idx of ["index.ts", "index.tsx", "index.js"]) {
      const cand = path.join(target, idx);
      if (await exists(cand)) return cand;
    }
  }
  for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs"]) {
    if (await exists(target + ext)) return target + ext;
  }
  return null;
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

// Resolve a manifest dep entry to actual file(s) at nosion.
// Mirrors TS bundler resolution: file beats dir of same name.
// Returns array — may be 1 (file) or 2 (file + sibling dir barrel pattern).
//
// e.g. `frontend/shared/lib/store` matches BOTH:
//   - file: frontend/shared/lib/store.tsx (barrel re-export)
//   - dir:  frontend/shared/lib/store/ (impl files barrel re-exports from)
// Both need copying.
async function resolveDepPath(p) {
  const out = [];
  // Try extension fallbacks first (file form)
  for (const ext of [".ts", ".tsx", ".js", ".mjs", ".jsx"]) {
    if (await exists(p + ext)) {
      out.push(p + ext);
      break;
    }
  }
  // Also try the dir form (may coexist with barrel file)
  if (await exists(p)) {
    const s = await fs.stat(p);
    if (s.isDirectory()) out.push(p);
    else if (!out.length) out.push(p);
  }
  // index.ts inside dir if dir but no barrel sibling
  if (!out.length) {
    for (const idx of ["index.ts", "index.tsx", "index.js"]) {
      const cand = path.join(p, idx);
      if (await exists(cand)) {
        out.push(path.dirname(cand));
        break;
      }
    }
  }
  return out.length === 0 ? null : out;
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
