#!/usr/bin/env node
/**
 * HOW MANY BANDS STAND BETWEEN THE MASTHEAD AND THE FIRST CANDLE?
 *
 * Canon F24 draws ZERO. Between its top band (two plates + one chip) and the
 * candles there is nothing at all. The build, seen beside it at 1440, stacks a
 * "Futures / NQ1! / RTH / Indicators" row, a price-and-stats row, and an
 * "EFFORT · VOLUME" row before any price pixel.
 *
 * A screenshot proves the rows exist. This proves WHAT THEY COST: every band's
 * height, and the total fraction of the glass spent before the market starts.
 *
 * LAYOUT ONLY — /api/auth/me RESPONSE stubbed in this browser context only.
 * No password typed, no token minted, no account touched.
 */
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "p", email: "l@p.local", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(11000);
console.log(JSON.stringify(await page.evaluate(() => {
  const tv = document.querySelector(".tv-lightweight-charts");
  const cr = tv?.getBoundingClientRect();
  const ceiling = cr ? cr.top : 0;
  const rows = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    // A BAND: wide, short, entirely above the candles, and not a wrapper —
    // wrappers are excluded by requiring the row not to contain the canvas.
    if (r.width >= 600 && r.height >= 10 && r.height <= 80 && r.top >= 0
        && r.bottom <= ceiling + 2 && (!tv || !el.contains(tv))) {
      rows.push({ tag: el.tagName.toLowerCase(),
        cls: (el.className && String(el.className).slice(0, 60)) || "",
        testid: el.getAttribute("data-testid") || "",
        y: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width),
        text: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 90) });
    }
  }
  // Deduplicate identical geometry (nested nodes drawing the same band).
  const seen = new Set(); const bands = [];
  for (const b of rows.sort((a, z) => a.y - z.y || z.h - a.h)) {
    const k = `${b.y}:${b.h}`; if (seen.has(k)) continue; seen.add(k); bands.push(b);
  }
  return { viewportH: window.innerHeight,
    candlesTop: cr ? Math.round(cr.top) : null,
    candlesH: cr ? Math.round(cr.height) : null,
    chromeAboveCandlesPx: Math.round(ceiling),
    chromeAboveCandlesPct: +((ceiling / window.innerHeight) * 100).toFixed(1),
    bandCount: bands.length, bands };
})), null, 2);
await browser.close();
