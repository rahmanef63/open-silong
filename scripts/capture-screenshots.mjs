// Repeatable screenshot capture for docs/media/ via Playwright.
//
// Credentials come from ENV — never hard-code them, never paste them in a
// chat. Run it in YOUR terminal:
//
//   SILONG_EMAIL='you@example.com' SILONG_PASSWORD='••••••' \
//     node scripts/capture-screenshots.mjs
//
// Env:
//   SILONG_EMAIL / SILONG_PASSWORD   required — a seeded (superadmin) account
//   SILONG_URL       base URL     (default https://silong-os.vercel.app)
//   SILONG_HEADLESS  '0' to watch (default headless)
//   SILONG_OUT       output dir   (default docs/media)
//
// ponytail: one flat script, no page-object framework. Each shot is wrapped so
// one failure never aborts the rest.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.SILONG_URL || "https://silong-os.vercel.app").replace(/\/$/, "");
const OUT = resolve(ROOT, process.env.SILONG_OUT || "docs/media");
const EMAIL = process.env.SILONG_EMAIL;
const PASSWORD = process.env.SILONG_PASSWORD;
const HEADLESS = process.env.SILONG_HEADLESS !== "0";

if (!EMAIL || !PASSWORD) {
  console.error("✗ Set SILONG_EMAIL and SILONG_PASSWORD in your environment (not in code).");
  process.exit(1);
}

const shot = async (page, name, path = OUT) => {
  await page.screenshot({ path: `${path}/${name}.png` });
  console.log(`  ✓ ${name}.png`);
};

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: HEADLESS });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45_000);

  // ── sign in ──────────────────────────────────────────────
  console.log(`→ ${BASE}/auth`);
  await page.goto(`${BASE}/auth`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard(\/|$)/, { timeout: 45_000 });
  await page.waitForLoadState("networkidle");
  console.log("  ✓ signed in");

  const go = async (path) => {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
  };
  const safe = async (label, fn) => {
    try { await fn(); } catch (e) { console.log(`  ⚠ skipped ${label}: ${e.message.split("\n")[0]}`); }
  };

  // ── the knowledge graph (the priority) ───────────────────
  await safe("graph", async () => {
    await go("/dashboard/graph");
    await page.waitForTimeout(4500); // let the d3-force sim settle
    // frame the whole cloud, then let it re-settle
    await page.locator('button[aria-label="Zoom to fit"]').click().catch(() => {});
    await page.waitForTimeout(1800);
    await shot(page, "graph");
    // again with the Forces controls panel open, to showcase the controls
    await page.locator('button[aria-label="Graph controls"]').click().catch(() => {});
    await page.waitForTimeout(700);
    await shot(page, "graph-controls");
  });

  // ── refresh the standard set ─────────────────────────────
  await safe("dashboard", async () => { await go("/dashboard"); await shot(page, "dashboard"); });
  await safe("library", async () => { await go("/dashboard/library"); await shot(page, "library"); });
  await safe("admin", async () => { await go("/dashboard/admin"); await shot(page, "admin"); });

  // first page in the sidebar → editor.png
  await safe("editor", async () => {
    await go("/dashboard");
    const link = page.locator('a[href*="/dashboard/p/"]').first();
    await link.click({ timeout: 8000 });
    await page.waitForURL(/\/dashboard\/p\//);
    await page.waitForTimeout(1500);
    await shot(page, "editor");
  });
  // first database in the sidebar → database.png
  await safe("database", async () => {
    await go("/dashboard");
    const link = page.locator('a[href*="/dashboard/db/"]').first();
    await link.click({ timeout: 8000 });
    await page.waitForURL(/\/dashboard\/db\//);
    await page.waitForTimeout(1500);
    await shot(page, "database");
  });

  // ── dark mode dashboard ──────────────────────────────────
  await safe("dashboard-dark", async () => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => {
      try { localStorage.setItem("theme", "dark"); } catch {}
    });
    await go("/dashboard");
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(800);
    await shot(page, "dashboard-dark");
  });

  await browser.close();
  console.log(`\nDone → ${OUT}`);
}

main().catch((e) => { console.error("✗", e); process.exit(1); });
