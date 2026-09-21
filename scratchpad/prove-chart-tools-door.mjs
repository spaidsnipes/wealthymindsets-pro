#!/usr/bin/env node
/**
 * RUNTIME PROOF — the demolished strip's organs are reachable BY A HAND.
 *
 * LAYOUT ONLY: the /api/auth/me RESPONSE is stubbed so the room renders. No
 * password is typed, no token is minted, no account is touched.
 *
 * Presses the masthead Tools plate, then the `chart-tools` rail entry, then
 * asks `document.elementFromPoint` — the test a finger performs — whether each
 * migrated control is actually hit at its own centre.
 */
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3000";
const W = Number(process.env.W ?? 1440);
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: W, height: 900 } });
await ctx.route("**/api/auth/me", (r) =>
  r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "p", email: "p@p.l", displayName: "Layout Probe", handle: "p", profileComplete: true } }) }),
);
const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(12000);

const urlBefore = page.url();
await page.click('[data-testid="os-equipment-tools"]');
await page.waitForTimeout(600);
const railBox = await page.locator('button[data-equipment="chart-tools"]').boundingBox();
await page.click('button[data-equipment="chart-tools"]');
await page.waitForTimeout(700);

const out = await page.evaluate(() => {
  const panel = document.getElementById("chart-equipment-sheet");
  if (!panel) return { error: "drawer did not mount" };
  const reach = (el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return Boolean(hit && (el.contains(hit) || hit === el));
  };
  const controls = [...panel.querySelectorAll("button")].map((el) => ({
    name: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40),
    reachable: reach(el),
  }));
  const pane = document.querySelector(".wm-chart-market-pane")?.getBoundingClientRect();
  return {
    drawerW: Math.round(panel.getBoundingClientRect().width),
    charts: document.querySelectorAll(".tv-lightweight-charts").length,
    paneTop: pane ? Math.round(pane.top) : null,
    profilesPanel: Boolean(panel.querySelector('[data-testid="profiles-menu-panel"]')),
    arrangementPanel: Boolean(panel.querySelector('[data-testid="chart-arrangement-panel"]')),
    railPressed: document.querySelector('button[data-equipment="chart-tools"]')?.getAttribute("aria-pressed"),
    controls,
  };
});
console.log(JSON.stringify({ railBox, urlBefore, urlAfter: page.url(), ...out }, null, 2));
const bad = (out.controls ?? []).filter((c) => !c.reachable);
console.log(`\nUNREACHABLE IN DRAWER: ${bad.length} of ${(out.controls ?? []).length}`);
for (const b of bad) console.log("  x " + b.name);
await browser.close();
