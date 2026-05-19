#!/usr/bin/env node
/**
 * rr-sync-status — report drift between nosion and rr.
 *
 * Modes:
 *   node scripts/rr-sync-status.mjs           # full table
 *   node scripts/rr-sync-status.mjs --nag     # pre-push: print warning only, exit 0 always
 *   node scripts/rr-sync-status.mjs --json    # machine-readable
 *
 * "Dirty" = file in tracked slice changed on nosion side since last sync.
 * "Conflict" = rr-side hash also drifted from last sync (manual merge).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const REGISTRY = path.join(REPO, "rr-sync.json");

const args = process.argv.slice(2);
const nag = args.includes("--nag");
const asJson = args.includes("--json");

const reg = JSON.parse(await fs.readFile(REGISTRY, "utf8"));
const rrRoot = expandHome(reg.rrRoot);
const scrubs = reg.scrubs ?? [];

const result = [];
for (const [slug, entry] of Object.entries(reg.tracked)) {
  const dirty = [];
  const conflict = [];
  const missing = [];

  for (const rel of entry.files) {
    const srcAbs = path.join(REPO, rel);
    const dstAbs = path.join(rrRoot, rel);
    if (!(await exists(srcAbs))) {
      missing.push(rel);
      continue;
    }
    const srcHash = sha(await readScrubbed(srcAbs, scrubs));
    const lastHash = reg.fileHashes[rel];
    const dstHash = (await exists(dstAbs)) ? sha(await fs.readFile(dstAbs)) : null;

    if (srcHash !== lastHash) {
      // nosion side moved
      if (dstHash && dstHash !== lastHash) conflict.push(rel);
      else dirty.push(rel);
    }
  }
  result.push({ slug, dirty: dirty.length, conflict: conflict.length, missing: missing.length, syncedAt: entry.syncedAt, _detail: { dirty, conflict, missing } });
}

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (nag) {
  const stale = result.filter((r) => r.dirty > 0 || r.conflict > 0);
  if (stale.length) {
    console.error("");
    console.error("⚠ rr-sync stale — these tracked slices changed since last sync:");
    for (const s of stale) {
      const tags = [];
      if (s.dirty) tags.push(`${s.dirty} dirty`);
      if (s.conflict) tags.push(`${s.conflict} conflict`);
      console.error(`  - ${s.slug}  (${tags.join(", ")})  →  pnpm sync:rr ${s.slug}`);
    }
    console.error("(push not blocked. resync at your convenience.)");
    console.error("");
  }
  process.exit(0);
}

// default: table
if (!result.length) {
  console.log("(no tracked slices)");
  process.exit(0);
}
console.log("");
console.log("slice                     dirty  conflict  missing  last sync");
console.log("─".repeat(72));
for (const r of result) {
  const tag = r.conflict ? "⚠" : r.dirty ? "·" : "✓";
  console.log(`${tag} ${r.slug.padEnd(22)}  ${String(r.dirty).padStart(5)}  ${String(r.conflict).padStart(8)}  ${String(r.missing).padStart(7)}  ${r.syncedAt.slice(0, 10)}`);
}
console.log("");
const anyDirty = result.some((r) => r.dirty || r.conflict);
if (anyDirty) console.log("→ resync: pnpm sync:rr <slice>");

// ───── helpers ─────
async function readScrubbed(p, scrubs) {
  const buf = await fs.readFile(p);
  if (!scrubs.length || /\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|pdf|zip)$/i.test(p)) return buf;
  let s = buf.toString("utf8");
  for (const [from, to] of scrubs) s = s.split(from).join(to);
  return Buffer.from(s, "utf8");
}
function sha(b) {
  return "sha256-" + crypto.createHash("sha256").update(b).digest("hex");
}
function expandHome(p) {
  return p.startsWith("~/") ? path.join(process.env.HOME ?? "", p.slice(2)) : p;
}
async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}
