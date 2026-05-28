import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** 1.G.1 portability gate.
 *
 *  Every file under `lib/formulaEngine/` must be importable from a context
 *  that has no access to `@/shared`, `@convex/`, `@/slices/*`, or anything
 *  else from this repo's domain layer. This is what makes the directory
 *  liftable into the `rahman-shared` npm package without dragging tooling.
 *
 *  Test files (*.test.ts) are exempt — they're co-located here for
 *  proximity but will move to a parallel test dir on extract.
 *
 *  If you NEED a domain type inside the engine, that's a sign you should
 *  add a host method instead (see `host.ts::EngineHost`). */
const ENGINE_DIR = join(
  process.cwd(),
  "frontend/slices/databases/lib/formulaEngine",
);

const FORBIDDEN_PATTERNS: ReadonlyArray<RegExp> = [
  /from\s+["']@\/shared/,
  /from\s+["']@\/slices/,
  /from\s+["']@convex/,
];

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

describe("formulaEngine — portability boundary (1.G.1 gate)", () => {
  it("contains zero domain-layer imports (engine must be liftable to rahman-shared)", () => {
    const files = walkSourceFiles(ENGINE_DIR);
    expect(files.length).toBeGreaterThan(0);

    const violations: Array<{ file: string; line: string; pattern: string }> = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const lines = text.split(/\r?\n/);
      lines.forEach((line, i) => {
        for (const re of FORBIDDEN_PATTERNS) {
          if (re.test(line)) {
            const rel = file.slice(file.indexOf("formulaEngine/"));
            violations.push({
              file: `${rel}:${i + 1}`,
              line: line.trim(),
              pattern: re.source,
            });
          }
        }
      });
    }
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});
