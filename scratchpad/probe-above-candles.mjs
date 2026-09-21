#!/usr/bin/env node
/** Enumerate every band that occupies the space above the candle pane. */
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
  const pane = document.querySelector(".wm-chart-market-pane");
  const top = pane ? pane.getBoundingClientRect().top : 0;
  const rows = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.height < 4 || r.width < 200) continue;
    if (r.top >= top - 1) continue;
    if (r.bottom > top + 1) continue;
    rows.push({
      tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === "string" ? el.className : "").slice(0, 70),
      top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width),
      depth: (() => { let d = 0, n = el; while ((n = n.parentElement)) d++; return d; })(),
    });
  }
  return { paneTop: Math.round(top), rows };
});
console.log("paneTop", out.paneTop);
for (const r of out.rows) console.log(`${String(r.top).padStart(4)} h=${String(r.h).padStart(3)} w=${String(r.w).padStart(4)} d=${r.depth} ${r.tag} ${r.cls}`);
await browser.close();
