#!/usr/bin/env node
/** Mass backfill `.kitab.json` consumer manifests across every slice under
 *  `frontend/slices/<slug>/`. Idempotent — skips slices that already have
 *  a manifest. Run once after CLAUDE.md mandate (2026-05-15) lands. */

import { readdirSync, existsSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SLICES_DIR = "frontend/slices";
const AUDIT_DATE = "2026-05-16";

const slices = readdirSync(SLICES_DIR).filter((name) => {
  const path = join(SLICES_DIR, name);
  return statSync(path).isDirectory();
});

let created = 0;
let skipped = 0;

for (const slug of slices) {
  const path = join(SLICES_DIR, slug, ".kitab.json");
  if (existsSync(path)) {
    skipped++;
    continue;
  }
  const body = {
    $schema: "https://resource.rahmanef.com/schemas/kitab-consumer.json",
    kitabSlug: slug,
    kitabVersion: "0.0.0",
    consumerVersion: "0.1.0",
    // Safe default: passive consumer until audited. Flip to "bidirectional"
    // after `/rr-prep <slug>` passes the generalisation gate.
    syncDirection: "down-only",
    generalization: {
      status: "needs-adapter",
      auditedAt: AUDIT_DATE,
      blockers: [
        "unaudited - mass backfill, run /rr-prep before push UP",
      ],
    },
    lastPullAt: null,
    lastPushAt: null,
  };
  writeFileSync(path, JSON.stringify(body, null, 2) + "\n");
  created++;
}

console.log(`kitab backfill: created ${created}, skipped ${skipped} (already present)`);
