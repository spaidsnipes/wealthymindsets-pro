#!/usr/bin/env node
/**
 * COMPARATOR SLOT 4 — the WORKSPACE hand, open.
 *
 * The other three slots shoot the chart. None of them can show what the
 * mansion map calls the room's ARRANGEMENT, because that lives behind the
 * Workspace door — so the slice that put the three named desks there was
 * invisible in the side-by-side. This shoots the hand itself.
 *
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed inside this browser
 * context only. No password typed, no token minted, no account touched.
 */
import { chromium } from "playwright";

const BASE = "https://wealthymindsetspro.com";
const OUT = "public/canon/os-latest-workspace.png";

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

await page.click('[data-testid="os-equipment-workspace"]');
await page.waitForTimeout(1200);

const readout = await page.evaluate(() => ({
  tiles: [...document.querySelectorAll("button[data-equipment]")].map((b) => ({
    id: b.getAttribute("data-equipment"),
    pressed: b.getAttribute("aria-pressed"),
  })),
  marketStillVisible: document.querySelectorAll(".tv-lightweight-charts").length,
}));

await page.screenshot({ path: OUT });
console.log(JSON.stringify(readout));
await browser.close();
