#!/usr/bin/env node
/**
 * WHAT SITS BETWEEN THE TOP OF THE GLASS AND THE FIRST CANDLE, AT 1440.
 *
 * F24 spends ~75px of its 784px frame on chrome and gives the rest to the
 * market. This lists every band the build stacks above the candle field, with
 * its height and its own text, so the cut is argued from the real stack rather
 * than from a guess about which component is guilty.
 *
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed in this browser context.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) =>
  r.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: { id: "layout-probe", email: "layout@probe.local", displayName: "Layout Probe", handle: "layout", profileComplete: true },
    }),
  }),
);
const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);

const out = await page.evaluate(() => {
  const candle = document.querySelector(".tv-lightweight-charts");
  if (!candle) return { error: "no candle field" };
  const cr = candle.getBoundingClientRect();

  // Every element whose box ENDS above the candle field's top edge and which
  // spans most of the width — i.e. a horizontal band, not an inline chip.
  const bands = [];
  for (const el of document.querySelectorAll("div,header,nav,section")) {
    const r = el.getBoundingClientRect();
    if (r.height < 12 || r.width < 400) continue;
    if (r.bottom > cr.top + 2) continue;
    // Skip pure wrappers: a band whose only child is another band of the same height.
    bands.push({
      y: Math.round(r.y),
      h: Math.round(r.height),
      w: Math.round(r.width),
      cls: (el.className || "").toString().slice(0, 60),
      text: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 90),
      depth: (() => { let d = 0, p = el; while ((p = p.parentElement)) d++; return d; })(),
    });
  }
  bands.sort((a, b) => a.y - b.y || b.depth - a.depth);
  return {
    viewport: { w: innerWidth, h: innerHeight },
    candle: { y: Math.round(cr.y), h: Math.round(cr.height), w: Math.round(cr.width) },
    chromeAboveCandle: Math.round(cr.top),
    bands,
  };
});

console.log(`viewport ${out.viewport.w}x${out.viewport.h}`);
console.log(`candle field: ${out.candle.w}x${out.candle.h} starting at y=${out.candle.y}`);
console.log(`CHROME ABOVE THE CANDLES: ${out.chromeAboveCandle}px (${((out.chromeAboveCandle / out.viewport.h) * 100).toFixed(1)}% of the glass)`);
console.log(`F24 spends about 9.5% of its frame height on chrome.\n`);
console.log("bands above the candle field (deepest first at each y):");
for (const b of out.bands) {
  console.log(`  y=${String(b.y).padStart(4)} h=${String(b.h).padStart(3)} w=${String(b.w).padStart(4)}  ${b.cls || "(no class)"}`);
  if (b.text) console.log(`           "${b.text}"`);
}
await browser.close();
