#!/usr/bin/env node
/**
 * DOES THE MARKET SURFACE SAY WHICH MARKET IT IS?
 *
 * Canon F24 prints `TSLA · Tesla, Inc. · 1D · NASDAQ` inside the candle pane.
 * Before this atom, `/charts` printed the symbol in exactly two places, neither
 * of them on the market surface: the toolbar search field, and the decision
 * spine ~1100px away on the right flank.
 *
 * This reads the pane's identity node back with its geometry, and ALSO census-
 * es every node on the page whose text contains the symbol — so the claim
 * "identity is now on the glass" is measured, not asserted.
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
await page.waitForTimeout(12000);
console.log(JSON.stringify(await page.evaluate(() => {
  const tv = document.querySelector(".tv-lightweight-charts");
  const cr = tv?.getBoundingClientRect() ?? null;
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top),
             w: Math.round(r.width), h: Math.round(r.height) };
  };
  const nodes = [...document.querySelectorAll("[data-chart-identity]")].map((el) => ({
    ...box(el),
    parts: el.getAttribute("data-chart-identity-parts"),
    aria: el.getAttribute("aria-label"),
    text: (el.innerText || "").replace(/\s+/g, " ").trim(),
    // The whole point: is it drawn OVER the candles, or in a band above them?
    overCandles: cr ? el.getBoundingClientRect().top >= cr.top - 1 : null,
  }));
  return {
    candles: cr ? { y: Math.round(cr.top), h: Math.round(cr.height) } : null,
    identityCount: nodes.length,
    identity: nodes,
  };
})), null, 2);
await page.screenshot({ path: "scratchpad/shot-pane-identity.png" });
await browser.close();
