// Liquidity lifecycle on FIXTURE bars (week), via the REVIEW desk.
import { chromium } from "playwright-core";
import { fixtureWeekNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ candles: fixtureWeekNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(() => { localStorage.setItem("wm_prefRepair", "1"); localStorage.setItem("wm_absorptionAnatomy", "false"); localStorage.setItem("wm_ofLiquidityLifecycle", "true"); localStorage.setItem("wm_ofLivingProfile", "false"); });
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 180000 });
await p.waitForTimeout(18000);
await p.mouse.move(10, 990);
console.log("lifecycle:", await p.evaluate(() => [...document.querySelectorAll("canvas")].map(c => c.dataset.liquidityLifecycle).find(x => x !== undefined) ?? "none"));
await p.screenshot({ path: "scratchpad/shift0924/runtime_lifecycle.png" });
await b.close();
