/* Drive the live open-silong app: sign up, claim superadmin, seed demo,
   then capture README screenshots. Run with playwright from os-browser. */
const { chromium } = require("playwright");

const BASE = process.env.SHOT_BASE || "https://silong-os.vercel.app";
const OUT = process.env.SHOT_OUT || "/home/rahman/projects/notion-page-clone/docs/media";
const EMAIL = process.env.SHOT_EMAIL;
const PASS = process.env.SHOT_PASS;
const NAME = process.env.SHOT_NAME || "Silong Admin";

const log = (...a) => console.log("[shoot]", ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  await sleep(900);
  const p = `${OUT}/${name}.png`;
  await page.screenshot({ path: p, fullPage: false });
  log("shot", name);
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") log("page-err", m.text().slice(0, 160)); });

  // 1. Sign up
  log("goto /auth");
  await page.goto(`${BASE}/auth`, { waitUntil: "networkidle" });
  await sleep(1500);
  // switch to sign up flow
  try { await page.getByRole("button", { name: "Sign up" }).click({ timeout: 5000 }); } catch { log("no signup toggle (maybe already signUp)"); }
  await sleep(500);
  await page.getByPlaceholder("Your name").fill(NAME);
  await page.getByPlaceholder("Email").fill(EMAIL);
  await page.getByPlaceholder("Password").fill(PASS);
  await shot(page, "auth");
  await page.getByRole("button", { name: "Create account" }).click();
  log("submitted signup, waiting for auth...");
  await sleep(6000);
  log("url after signup:", page.url());

  // 2. Setup wizard -> claim -> seed
  log("goto /setup");
  await page.goto(`${BASE}/setup`, { waitUntil: "networkidle" });
  await sleep(3000);
  try {
    await page.getByRole("button", { name: /Klaim sekarang/i }).click({ timeout: 8000 });
    log("claimed");
    await sleep(4000);
  } catch (e) { log("claim button not found:", e.message.slice(0, 80)); }
  try {
    await page.getByRole("button", { name: /Isi data contoh/i }).click({ timeout: 8000 });
    log("seeding...");
    await sleep(12000);
  } catch (e) { log("seed button not found:", e.message.slice(0, 80)); }
  await page.reload({ waitUntil: "networkidle" });
  await sleep(2000);
  await shot(page, "setup");

  // 3. Dashboard
  log("goto /dashboard");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await sleep(4000);
  await shot(page, "dashboard");

  // discover sidebar page + db links
  const links = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")).filter(Boolean));
  const pageLink = links.find((h) => h.includes("/dashboard/p/"));
  const dbLink = links.find((h) => h.includes("/dashboard/db/"));
  log("pageLink", pageLink, "dbLink", dbLink);

  if (pageLink) {
    await page.goto(`${BASE}${pageLink}`, { waitUntil: "networkidle" });
    await sleep(3500);
    await shot(page, "editor");
  }
  if (dbLink) {
    await page.goto(`${BASE}${dbLink}`, { waitUntil: "networkidle" });
    await sleep(3500);
    await shot(page, "database");
  }

  // 4. Library / templates
  await page.goto(`${BASE}/dashboard/library`, { waitUntil: "networkidle" });
  await sleep(3000);
  await shot(page, "library");

  // 5. Admin panel
  await page.goto(`${BASE}/dashboard/admin`, { waitUntil: "networkidle" });
  await sleep(3500);
  await shot(page, "admin");

  // 6. Command palette
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await sleep(3000);
  await page.keyboard.press("Meta+k");
  await sleep(800);
  await page.keyboard.press("Control+k");
  await sleep(1200);
  await shot(page, "command-palette");
  await page.keyboard.press("Escape");

  // 7. Mobile dashboard
  const mp = await ctx.newPage();
  await mp.setViewportSize({ width: 390, height: 844 });
  await mp.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await sleep(4000);
  await mp.screenshot({ path: `${OUT}/mobile-home.png` });
  log("shot mobile-home");

  log("DONE. saved to", OUT);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
