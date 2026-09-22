#!/usr/bin/env node
/**
 * DO THE W INVENTIONS ACTUALLY DRAW ON PRODUCTION, OR ONLY IN CODE?
 *
 * Garden 10: "A menu item is not implementation." The draw loop publishes a
 * receipt for every order-flow layer on the chart canvas's dataset —
 * valueCandle / imbalanceStack / deltaDivergence(?) / liquidityWeather(?) plus
 * absorption. Reading those receipts off PRODUCTION distinguishes, per layer:
 *
 *   DRAWN (rungs/levels > 0)  — the invention is physically on the glass
 *   UNMEASURED / NO_* reasons — the layer ran and the tape could not speak
 *   OFF                       — the trader's switch
 *   attribute absent          — the layer does not exist in the build (MOLE)
 *
 * LAYOUT ONLY — /api/auth/me RESPONSE stubbed in this browser context only.
 * No password typed, no token minted, no account touched.
 */
import { chromium } from "playwright";

const BASE = "https://wealthymindsetspro.com";
const SYMBOL = process.argv[2] ?? null; // e.g. BTC-USD — control run on a live tape
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "p", email: "l@p.local", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();
// WS truth: did the page even open a tape socket, and did frames flow?
const wsLog = [];
page.on("websocket", (ws) => {
  const rec = { url: ws.url().slice(0, 90), framesIn: 0, closed: false };
  wsLog.push(rec);
  ws.on("framereceived", () => { rec.framesIn += 1; });
  ws.on("close", () => { rec.closed = true; });
});
page.on("console", (m) => { if (m.type() === "error") console.error("PAGE-ERR:", m.text().slice(0, 200)); });
await page.goto(`${BASE}/charts${SYMBOL ? `?symbol=${encodeURIComponent(SYMBOL)}` : ""}`, { waitUntil: "domcontentloaded" });
// Long dwell on purpose: the receipts describe the LIVE tape, which needs time
// to accumulate. 25s is enough for the WS to connect and trades to land when
// the market is speaking at all.
await page.waitForTimeout(25000);
console.log(JSON.stringify(await page.evaluate(() => {
  const out = {};
  for (const c of document.querySelectorAll("canvas")) {
    for (const [k, v] of Object.entries(c.dataset)) out[k] = v;
  }
  const tv = document.querySelector(".tv-lightweight-charts");
  const cr = tv?.getBoundingClientRect() ?? null;
  return {
    candles: cr ? { y: Math.round(cr.top), h: Math.round(cr.height) } : null,
    receipts: out,
  };
})));
console.log("WS:", JSON.stringify(wsLog));
await browser.close();
