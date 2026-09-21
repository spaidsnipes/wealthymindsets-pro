#!/usr/bin/env node
/**
 * REACHABILITY OF THE TOOLBAR BAND AT THE DESK.
 *
 * `.wm-chart-toolbar` is `overflow-x: auto` with `scrollbarWidth: "none"`, and
 * `.wm-chart-toolbar-pinned` is `position: sticky; right: 0` on top of it. A
 * control in that row is reachable only if the point at its own centre
 * actually hits it — `elementFromPoint` is the test a finger performs.
 */
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3000";
const W = Number(process.env.W ?? 1440);
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: W, height: 900 } });
await ctx.route("**/api/auth/me", (r) =>
  r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "p", email: "p@p.l", displayName: "P", handle: "p", profileComplete: true } }) }),
);
const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(12000);
const out = await page.evaluate(() => {
  const band = document.querySelector(".wm-chart-toolbar");
  if (!band) return { error: "no .wm-chart-toolbar" };
  const kids = [...band.querySelectorAll("button, select, input")];
  return {
    bandTop: Math.round(band.getBoundingClientRect().top),
    bandH: Math.round(band.getBoundingClientRect().height),
    controls: kids.map((el) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      return {
        name: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 34),
        x: Math.round(r.x), w: Math.round(r.width),
        reachable: Boolean(hit && (el.contains(hit) || hit === el)),
      };
    }),
  };
});
console.log(JSON.stringify(out, null, 2));
const bad = (out.controls ?? []).filter((c) => !c.reachable);
console.log(`\nUNREACHABLE: ${bad.length} of ${(out.controls ?? []).length}`);
for (const b of bad) console.log("  x " + b.name);
await browser.close();
