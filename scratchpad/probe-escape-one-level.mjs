#!/usr/bin/env node
/**
 * ONE LEVEL PER PRESS — prod, desktop 1440x900.
 *
 * Replay held, then the draw sheet opened OVER it. First Escape must close
 * the sheet ONLY (drawer's focus hook consumes the press); replay must
 * survive. Second Escape must put the replay down.
 *
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed inside this browser
 * context only. No password typed, no token minted, no account touched.
 */
import { chromium } from "playwright";

const BASE = "https://wealthymindsetspro.com";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: {
      id: "layout-probe", email: "layout@probe.local",
      displayName: "Layout Probe", handle: "layout", profileComplete: true,
    } }),
  }),
);
const page = await ctx.newPage();
await page.goto(`${BASE}/charts?symbol=BTC&tf=5m`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(14000);

const read = (label) =>
  page.evaluate((l) => ({
    label: l,
    drawSheet: !!document.querySelector('#chart-draw-sheet'),
    replayUp: /BAR REPLAY/.test(document.body.innerText),
  }), label);

// Hold replay, then open the draw sheet over it.
await page.click('[data-testid="os-equipment-workspace"]');
await page.waitForTimeout(600);
await page.click('button[data-equipment="bar-replay"]');
await page.waitForTimeout(900);
await page.click('[data-testid="os-equipment-workspace"]');
await page.waitForTimeout(600);
await page.click('button[data-equipment="draw-tools"]');
await page.waitForTimeout(900);
const both = await read("both-up");

await page.keyboard.press("Escape");
await page.waitForTimeout(800);
const afterFirst = await read("after-first-escape");

await page.keyboard.press("Escape");
await page.waitForTimeout(800);
const afterSecond = await read("after-second-escape");

console.log(JSON.stringify({ both, afterFirst, afterSecond }, null, 2));
await browser.close();
