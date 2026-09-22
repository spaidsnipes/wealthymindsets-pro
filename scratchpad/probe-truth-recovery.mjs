#!/usr/bin/env node
/**
 * TRUTH / RECOVERY / INTEGRATION pass — serving prod, desktop 1440x900.
 *
 * Answers, with measurements not opinions:
 *   1. CAMERA SURVIVAL — does the chart canvas node survive picking up and
 *      putting down equipment (same DOM node, no remount)?
 *   2. URL STABILITY — does /charts?symbol=…&tf=… survive equipment use, and
 *      does no equipment press cause a navigation?
 *   3. ESCAPE — does Escape close the open equipment one level, with the
 *      rail reporting the put-down?
 *   4. REFRESH RECOVERY — after reload, does the room come back LIVE with the
 *      same identity (symbol · tf) and no replay/equipment ghosts?
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

const mark = () =>
  page.evaluate(() => {
    const chart = document.querySelector(".tv-lightweight-charts");
    if (chart && !chart.__wmProbeMark) chart.__wmProbeMark = "camera-1";
    return {
      chartMark: chart?.__wmProbeMark ?? null,
      chartCount: document.querySelectorAll(".tv-lightweight-charts").length,
      url: location.pathname + location.search,
      masthead: (document.querySelector('[data-testid="os-masthead"]')?.textContent ?? document.body.innerText.slice(0, 200)).replace(/\s+/g, " ").slice(0, 160),
    };
  });

const t0 = await mark();

// Pick up Replay via the Workspace door, then Escape it away.
await page.click('[data-testid="os-equipment-workspace"]');
await page.waitForTimeout(600);
await page.click('button[data-equipment="bar-replay"]');
await page.waitForTimeout(1200);
const t1 = await mark();

await page.keyboard.press("Escape");
await page.waitForTimeout(1000);
const t2 = await page.evaluate(() => ({
  replayStillUp: !!document.querySelector('[data-replay-camera], [data-testid="bar-replay-controls"]') ||
    /BAR REPLAY/.test(document.body.innerText),
  url: location.pathname + location.search,
}));
// Rail's report after Escape:
await page.click('[data-testid="os-equipment-workspace"]');
await page.waitForTimeout(600);
const t3 = await page.evaluate(() => ({
  tiles: [...document.querySelectorAll("button[data-equipment]")].map((b) => ({
    id: b.getAttribute("data-equipment"),
    ariaPressed: b.getAttribute("aria-pressed"),
  })),
}));
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
const t4 = await mark(); // camera survived the whole journey?

// Refresh recovery.
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(14000);
const t5 = await page.evaluate(() => ({
  url: location.pathname + location.search,
  chartCount: document.querySelectorAll(".tv-lightweight-charts").length,
  replayGhost: /BAR REPLAY/.test(document.body.innerText),
  identity: (document.body.innerText.match(/[A-Z]{2,6}\s*·\s*\d+[smhd]/) ?? [null])[0],
}));

console.log(JSON.stringify({ t0, t1, t2, t3, t4, t5 }, null, 2));
await browser.close();
