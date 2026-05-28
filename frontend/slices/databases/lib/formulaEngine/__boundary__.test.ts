import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** Publish-contract gate (1.G.1 → publish-readiness lock-in).
 *
 *  The engine directory is lifted VERBATIM into the `rahman-shared` npm
 *  package (FORMULA-ENGINE-API.md §7). For that copy to stay turnkey AND
 *  run inside the Convex / edge runtime (§8 #3), every production source
 *  file under `lib/formulaEngine/` must import ONLY via relative paths.
 *  That single rule proves the directory is:
 *    - zero domain coupling — no `@/shared`, `@/slices`, `@convex`
 *    - zero runtime deps    — no npm (bare) package import
 *    - zero Node built-ins  — no `node:*` / `fs` / `path` (runtime-safe)
 *
 *  Anything else means the directory is no longer liftable as-is. If you
 *  NEED something external, add a host method instead (see
 *  `host.ts::EngineHost`) or thread it through `EvalContext`.
 *
 *  Test files (*.test.ts) + this gate are exempt — they stay in-repo and
 *  may use vitest / node:fs; they don't ship in the package. */
const ENGINE_DIR = join(
  process.cwd(),
  "frontend/slices/databases/lib/formulaEngine",
);

const NODE_BUILTINS: ReadonlySet<string> = new Set([
  "assert", "buffer", "child_process", "crypto", "events", "fs", "http",
  "https", "net", "os", "path", "process", "stream", "url", "util", "zlib",
]);

/** Classify a module specifier; `null` = allowed (relative). */
function classify(spec: string): string | null {
  if (spec.startsWith(".")) return null;
  if (spec.startsWith("@/") || spec.startsWith("@convex")) return "domain import";
  if (spec.startsWith("node:") || NODE_BUILTINS.has(spec)) return "Node built-in";
  return "external npm dependency";
}

/** Pull every static-import specifier out of a source line.
 *  Catches `import … from "x"`, `export … from "x"`, and bare `import "x"`.
 *  Comment lines are skipped so JSDoc prose can mention package names. */
function specifiersOnLine(line: string): string[] {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
    return [];
  }
  const out: string[] = [];
  const fromMatch = /\bfrom\s*["']([^"']+)["']/.exec(line);
  if (fromMatch) out.push(fromMatch[1]);
  const bareMatch = /^\s*import\s+["']([^"']+)["']/.exec(line);
  if (bareMatch) out.push(bareMatch[1]);
  return out;
}

function walkSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walkSourceFiles(full));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (/\.test\.(ts|tsx)$/.test(entry)) continue;
    if (entry.startsWith("__boundary__")) continue;
    out.push(full);
  }
  return out;
}

describe("formulaEngine — publish contract: imports (liftable to rahman-shared)", () => {
  it("every production file imports via relative paths only (zero dep, runtime-safe)", () => {
    const files = walkSourceFiles(ENGINE_DIR);
    expect(files.length).toBeGreaterThan(0);

    const violations: Array<{ file: string; spec: string; reason: string }> = [];
    for (const file of files) {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, i) => {
        for (const spec of specifiersOnLine(line)) {
          const reason = classify(spec);
          if (reason) {
            violations.push({
              file: `${file.slice(file.indexOf("formulaEngine/"))}:${i + 1}`,
              spec,
              reason,
            });
          }
        }
      });
    }
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});
