#!/usr/bin/env node
/**
 * CAMERA CONTINUITY UNDER REFRESH — Garden 10 truth/recovery gate.
 *
 * The market camera must survive a hard refresh: same symbol, same timeframe,
 * and the W receipts must come back to life without the trader re-selecting
 * anything. Measured on PRODUCTION.
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

const readState = () => page.evaluate(() => {
  const id = document.querySelector("[data-chart-identity]");
  const receipts = {};
  for (const c of document.querySelectorAll("canvas"))
    for (const [k, v] of Object.entries(c.dataset)) receipts[k] = v;
  return {
    identity: id ? (id.innerText || "").replace(/\s+/g, " ").trim() : null,
    valueCandle: receipts.valueCandle ?? null,
    liquidityWeather: receipts.liquidityWeather ?? null,
  };
});

// 1. Arrive on BTC with a URL param, let the tape speak.
await page.goto(`${BASE}/charts?symbol=BTC`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(20000);
const before = await readState();

// 2. HARD REFRESH — but strip the param, so survival must come from WM memory,
//    not from the URL re-seeding the same camera.
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(20000);
const after = await readState();

console.log(JSON.stringify({
  before,
  after,
  cameraSurvived: !!before.identity && before.identity === after.identity,
}));
await browser.close();
