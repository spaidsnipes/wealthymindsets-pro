#!/usr/bin/env node
/**
 * DOES THE LIT DESK TELL THE TRUTH? — prod, desktop 1440x900.
 *
 * Presses REGIME, reopens the Workspace hand and reads which tile carries
 * `data-equipment-arranged` / `aria-current`, then presses ORDER FLOW and reads
 * again. A light that is compiled MOVES; a light that is remembered would
 * either stay on the first desk or light both.
 *
 * The last reading is the one that matters most: REVIEW arms SESSION+ABSORPTION,
 * so pressing REVIEW and then turning ONE of those off by hand must extinguish
 * the light entirely — the chart is no longer at a named desk. That is the
 * case a "last desk I sent" memory cannot get right.
 *
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed inside this browser
 * context only. No password typed, no token minted, no account touched.
 */
import { chromium } from "playwright";

const BASE = "https://wealthymindsetspro.com";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: {
      id: "layout-probe", email: "layout@probe.local",
      displayName: "Layout Probe", handle: "layout", profileComplete: true,
    } }),
  }),
);
const page = await ctx.newPage();
await page.goto(`${BASE}/charts?symbol=BTC&tf=5m`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(14000);

// The rail is a toggle: open idempotently or the probe measures its own mis-click.
const openWorkspace = async () => {
  const up = await page.$('button[data-equipment="arrange-order-flow"]');
  if (!up) {
    await page.click('[data-testid="os-equipment-workspace"]');
    await page.waitForTimeout(800);
  }
};

const readLight = async () => {
  await openWorkspace();
  return page.evaluate(() =>
    [...document.querySelectorAll("button[data-equipment]")]
      .map((b) => ({
        id: b.getAttribute("data-equipment"),
        arranged: b.getAttribute("data-equipment-arranged"),
        ariaCurrent: b.getAttribute("aria-current"),
        ariaPressed: b.getAttribute("aria-pressed"),
      }))
      .filter((t) => t.arranged || t.ariaCurrent || t.id.startsWith("arrange-")),
  );
};

const press = async (id) => {
  await openWorkspace();
  await page.click(`button[data-equipment="${id}"]`);
  await page.waitForTimeout(1400);
};

const out = {};
out.beforeAnyPress = await readLight();
await press("arrange-regime");
out.afterRegime = await readLight();
await press("arrange-order-flow");
out.afterOrderFlow = await readLight();

// THE CASE A MEMORY CANNOT GET RIGHT. ORDER FLOW is in force; turn one of its
// own readings off through the chart's persisted switch and reload. A compiled
// light reads CUSTOM and goes out. A remembered one would still be lit.
await page.evaluate(() => localStorage.setItem("wm_ofValueCandle", "false"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(14000);
out.afterHandEdit = await readLight();
out.chartStillAlive = await page.evaluate(
  () => document.querySelectorAll(".tv-lightweight-charts").length,
);

console.log(JSON.stringify(out, null, 2));
await browser.close();
