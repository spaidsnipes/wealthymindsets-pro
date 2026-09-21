#!/usr/bin/env node
/**
 * HOW TALL IS THE TIME AXIS, MEASURED — not guessed.
 *
 * The chip was placed 6px off the pane's bottom edge and LOOKING at the render
 * showed it sitting ON the time axis with a date label hidden behind it. F24
 * draws the chip clear of the axis and the axis fully legible. To clear it, the
 * offset has to come from the axis's REAL height, which lightweight-charts owns
 * and can change with font or locale — a hand-typed 28 would be a number that
 * is right today and silently wrong later.
 *
 * LAYOUT ONLY — /api/auth/me RESPONSE stubbed in this context.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) =>
  r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ user: { id: "layout-probe", email: "layout@probe.local", displayName: "Layout Probe", handle: "layout", profileComplete: true } }) }),
);
const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);

const out = await page.evaluate(() => {
  const chip = document.querySelector(".wm-chart-timeframe-chip");
  const pane = chip?.parentElement;
  if (!pane) return { error: "no pane" };
  const pr = pane.getBoundingClientRect();

  // lightweight-charts renders each pane/axis as a table row of canvases.
  const rows = [...pane.querySelectorAll("tr")].map(tr => {
    const r = tr.getBoundingClientRect();
    return { h: Math.round(r.height), y: Math.round(r.y), bottom: Math.round(r.bottom) };
  });
  const canvases = [...pane.querySelectorAll("canvas")].map(c => {
    const r = c.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y), bottom: Math.round(r.bottom) };
  });
  return {
    pane: { y: Math.round(pr.y), h: Math.round(pr.height), bottom: Math.round(pr.bottom) },
    rows, canvases,
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
