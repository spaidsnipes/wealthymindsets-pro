#!/usr/bin/env node
/**
 * LOOK AT THE TIMEFRAME CHIP ON THE GLASS, AT 1440.
 *
 * Canon F24 puts ONE bordered timeframe chip at the BOTTOM CENTRE of the
 * candle pane, sharing that edge with `Vol 68.92M` at bottom left. This shoots
 * the bottom strip of the pane so the chip can be COMPARED to that frame by
 * eye, then opens it and shoots again — because a closed chip proves placement
 * and an open one proves the nine are reachable by a hand, which is the defect
 * that started this atom (seven of nine were past the end of an invisible
 * scroller in the old 36px band).
 *
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed in this browser context.
 * No password typed, no token minted, no account touched.
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

const trigger = page.locator(".wm-chart-timeframe-chip-trigger");
const n = await trigger.count();
console.log("chip triggers found:", n);
if (n === 0) {
  console.log("NO CHIP ON THE GLASS — nothing to look at.");
  await browser.close();
  process.exit(1);
}

const box = await trigger.first().boundingBox();
const pane = await page.locator(".wm-chart-timeframe-chip").first().evaluateHandle(el => el.parentElement);
const paneBox = await (await pane.asElement()).boundingBox();
console.log("pane:", JSON.stringify(paneBox));
console.log("chip:", JSON.stringify(box), "label:", (await trigger.first().textContent())?.trim());
console.log("chip centre x:", (box.x + box.width / 2).toFixed(1), "pane centre x:", (paneBox.x + paneBox.width / 2).toFixed(1));
console.log("gap from pane bottom:", (paneBox.y + paneBox.height - (box.y + box.height)).toFixed(1), "px");

// CLOSED: the resting state canon draws.
await page.screenshot({
  path: "scratchpad/glass-chip-closed.png",
  clip: { x: paneBox.x, y: paneBox.y + paneBox.height - 120, width: paneBox.width, height: 120 },
});

// OPEN: every one of the nine must be on screen and hit-testable.
await trigger.first().click();
await page.waitForTimeout(400);
const opts = page.locator(".wm-chart-timeframes .wm-chart-timeframe");
const count = await opts.count();
const vw = 1440, vh = 900;
let offscreen = 0, covered = 0;
const labels = [];
for (let i = 0; i < count; i++) {
  const b = await opts.nth(i).boundingBox();
  const t = (await opts.nth(i).textContent())?.trim();
  labels.push(t);
  if (!b || b.x < 0 || b.y < 0 || b.x + b.width > vw || b.y + b.height > vh) { offscreen++; continue; }
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  const top = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return el?.closest(".wm-chart-timeframe") ? "self" : (el?.className?.toString?.() ?? "unknown");
  }, [cx, cy]);
  if (top !== "self") { covered++; console.log("  COVERED:", t, "by", top); }
}
console.log("options rendered:", count, labels.join(" "));
console.log("offscreen:", offscreen, "covered by another element:", covered);

const gb = await page.locator(".wm-chart-timeframes").first().boundingBox();
await page.screenshot({
  path: "scratchpad/glass-chip-open.png",
  clip: { x: Math.max(0, gb.x - 60), y: gb.y - 12, width: Math.min(vw, gb.width + 120), height: gb.height + 70 },
});

// Escape must close it — a menu over a live market that cannot be dismissed
// without choosing is a trap, so the dismissal is PROVEN, not assumed.
await page.keyboard.press("Escape");
await page.waitForTimeout(250);
console.log("after Escape, options remaining:", await opts.count());

console.log("WROTE scratchpad/glass-chip-closed.png + scratchpad/glass-chip-open.png");
await browser.close();
