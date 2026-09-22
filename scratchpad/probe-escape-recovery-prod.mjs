#!/usr/bin/env node
/**
 * ESCAPE RECOVERY — Garden 10 truth/recovery gate, measured on PRODUCTION.
 *
 * Open the Tools equipment sheet, press Escape: the sheet must close, the
 * chart must still be there, and focus must not be trapped in a dead modal.
 *
 * LAYOUT ONLY — /api/auth/me RESPONSE stubbed in this browser context only.
 */
import { chromium } from "playwright";

const BASE = "https://wealthymindsetspro.com";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "p", email: "l@p.local", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(12000);

await page.click('[data-testid="os-equipment-tools"]');
await page.waitForTimeout(1200);
await page.click('button[data-equipment="chart-tools"]');
await page.waitForTimeout(1200);
const open = await page.evaluate(() => !!document.querySelector("#chart-equipment-sheet"));

await page.keyboard.press("Escape");
await page.waitForTimeout(800);
const afterEscape = await page.evaluate(() => ({
  sheetGone: !document.querySelector("#chart-equipment-sheet"),
  chartAlive: !!document.querySelector(".tv-lightweight-charts"),
  focusTag: document.activeElement?.tagName ?? null,
}));

console.log(JSON.stringify({ sheetOpened: open, ...afterEscape }));
await browser.close();
