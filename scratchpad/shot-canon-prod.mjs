#!/usr/bin/env node
/**
 * Re-shoot the PRODUCTION /charts room into the canon comparator's "current
 * build" slot, so the side-by-side at /canon/ shows what is actually deployed
 * rather than what was deployed the last time somebody remembered to re-shoot.
 *
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed inside this browser
 * context only. No password typed, no token minted, no account touched.
 */
import { chromium } from "playwright";

const BASE = "https://wealthymindsetspro.com";
const OUT = "public/canon/os-latest.png";

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    // `profileComplete` matters: without it /charts bounces to /profile?setup=1.
    body: JSON.stringify({ user: {
      id: "layout-probe", email: "layout@probe.local",
      displayName: "Layout Probe", handle: "layout", profileComplete: true,
    } }),
  }),
);
const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(12000);
await page.screenshot({ path: OUT });
console.log(JSON.stringify(await page.evaluate(() => {
  const tv = document.querySelector(".tv-lightweight-charts");
  const cr = tv?.getBoundingClientRect() ?? null;
  const id = document.querySelector("[data-chart-identity]");
  const mast = document.querySelector("[data-testid='os-masthead']");
  return {
    candlesTop: cr ? Math.round(cr.top) : null,
    candlesH: cr ? Math.round(cr.height) : null,
    identity: id ? (id.innerText || "").replace(/\s+/g, " ").trim() : null,
    masthead: mast ? (mast.innerText || "").replace(/\s+/g, " ").trim() : null,
  };
})), null, 2);
await browser.close();
