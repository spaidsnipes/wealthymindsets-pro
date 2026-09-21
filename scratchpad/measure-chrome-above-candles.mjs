#!/usr/bin/env node
/**
 * MEASURE THE CHROME ABOVE THE CANDLES, at the desk (1440x900).
 *
 * C-101 budgets "charts 70% FLOOR AREA" and draws the market canvas with two
 * pieces of furniture: a price axis right, a time axis bottom. Nothing above.
 * This reports every band between the top of the viewport and the top of the
 * candle pane, so a claim about "129px of chrome" is a reading and not a
 * feeling.
 *
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed in this browser context.
 * No password typed, no token minted, no account touched.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const W = Number(process.env.W ?? 1440);
const H = Number(process.env.H ?? 900);
const OUT = process.env.OUT ?? "/tmp/wm-chrome-above-candles.png";

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: W, height: H } });

await ctx.route("**/api/auth/me", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: {
        id: "layout-probe",
        email: "layout@probe.local",
        displayName: "Layout Probe",
        handle: "layout",
        profileComplete: true,
      },
    }),
  }),
);

const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(12000);

const report = await page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { sel, top: Math.round(r.top), h: Math.round(r.height), bottom: Math.round(r.bottom) };
  };
  const pane = document.querySelector(".wm-chart-market-pane") ?? document.querySelector(".tv-lightweight-charts");
  const paneTop = pane ? Math.round(pane.getBoundingClientRect().top) : null;
  const bands = [
    ".wm-shell-header",
    "[data-wm-os-masthead]",
    ".wm-chart-toolbar",
    ".wm-chart-toolbar-pinned",
    ".wm-chart-tools",
    ".wm-chart-market-pane",
    ".tv-lightweight-charts",
  ]
    .map(box)
    .filter(Boolean);
  // Every control that must stay reachable by a hand.
  const controls = [...document.querySelectorAll("button,[role=button],[role=menuitem]")]
    .map((el) => {
      const r = el.getBoundingClientRect();
      const name = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40);
      return { name, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), right: Math.round(r.right) };
    })
    .filter((c) => c.w > 0 && /workspace|profiles|appearance|smart money|chart tools|drawing/i.test(c.name));
  return { paneTop, bands, controls, vw: window.innerWidth };
});

console.log(JSON.stringify(report, null, 2));
console.log(`\nCHROME ABOVE THE CANDLES: ${report.paneTop}px of ${H} (${((report.paneTop / H) * 100).toFixed(1)}%)`);
await page.screenshot({ path: OUT });
console.log("shot:", OUT);
await browser.close();
