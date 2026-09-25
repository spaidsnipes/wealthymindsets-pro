// FIXTURE bars with three holes punched inside a session (feed drop). NOT market data.
import { chromium } from "playwright-core";
import { fixtureDaysNow } from "../shift0924/fixture.mjs";
const all = fixtureDaysNow();
const n = all.length;
const drop = new Set([n - 60, n - 59, n - 30]);
const bars = all.filter((_, i) => !drop.has(i));
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: bars, barFidelity: "INDICATIVE", sessionKnown: false }) }));
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(25000);
await p.mouse.move(1590, 990); await p.waitForTimeout(800);
console.log(JSON.stringify(await p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.dataGaps !== undefined); return c?.dataset.dataGaps; })));
await p.screenshot({ path: process.argv[2] || "scratchpad/garden12/gaps_after.png" });
await b.close();
