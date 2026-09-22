#!/usr/bin/env node
/**
 * D-702 EVIDENCE: the band census above the candles, the pane identity node,
 * and a screenshot — in one pass, so the picture and the numbers come from the
 * same paint.
 *
 * LAYOUT ONLY — /api/auth/me RESPONSE stubbed in this browser context only.
 * No password typed, no token minted, no account touched.
 */
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3000";
const TAG = process.env.TAG ?? "before";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "p", email: "l@p.local", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(11000);
const box = (el) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
    text: (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60) };
};
const out = await page.evaluate(() => {
  const B = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      text: (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60) };
  };
  const tv = document.querySelector(".tv-lightweight-charts");
  const cr = tv?.getBoundingClientRect();
  const ceiling = cr ? cr.top : 0;
  const rows = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width >= 600 && r.height >= 10 && r.height <= 80 && r.top >= 0
        && r.bottom <= ceiling + 2 && (!tv || !el.contains(tv))) {
      rows.push({ tag: el.tagName.toLowerCase(),
        cls: (el.className && String(el.className).slice(0, 60)) || "",
        y: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width),
        text: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 90) });
    }
  }
  const seen = new Set(); const bands = [];
  for (const b of rows.sort((a, z) => a.y - z.y || z.h - a.h)) {
    const k = `${b.y}:${b.h}`; if (seen.has(k)) continue; seen.add(k); bands.push(b);
  }
  return {
    viewportH: window.innerHeight,
    candlesTop: cr ? Math.round(cr.top) : null,
    candlesH: cr ? Math.round(cr.height) : null,
    chromeAboveCandlesPx: Math.round(ceiling),
    chromeAboveCandlesPct: +((ceiling / window.innerHeight) * 100).toFixed(1),
    bandCount: bands.length,
    bands,
    identity: B(document.querySelector("[data-chart-identity]")),
    timeframeChip: B(document.querySelector(".wm-chart-timeframe-chip")),
    toolbarPresent: !!document.querySelector(".wm-chart-toolbar"),
  };
});
console.log(JSON.stringify(out, null, 2));
await page.screenshot({ path: `scratchpad/d702-${TAG}-1440.png` });
await browser.close();
