#!/usr/bin/env node
/**
 * OWL WITH TWO CLOCKS — RESIDUE HUNT.
 *
 * probe-replay-clock-prod.mjs answers "does the word LIVE appear anywhere on
 * the body while replay is engaged". That is the right alarm and the wrong
 * diagnosis: it cannot tell a SECOND CONTRADICTING CLOCK from a menu item that
 * merely contains the word. This probe names every leaf element that says LIVE
 * while the companion camera is driving, with its testid and its screen box, so
 * each one can be judged individually rather than as a single boolean.
 *
 * LAYOUT ONLY — /api/auth/me stubbed in this browser context only. No password
 * typed, no token minted, no account touched.
 */
import { chromium } from "playwright";
const BASE = "https://wealthymindsetspro.com";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "p", email: "l@p.local", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();
await page.goto(`${BASE}/charts?symbol=BTC`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(14000);

/** Every LEAF element whose own text says LIVE, described well enough to judge. */
const liveWords = () => page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    if (el.children.length > 0) continue; // leaves only — no ancestor double-counting
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!/\bLIVE\b/i.test(t)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue; // not on the glass
    out.push({
      text: t.slice(0, 80),
      tag: el.tagName.toLowerCase(),
      testid: el.getAttribute("data-testid")
        ?? el.closest("[data-testid]")?.getAttribute("data-testid") ?? null,
      box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    });
  }
  return out;
});

const before = await liveWords();
await page.click('[data-testid="os-equipment-workspace"]');
await page.waitForTimeout(1000);
await page.click('button[data-equipment="bar-replay"]');
await page.waitForTimeout(3000);
const after = await liveWords();
await page.screenshot({ path: "scratchpad/replay-live-residue.png" });
console.log(JSON.stringify({ beforeCount: before.length, before, afterCount: after.length, after }, null, 1));
await browser.close();
