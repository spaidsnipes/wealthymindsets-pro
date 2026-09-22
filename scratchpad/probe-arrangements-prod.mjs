#!/usr/bin/env node
/**
 * THE WORKSPACE DESK DOOR — prod, desktop 1440x900.
 *
 * Proves the three named arrangements are reachable from the WORKSPACE hand
 * and that pressing one actually changes the chart, by reading the Tools
 * panel's own arrangement declaration (which is compiled by
 * selectChartArrangement from the live switch state) BEFORE and AFTER the
 * Workspace press. If the two doors disagreed, the declaration would not move.
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

const out = {};

// The rail is a toggle: clicking WORKSPACE when the panel is already open
// CLOSES it. Open idempotently, or the probe measures its own mis-click.
const openWorkspace = async () => {
  const up = await page.$('button[data-equipment="arrange-order-flow"]');
  if (!up) {
    await page.click('[data-testid="os-equipment-workspace"]');
    await page.waitForTimeout(700);
  }
};


// 1. Are the three desks OFFERED in the Workspace rail at all?
await openWorkspace();
out.railOffers = await page.evaluate(() =>
  ["arrange-order-flow", "arrange-regime", "arrange-review", "clean-room"].map((id) => {
    const b = document.querySelector(`button[data-equipment="${id}"]`);
    return {
      id,
      present: !!b,
      label: b?.textContent?.trim().slice(0, 40) ?? null,
      // momentary grammar: aria-pressed must be ABSENT, not "false"
      ariaPressed: b?.getAttribute("aria-pressed") ?? null,
      box: b ? (({ width, height }) => ({ w: Math.round(width), h: Math.round(height) }))(b.getBoundingClientRect()) : null,
    };
  }),
);

// 2. The switch state, read where the room persists it. This is the chart's
//    own memory of how it is arranged — not a sentence about it.
const SWITCHES = [
  "wm_fixedVP",
  "wm_sessionVP",
  "wm_absorptionAnatomy",
  "wm_ofImbalanceStack",
  "wm_ofValueCandle",
  "wm_ofDeltaDivergence",
  "wm_ofLiquidityWeather",
];
const readSwitches = () =>
  page.evaluate((keys) => {
    const o = {};
    for (const k of keys) o[k.replace(/^wm_(of)?/, "")] = localStorage.getItem(k);
    return o;
  }, SWITCHES);
out.switchesBefore = await readSwitches();

// 3. Press ORDER FLOW from the WORKSPACE rail.
await openWorkspace();
await page.click('button[data-equipment="arrange-order-flow"]');
await page.waitForTimeout(1500);
out.afterPress = await page.evaluate(() => ({
  // A momentary command must not leave the rail claiming a holding.
  railStillOpen: !!document.querySelector('button[data-equipment="arrange-order-flow"]'),
  ariaPressed:
    document.querySelector('button[data-equipment="arrange-order-flow"]')?.getAttribute("aria-pressed") ?? null,
  chartCount: document.querySelectorAll(".tv-lightweight-charts").length,
}));

out.switchesAfterOrderFlow = await readSwitches();

// 4. REGIME, to prove the branch is not hard-wired to one desk. REGIME arms
//    BOTH volume profiles and disarms every order-flow reading, so the two
//    readings must be near-opposites.
await openWorkspace();
await page.click('button[data-equipment="arrange-regime"]');
await page.waitForTimeout(1500);
out.switchesAfterRegime = await readSwitches();

// 5. The Tools door's own published answer, to prove BOTH doors agree about
//    which desk is in force. `data-arrangement-active` is published by
//    ChartArrangementBar precisely so a probe need not parse a sentence.
await openWorkspace();
await page.click('button[data-equipment="chart-tools"]').catch(() => {});
await page.waitForTimeout(1600);
out.toolsDoorSays = await page.evaluate(() => {
  const p = document.querySelector('[data-testid="chart-arrangement-panel"]');
  return {
    panelFound: !!p,
    activeId: p?.getAttribute("data-arrangement-active") ?? null,
    declaration:
      document.querySelector('[data-testid="chart-arrangement-declaration"]')?.textContent?.trim() ?? null,
  };
});

out.url = new URL(page.url()).pathname + new URL(page.url()).search;
console.log(JSON.stringify(out, null, 2));
await browser.close();
