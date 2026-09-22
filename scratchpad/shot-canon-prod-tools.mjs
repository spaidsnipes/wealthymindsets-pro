#!/usr/bin/env node
/**
 * Re-shoot PRODUCTION /charts with the Tools room OPEN into the canon
 * comparator's "TOOLS OPEN" slot.
 *
 * This pane matters more than it used to. The `.wm-chart-toolbar` row that
 * used to sit above the candles is GONE; its four controls (asset class,
 * symbol search, RTH/ETH, Indicators) now mount at the top of the chart
 * equipment sheet inside this room. So the default shot proves the REMOVAL
 * and this one proves the RELOCATION. Without it, "we deleted the band" is
 * indistinguishable from "we deleted the controls".
 *
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed inside this browser
 * context only. No password typed, no token minted, no account touched.
 */
import { chromium } from "playwright";

const BASE = "https://wealthymindsetspro.com";
const OUT = "public/canon/os-latest-tools.png";

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
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(12000);

// The door, then the tile. Both are named nodes, not coordinates — a shot
// taken by clicking pixels would go silently wrong the day the layout moves.
await page.click('[data-testid="os-equipment-tools"]');
await page.waitForTimeout(600);
await page.click('button[data-equipment="chart-tools"]');
await page.waitForTimeout(2500);

await page.screenshot({ path: OUT });

// Read the migrated controls back. A screenshot alone cannot tell us whether
// the four controls ARRIVED — only that something is drawn.
console.log(JSON.stringify(await page.evaluate(() => {
  const sheet = document.querySelector("#chart-equipment-sheet");
  const market = document.querySelector(".wm-chart-equipment-market");
  const r = market?.getBoundingClientRect() ?? null;
  const text = (el) => (el?.innerText || "").replace(/\s+/g, " ").trim();
  return {
    sheetOpen: !!sheet,
    marketGroup: r ? { x: Math.round(r.left), y: Math.round(r.top),
                       w: Math.round(r.width), h: Math.round(r.height) } : null,
    marketControls: {
      search: !!market?.querySelector("input"),
      selects: market?.querySelectorAll("select").length ?? 0,
      text: text(market).slice(0, 160),
    },
    toolbarBandStillGone: !document.querySelector(".wm-chart-toolbar"),
  };
})), null, 2);
await browser.close();
