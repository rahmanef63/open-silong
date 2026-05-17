#!/usr/bin/env node
/**
 * Generate slice.json + slice.contract.ts for every slice under
 * frontend/slices/. Skips files that already exist (idempotent).
 *
 * Pairs with the existing generate-slice-manifests.mjs which writes
 * slice.manifest.json. Together they fulfill the rr-spec "trio".
 *
 * Each generated stub is intentionally minimal — `title` and
 * `description` get sensible defaults from the slug; humans can flesh
 * out `category`, `deps.shadcn`, `requires.rbac`, etc. afterwards.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const SLICES = path.join(REPO, "frontend", "slices");

const slugs = (await fs.readdir(SLICES, { withFileTypes: true }))
  .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
  .map((e) => e.name);

let writtenJson = 0;
let writtenContract = 0;

for (const slug of slugs) {
  const dir = path.join(SLICES, slug);
  const sliceJsonPath = path.join(dir, "slice.json");
  const contractPath = path.join(dir, "slice.contract.ts");
  const manifestPath = path.join(dir, "slice.manifest.json");

  const title = slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

  if (!(await exists(sliceJsonPath))) {
    const manifest = (await readJson(manifestPath)) ?? {};
    const json = {
      $schema: "https://resource.rahmanef.com/slice-schema.json",
      slug,
      version: "0.1.0",
      category: "uncategorized",
      title,
      description: manifest.description || `${title} slice.`,
      namespace: `@/slices/${slug}`,
      kind: "full",
      frontend: { slicePath: `frontend/slices/${slug}` },
      deps: {
        shared: manifest.deps?.shared ?? [],
        slices: manifest.deps?.slices ?? [],
        convex: manifest.deps?.convex ?? [],
        shadcn: [],
        npm: [],
      },
    };
    await fs.writeFile(sliceJsonPath, JSON.stringify(json, null, 2) + "\n");
    writtenJson += 1;
  }

  if (!(await exists(contractPath))) {
    const manifest = (await readJson(manifestPath)) ?? {};
    const peers = (manifest.deps?.slices ?? [])
      .map((s) => `"${s}"`)
      .join(", ");
    const body = `/**
 * Slice contract for \`${slug}\` — v0.1.0.
 *
 * Auto-generated stub. Fill in \`provides.components\` and refine
 * \`requires.rbac\` / \`requires.env\` once the public API is stable.
 *
 * NOTE: standalone (no defineSliceContract helper required) — keeps
 * the slice portable across repos.
 */
export const contract = {
  id: "${slug}",
  version: "0.1.0",
  requires: {
    auth: "convex" as const,
    rbac: [] as string[],
    env: [] as string[],
    deps: [${peers}] as const,
  },
  provides: {
    components: [] as string[],
  },
  conflicts: [] as string[],
  bidir: {
    syncPolicy: "manual" as const,
    generalization: {
      level: "portable" as const,
      forbiddenTerms: ["rahmanef", "rahmanef.com"] as string[],
      requiredProps: [] as string[],
    },
  },
} as const;
`;
    await fs.writeFile(contractPath, body);
    writtenContract += 1;
  }
}

console.log(`✓ wrote ${writtenJson} slice.json + ${writtenContract} slice.contract.ts (${slugs.length} slices scanned)`);

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
async function readJson(p) {
  try {
    return JSON.parse(await fs.readFile(p, "utf-8"));
  } catch {
    return null;
  }
}
