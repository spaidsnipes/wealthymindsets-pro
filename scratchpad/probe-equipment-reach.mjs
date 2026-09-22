#!/usr/bin/env node
/**
 * D-702 REACHABILITY: how many clicks from a resting /charts to each control
 * that used to sit in the 32px band, and can a hand actually land on it?
 *
 * `elementFromPoint` at each control's own centre is the test that caught the
 * pinned cluster covering its neighbours; the same test is applied here.
 *
 * LAYOUT ONLY — /api/auth/me RESPONSE stubbed in this browser context only.
 */
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "p", email: "l@p.local", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(11000);

let clicks = 0;
await page.getByRole("button", { name: /^Tools/ }).first().click(); clicks++;
await page.waitForTimeout(600);
await page.getByRole("button", { name: /Chart tools/ }).first().click(); clicks++;
await page.waitForTimeout(900);

console.log(JSON.stringify(await page.evaluate((clicks) => {
  const sheet = document.getElementById("chart-equipment-sheet");
  const hit = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      reachable: !!top && (el.contains(top) || top === el || el === top?.closest?.("*")),
      covering: top && !el.contains(top) && top !== el ? (top.className || top.tagName) : null };
  };
  const q = (s) => sheet?.querySelector(s) ?? null;
  return {
    clicksToOpen: clicks,
    drawerOpen: !!sheet,
    drawerBox: sheet ? hit(sheet) : null,
    assetClass: hit(q(".wm-chart-toolbar-asset-class")),
    symbolInput: hit(q(".wm-chart-symbol-search input")),
    symbolPlaceholder: q(".wm-chart-symbol-search input")?.getAttribute("placeholder") ?? null,
    hoursSelect: hit(q("select")),
    hoursOptions: Array.from(q("select")?.options ?? []).map((o) => o.text),
    indicators: hit(Array.from(sheet?.querySelectorAll("button") ?? [])
      .find((b) => b.textContent.trim().startsWith("Indicators")) ?? null),
    identityStillOnGlass: (() => {
      const n = document.querySelector("[data-chart-identity]");
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        text: n.textContent.replace(/\s+/g, " ").trim() };
    })(),
    candlesStillVisible: !!document.querySelector(".tv-lightweight-charts"),
  };
}, clicks), null, 2));
await page.screenshot({ path: "scratchpad/d702-drawer-1440.png" });
await browser.close();
