#!/usr/bin/env node
/** Slice portability auditor — scans every `frontend/slices/<slug>/` for
 *  blockers that prevent re-use of a slice in a different project
 *  (different routes, different role enums, different convex schema,
 *  different env layout).
 *
 *  Categories scanned:
 *    1. ROUTE_LITERAL    — `/dashboard`, `/p/`, `/db/`, `/admin/` baked
 *                          in JSX or string literals (must come from
 *                          `ROUTES`/`ROUTES_ABS` or a config prop).
 *    2. ROLE_ENUM        — `"editor"`/`"viewer"`/`"super-admin"`
 *                          literal in code (must be configurable).
 *    3. CONVEX_TABLE     — `Id<"pages">` / table-name literal outside
 *                          a boundary cast (must accept table names
 *                          via config).
 *    4. ENV_LEAK         — `process.env.NEXT_PUBLIC_*` read inside
 *                          slice code (must arrive via prop).
 *
 *  Usage:
 *    node scripts/audit-portability.mjs           # console summary
 *    node scripts/audit-portability.mjs --json    # per-slice JSON
 *
 *  Idempotent. Re-runnable. Diff the summary across commits to track
 *  generalisation work. */

import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const SLICES_DIR = "frontend/slices";
const ARGS = new Set(process.argv.slice(2));
const JSON_OUT = ARGS.has("--json");

const PATTERNS = [
  {
    id: "ROUTE_LITERAL",
    description: "Hardcoded path literal (use ROUTES or a basePath prop)",
    rx: /["'`](\/dashboard|\/p\/|\/db\/|\/admin\/|\/inbox|\/library|\/trash|\/settings|\/profile)/g,
  },
  {
    id: "ROLE_ENUM",
    description: "Hardcoded role string (route via config.roles)",
    rx: /["'`](super-admin|editor|viewer|owner|moderator)["'`]/g,
    skip: (line) => /\bimport\b|\btype\b/.test(line),
  },
  {
    id: "CONVEX_TABLE",
    description: "Convex table name literal (consumer should be table-name agnostic)",
    rx: /\bId<"(pages|databases|workspaces|userProfiles|snapshots|users)">/g,
  },
  {
    id: "ENV_LEAK",
    description: "Slice reads process.env directly (must arrive via prop)",
    rx: /process\.env\.NEXT_PUBLIC_[A-Z0-9_]+/g,
  },
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx|js|jsx)$/.test(name) && !name.endsWith(".test.ts") && !name.endsWith(".test.tsx")) {
      yield p;
    }
  }
}

function scanFile(file) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  const hits = [];
  for (const p of PATTERNS) {
    p.rx.lastIndex = 0;
    let m;
    while ((m = p.rx.exec(text)) !== null) {
      const lineNo = text.slice(0, m.index).split("\n").length;
      const line = lines[lineNo - 1] ?? "";
      if (p.skip?.(line)) continue;
      hits.push({ category: p.id, line: lineNo, match: m[0].slice(0, 80) });
    }
  }
  return hits;
}

function auditSlice(slug) {
  const sliceDir = join(SLICES_DIR, slug);
  const findings = new Map(); // category → [{file,line,match}]
  for (const file of walk(sliceDir)) {
    const hits = scanFile(file);
    for (const h of hits) {
      const arr = findings.get(h.category) ?? [];
      arr.push({ file: relative(sliceDir, file), line: h.line, match: h.match });
      findings.set(h.category, arr);
    }
  }
  return findings;
}

const slices = readdirSync(SLICES_DIR).filter((n) =>
  statSync(join(SLICES_DIR, n)).isDirectory(),
);

const report = {};
let totalHits = 0;
for (const slug of slices) {
  const findings = auditSlice(slug);
  if (findings.size === 0) {
    report[slug] = { status: "portable", blockers: [], hitCount: 0 };
    continue;
  }
  const blockers = [];
  let count = 0;
  for (const [cat, hits] of findings) {
    count += hits.length;
    const examples = hits.slice(0, 3).map((h) => `${h.file}:${h.line}`);
    blockers.push(`${cat} (${hits.length}× — e.g. ${examples.join(", ")})`);
  }
  report[slug] = {
    status: count > 0 ? "needs-adapter" : "portable",
    blockers,
    hitCount: count,
  };
  totalHits += count;
}

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`\nSlice portability audit — ${slices.length} slices, ${totalHits} blockers\n`);
  const rows = Object.entries(report).sort((a, b) => b[1].hitCount - a[1].hitCount);
  for (const [slug, r] of rows) {
    const badge = r.status === "portable" ? "✓ portable" : `✗ ${r.hitCount} blockers`;
    console.log(`  ${slug.padEnd(28)} ${badge}`);
    if (r.blockers.length > 0) {
      for (const b of r.blockers) console.log(`      · ${b}`);
    }
  }
  console.log("");
}

