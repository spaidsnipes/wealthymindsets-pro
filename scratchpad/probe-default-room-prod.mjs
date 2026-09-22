#!/usr/bin/env node
/**
 * WHAT DOES A GUEST'S FIRST /charts ARRIVAL ACTUALLY RENDER?
 * No symbol param — exactly the front door. LAYOUT ONLY; /api/auth/me
 * RESPONSE stubbed in this browser context only.
 */
import { chromium } from "playwright";
const BASE = "https://wealthymindsetspro.com";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "p", email: "l@p.local", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 200)));
const ws = [];
page.on("websocket", (s) => { const r = { url: s.url().slice(0, 70), framesIn: 0 }; ws.push(r); s.on("framereceived", () => { r.framesIn++; }); });
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(25000);
console.log(JSON.stringify({
  url: page.url(),
  ...(await page.evaluate(() => {
    const tv = document.querySelector(".tv-lightweight-charts");
    const cr = tv?.getBoundingClientRect() ?? null;
    const id = document.querySelector("[data-chart-identity]");
    const receipts = {};
    for (const c of document.querySelectorAll("canvas")) for (const [k, v] of Object.entries(c.dataset)) receipts[k] = v;
    return {
      candles: cr ? { y: Math.round(cr.top), h: Math.round(cr.height) } : null,
      identity: id ? (id.innerText || "").replace(/\s+/g, " ").trim() : null,
      lastSymbol: (() => { try { return localStorage.getItem("wm_last_symbol"); } catch { return "ERR"; } })(),
      bodyHead: (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 200),
      receipts,
    };
  })),
  ws, errs: errs.slice(0, 6),
}, null, 1));
await browser.close();
