/**
 * rr-paths — auto-derived tsconfig alias rewriting for rr-sync.
 *
 * Each sync run loads BOTH tsconfigs (source + dest) fresh, so when EITHER
 * project updates its paths, the next sync stays current. Dynamic but safe:
 * unresolvable imports are left as-is and surfaced as warnings.
 *
 * Algorithm per import path in copied file:
 *   1. Match src import (e.g. "@/slices/wiki") to a src alias key
 *      → resolve to repo-relative path (e.g. "frontend/slices/wiki")
 *   2. Apply pathMap (e.g. frontend/slices → frontend/slices, no-op for slices;
 *      but frontend/shared/lib/store → lib/shared/store)
 *   3. Find shortest dest alias key that maps to the dest path
 *      → return canonical dest import (e.g. "@/features/wiki" or "@/shared/store")
 *   4. If pathMap entry is SKIP_NPM, return its `package` string instead
 *
 * Unknown patterns → return null + warning. Importer leaves original as-is.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

// String-aware comment stripper for JSONC tsconfigs. Handles // and /* */
// without consuming glob patterns like "app/**/*.ts" inside string literals.
function stripJsonComments(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  let inStr = false;
  let strCh = "";
  while (i < n) {
    const ch = src[i];
    const next = i + 1 < n ? src[i + 1] : "";
    if (inStr) {
      if (ch === "\\" && i + 1 < n) {
        out += ch + next;
        i += 2;
        continue;
      }
      if (ch === strCh) {
        inStr = false;
      }
      out += ch;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      strCh = ch;
      out += ch;
      i++;
      continue;
    }
    if (ch === "/" && next === "/") {
      // line comment
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      // block comment
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * Parse a JSON-with-comments tsconfig.json.
 * Returns { paths: { aliasKey: [dirAbs, ...] }, baseUrlAbs }
 */
export async function loadTsconfigPaths(repoRoot) {
  const p = path.join(repoRoot, "tsconfig.json");
  const raw = await fs.readFile(p, "utf8");
  const cleaned = stripJsonComments(raw).replace(/,(\s*[}\]])/g, "$1");
  const cfg = JSON.parse(cleaned);
  const co = cfg.compilerOptions ?? {};
  const baseUrl = co.baseUrl ?? ".";
  const baseUrlAbs = path.resolve(repoRoot, baseUrl);
  const paths = {};
  for (const [k, arr] of Object.entries(co.paths ?? {})) {
    // alias key like "@/shared/*" → strip trailing /*
    const aliasPrefix = k.endsWith("/*") ? k.slice(0, -2) : k;
    paths[aliasPrefix] = arr.map((v) => {
      const stripped = v.endsWith("/*") ? v.slice(0, -2) : v;
      const abs = path.resolve(baseUrlAbs, stripped);
      return { abs, rel: path.relative(repoRoot, abs) };
    });
  }
  return { paths, baseUrlAbs };
}

/**
 * Given a source import string, resolve it to a repo-relative path using src tsconfig.
 * Returns { repoRelPath, alias, suffix } or null if not an alias.
 */
export function resolveSrcImport(importStr, srcCfg) {
  // longest alias match
  const aliases = Object.keys(srcCfg.paths).sort((a, b) => b.length - a.length);
  for (const aliasPrefix of aliases) {
    if (importStr === aliasPrefix || importStr.startsWith(aliasPrefix + "/")) {
      const suffix = importStr.slice(aliasPrefix.length).replace(/^\//, "");
      const target = srcCfg.paths[aliasPrefix][0]; // first candidate is canonical
      const repoRelPath = suffix ? path.join(target.rel, suffix) : target.rel;
      return { repoRelPath, alias: aliasPrefix, suffix };
    }
  }
  return null;
}

/**
 * Apply pathMap (longest-prefix wins) to a repo-relative path.
 * Returns { destRel, skipNpm: false } or { skipNpm: true, package }.
 */
export function applyPathMap(repoRelPath, pathMap) {
  const sorted = [...pathMap].sort((a, b) => b.from.length - a.from.length);
  for (const entry of sorted) {
    const from = entry.from.replace(/\/$/, "");
    // Match: exact, dir-prefix, OR from+ext (file w/ extension)
    let suffix = null;
    let matchExt = ""; // file ext if matched via +ext (preserve on dest)
    if (repoRelPath === from) suffix = "";
    else if (repoRelPath.startsWith(from + "/")) suffix = repoRelPath.slice(from.length + 1);
    else {
      for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs"]) {
        if (repoRelPath === from + ext) { suffix = ""; matchExt = ext; break; }
      }
    }
    if (suffix === null) continue;

    // Legacy SKIP_NPM form (importAs has no extension)
    if (entry.to === "SKIP_NPM") {
      const pkg = entry.package;
      if (!pkg) throw new Error(`pathMap entry ${entry.from} has to=SKIP_NPM but no 'package' field`);
      return { skip: true, importAs: suffix ? `${pkg}/${suffix}` : pkg, destRel: null };
    }
    // skip:true form (don't copy, use importAs OR derive from `to`)
    if (entry.skip) {
      if (entry.importAs) {
        return { skip: true, importAs: suffix ? `${entry.importAs}/${suffix}` : entry.importAs, destRel: null };
      }
      const to = entry.to.replace(/\/$/, "");
      const destRel = suffix ? path.join(to, suffix) : to;
      return { skip: true, importAs: null, destRel };
    }
    // copy form — preserve file ext if match was +ext
    const to = entry.to.replace(/\/$/, "");
    let destRel = suffix ? path.join(to, suffix) : to;
    if (matchExt) destRel += matchExt;
    return { skip: false, destRel };
  }
  return { skip: false, destRel: repoRelPath };
}

/**
 * Given a dest-side repo-relative path, find shortest dest alias that maps to it.
 * Returns canonical import string e.g. "@/shared/store" or null if no alias covers.
 */
export function reverseDestAlias(destRel, destCfg) {
  // Try each alias; for multi-candidate aliases (e.g. @/shared/* → [components/shared/*, lib/shared/*])
  // any candidate match works.
  // Prefer most-specific alias (longest alias prefix that produces the shortest result).
  const candidates = [];
  for (const [aliasPrefix, dirs] of Object.entries(destCfg.paths)) {
    for (const dir of dirs) {
      const dirRel = dir.rel;
      // dirRel === "" means alias maps to repo root (e.g. @/* → ./*)
      if (dirRel === "") {
        candidates.push({ aliasPrefix, suffix: destRel });
      } else if (destRel === dirRel) {
        candidates.push({ aliasPrefix, suffix: "" });
      } else if (destRel.startsWith(dirRel + "/")) {
        candidates.push({ aliasPrefix, suffix: destRel.slice(dirRel.length + 1) });
      }
    }
  }
  if (!candidates.length) return null;
  // pick alias with longest prefix (most specific) → if tie, shortest suffix
  candidates.sort((a, b) => {
    const ld = b.aliasPrefix.length - a.aliasPrefix.length;
    if (ld !== 0) return ld;
    return a.suffix.length - b.suffix.length;
  });
  const best = candidates[0];
  return best.suffix ? `${best.aliasPrefix}/${best.suffix}` : best.aliasPrefix;
}

/**
 * Rewrite all import strings in a JS/TS source file.
 * Returns { content, rewrites: [{from, to}], unresolved: [string] }.
 *
 * Handles:
 *   import ... from "x"
 *   import("x")
 *   require("x")
 *   export ... from "x"
 */
export function rewriteImports(content, srcCfg, destCfg, pathMap) {
  const rewrites = [];
  const unresolved = new Set();
  const importRegex = /(\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*)(['"`])([^'"`]+)\2/g;

  const newContent = content.replace(importRegex, (full, prefix, quote, importPath) => {
    // skip relative imports + bare node modules
    if (importPath.startsWith(".") || (!importPath.startsWith("@") && !importPath.includes("/"))) {
      return full;
    }
    // only rewrite @-aliased OR repo-rooted imports
    if (!importPath.startsWith("@")) return full;

    const resolved = resolveSrcImport(importPath, srcCfg);
    if (!resolved) {
      // looks alias-like but no match → likely external package (e.g. @radix-ui/...)
      return full;
    }

    const mapped = applyPathMap(resolved.repoRelPath, pathMap);
    let newImport;
    if (mapped.importAs) {
      // SKIP with explicit importAs (npm pkg or fully-qualified alias)
      newImport = mapped.importAs;
    } else {
      // copy or skip+derive: reverse the destRel through dest aliases
      newImport = reverseDestAlias(mapped.destRel, destCfg);
      if (!newImport) {
        unresolved.add(importPath);
        return full;
      }
    }

    if (newImport !== importPath) {
      rewrites.push({ from: importPath, to: newImport });
    }
    return `${prefix}${quote}${newImport}${quote}`;
  });

  return { content: newContent, rewrites, unresolved: [...unresolved] };
}

/**
 * Helper for --explain-imports flag: dump the derived alias state.
 */
/**
 * Scan source content for bare npm package imports.
 * Returns array of package names (deduped, normalized to root pkg name
 * — e.g. "@radix-ui/react-dialog" + "@radix-ui/react-dialog/foo" both
 * yield "@radix-ui/react-dialog"; "lodash/get" yields "lodash").
 *
 * Skips relative imports, src-tsconfig aliases, and node:* builtins.
 */
export function scanNpmImports(content, srcCfg) {
  const pkgs = new Set();
  const importRegex = /(\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*)(['"`])([^'"`]+)\2/g;
  const aliases = Object.keys(srcCfg?.paths ?? {}).sort((a, b) => b.length - a.length);
  let m;
  while ((m = importRegex.exec(content)) !== null) {
    const imp = m[3];
    if (imp.startsWith(".") || imp.startsWith("node:") || imp.startsWith("/")) continue;
    let isAlias = false;
    for (const a of aliases) {
      if (imp === a || imp.startsWith(a + "/")) {
        isAlias = true;
        break;
      }
    }
    if (isAlias) continue;
    // bare npm package: strip subpath, keep scope+name
    const parts = imp.split("/");
    const pkg = imp.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
    pkgs.add(pkg);
  }
  return [...pkgs];
}

/**
 * Load a package.json's full dep map (deps + devDeps + peerDeps).
 */
export async function loadPackageDeps(repoRoot) {
  const p = path.join(repoRoot, "package.json");
  const raw = await fs.readFile(p, "utf8");
  const pkg = JSON.parse(raw);
  return {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
  };
}

export function explainAliases(srcCfg, destCfg, pathMap) {
  console.log("\n=== source tsconfig paths ===");
  for (const [k, dirs] of Object.entries(srcCfg.paths)) {
    console.log(`  ${k}/*  →  ${dirs.map((d) => d.rel + "/*").join(", ")}`);
  }
  console.log("\n=== dest tsconfig paths ===");
  for (const [k, dirs] of Object.entries(destCfg.paths)) {
    console.log(`  ${k}/*  →  ${dirs.map((d) => d.rel + "/*").join(", ")}`);
  }
  console.log("\n=== pathMap (longest-prefix wins) ===");
  for (const e of pathMap) {
    if (e.to === "SKIP_NPM") {
      console.log(`  ${e.from}  →  npm: ${e.package}`);
    } else {
      console.log(`  ${e.from}  →  ${e.to}`);
    }
  }
  console.log("");
}
