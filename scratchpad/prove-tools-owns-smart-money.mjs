#!/usr/bin/env node
/**
 * RUNTIME PROOF for the canon acceptance protocol (Last Mile §2), at the
 * viewport where the defect was measured: 390x844.
 *
 * The protocol does not accept "the code has a branch". It asks for a runtime
 * screenshot of the default URL plus PROOF THE URL DID NOT CHANGE when Tools
 * opened. So this asserts four things in order and exits non-zero on any miss:
 *
 *   1. Tools is thumb-reachable — its box sits fully inside the 390px glass.
 *   2. Opening Tools reveals a "Smart money" entry (the migrated organ).
 *   3. Pressing it opens the SmartMoneyPanel — D≈0, chart still mounted.
 *   4. The URL is byte-identical before and after. Tools is not a route.
 *
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed in this browser context.
 * No password typed, no token minted, no account touched.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "/tmp/wm-tools-smart-money-390.png";

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});

await ctx.route("**/api/auth/me", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: {
        id: "layout-probe",
        email: "layout@probe.local",
        displayName: "Layout Probe",
        handle: "layout",
        profileComplete: true,
      },
    }),
  }),
);

const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);

const fails = [];
const urlBefore = page.url();
console.log("URL before:", urlBefore);

// 1 — Tools is on the glass, not past its right edge.
const tools = page.locator('[data-testid="os-equipment-tools"]');
const tb = await tools.boundingBox();
if (!tb) fails.push("Tools control is not rendered at 390");
else {
  const right = tb.x + tb.width;
  console.log(`1. Tools box x=${Math.round(tb.x)} w=${Math.round(tb.width)} right=${Math.round(right)} (glass=390)`);
  if (right > 390) fails.push(`Tools right edge ${Math.round(right)} is past the 390px glass`);
}

// 2 — the drawer carries the migrated organ.
await tools.click();
await page.waitForTimeout(600);
const entry = page.getByRole("button", { name: /smart money/i }).first();
const visible = await entry.isVisible().catch(() => false);
console.log(`2. "Smart money" entry visible in the Tools drawer: ${visible}`);
if (!visible) fails.push('Tools drawer has no "Smart money" entry');

// 3 — pressing it opens the panel, and the chart is STILL MOUNTED (D≈0).
if (visible) {
  await entry.click();
  await page.waitForTimeout(1200);
}
const after = await page.evaluate(() => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const panel = [...document.querySelectorAll("*")].find(
    (el) => vis(el) && /smart money/i.test((el.textContent || "").slice(0, 200)) && el.querySelector("button"),
  );
  return {
    chartStillMounted: [...document.querySelectorAll(".tv-lightweight-charts")].filter(vis).length,
    smartMoneyTextOnScreen: /SMART MONEY/i.test(document.body.innerText || ""),
    panelFound: Boolean(panel),
  };
});
console.log(`3. chart still mounted: ${after.chartStillMounted} · Smart Money surface on screen: ${after.smartMoneyTextOnScreen}`);
if (after.chartStillMounted < 1) fails.push("THE CAMERA WENT AWAY — .tv-lightweight-charts unmounted when Tools opened");
if (!after.smartMoneyTextOnScreen) fails.push("Smart Money surface did not appear after pressing the drawer entry");

// 4 — Tools is equipment, not a destination.
const urlAfter = page.url();
console.log(`4. URL after:  ${urlAfter}`);
if (urlAfter !== urlBefore) fails.push(`THE URL MOVED: ${urlBefore} -> ${urlAfter} — Tools became a route`);

await page.screenshot({ path: OUT, fullPage: false });
console.log("shot:", OUT);
await browser.close();

if (fails.length) {
  console.log("\nFAIL");
  for (const f of fails) console.log("  ✗ " + f);
  process.exit(1);
}
console.log("\nPASS — Tools owns Smart money at 390, chart stayed, URL unchanged.");
