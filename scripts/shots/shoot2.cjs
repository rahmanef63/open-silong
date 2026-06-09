/* Second pass: sign in with the seeded admin, capture database view,
   templates gallery, command palette, slash menu, dark-mode hero. */
const { chromium } = require("playwright");

const BASE = process.env.SHOT_BASE || "https://silong-os.vercel.app";
const OUT = process.env.SHOT_OUT || "/home/rahman/projects/notion-page-clone/docs/media";
const EMAIL = process.env.SHOT_EMAIL;
const PASS = process.env.SHOT_PASS;

const log = (...a) => console.log("[shoot2]", ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function shot(page, name) { await sleep(700); await page.screenshot({ path: `${OUT}/${name}.png` }); log("shot", name); }

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  // sign in
  await page.goto(`${BASE}/auth`, { waitUntil: "networkidle" });
  await sleep(1200);
  await page.getByPlaceholder("Email").fill(EMAIL);
  await page.getByPlaceholder("Password").fill(PASS);
  await page.getByRole("button", { name: "Sign in" }).click();
  await sleep(6000);
  log("signed in, url:", page.url());

  // database view — click a database from the dashboard list
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await sleep(3500);
  try {
    await page.getByText("Projects", { exact: true }).first().click({ timeout: 6000 });
    await sleep(3500);
    log("db url:", page.url());
    await shot(page, "database");
  } catch (e) { log("db click fail:", e.message.slice(0, 80)); }

  // templates gallery
  try {
    await page.getByRole("link", { name: /Templates/i }).first().click({ timeout: 6000 });
    await sleep(3500);
    await shot(page, "templates");
  } catch (e) {
    log("templates nav via link failed, trying goto");
    await page.goto(`${BASE}/dashboard/templates`, { waitUntil: "networkidle" }).catch(() => {});
    await sleep(3000);
    await shot(page, "templates");
  }

  // command palette via top-right Search button
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await sleep(3000);
  try {
    await page.getByRole("button", { name: /Search/i }).first().click({ timeout: 5000 });
    await sleep(1200);
    await page.keyboard.type("project");
    await sleep(1500);
    await shot(page, "command-palette");
    await page.keyboard.press("Escape");
  } catch (e) { log("palette fail:", e.message.slice(0, 80)); }

  // slash menu inside a page
  try {
    const links = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")).filter(Boolean));
    const pageLink = links.find((h) => h && h.includes("/dashboard/p/"));
    if (pageLink) {
      await page.goto(`${BASE}${pageLink}`, { waitUntil: "networkidle" });
      await sleep(3500);
      // click at end of an empty block area, type "/"
      const editor = page.locator("[contenteditable='true']").last();
      await editor.click();
      await sleep(400);
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      await page.keyboard.type("/");
      await sleep(1500);
      await shot(page, "slash-menu");
      await page.keyboard.press("Escape");
    }
  } catch (e) { log("slash fail:", e.message.slice(0, 80)); }

  // dark-mode hero — toggle via appearance dropdown (palette icon, top-right)
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await sleep(3000);
  try {
    // emulate dark to be safe, then reload
    await page.emulateMedia({ colorScheme: "dark" });
    await sleep(600);
    await page.reload({ waitUntil: "networkidle" });
    await sleep(3500);
    await shot(page, "dashboard-dark");
  } catch (e) { log("dark fail:", e.message.slice(0, 80)); }

  log("DONE");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
