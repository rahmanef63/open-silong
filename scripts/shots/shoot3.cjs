const { chromium } = require("playwright");
const BASE = process.env.SHOT_BASE || "https://silong-os.vercel.app";
const OUT = process.env.SHOT_OUT || "/home/rahman/projects/notion-page-clone/docs/media";
const EMAIL = process.env.SHOT_EMAIL, PASS = process.env.SHOT_PASS;
const log = (...a) => console.log("[shoot3]", ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function shot(page, name) { await sleep(700); await page.screenshot({ path: `${OUT}/${name}.png` }); log("shot", name); }

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth`, { waitUntil: "networkidle" });
  await sleep(1200);
  await page.getByPlaceholder("Email").fill(EMAIL);
  await page.getByPlaceholder("Password").fill(PASS);
  await page.getByRole("button", { name: "Sign in" }).click();
  await sleep(6000);
  log("signed in");

  // Templates dialog
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await sleep(3000);
  try {
    await page.getByText("Templates", { exact: true }).first().click({ timeout: 6000 });
    await sleep(2500);
    await shot(page, "templates");
    await page.keyboard.press("Escape");
  } catch (e) { log("templates fail:", e.message.slice(0, 100)); }

  // Database board view
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await sleep(3000);
  try {
    await page.getByText("Projects", { exact: true }).first().click({ timeout: 6000 });
    await sleep(3500);
    await page.getByText("By status", { exact: true }).first().click({ timeout: 6000 });
    await sleep(3000);
    await shot(page, "database-board");
  } catch (e) { log("board fail:", e.message.slice(0, 100)); }

  // Slash menu
  try {
    const links = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")).filter(Boolean));
    const pageLink = links.find((h) => h && h.includes("/dashboard/p/"));
    await page.goto(`${BASE}${pageLink}`, { waitUntil: "networkidle" });
    await sleep(3500);
    const editor = page.locator("[contenteditable='true']").first();
    await editor.click();
    await page.keyboard.press("Control+End");
    await page.keyboard.press("Enter");
    await sleep(300);
    await page.keyboard.type("/");
    await sleep(1800);
    // scroll the menu into view if needed
    await shot(page, "slash-menu");
  } catch (e) { log("slash fail:", e.message.slice(0, 100)); }

  log("DONE");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
