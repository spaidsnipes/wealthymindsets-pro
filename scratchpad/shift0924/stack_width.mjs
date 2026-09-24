import { chromium } from "playwright-core";
import { fixtureWeekNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureWeekNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(() => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s","1"); localStorage.removeItem("wm_ofStackPrefs");
  localStorage.setItem("wm_ofLivingProfile","true"); localStorage.setItem("wm_ofCompositeProfile","true"); localStorage.setItem("wm_ofVisibleRangeProfile","true"); } });
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(18000);
const lanes = () => p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.profileStackLanes !== undefined); return c ? `${c.dataset.profileStackLanes} livingLane=${c.dataset.livingProfileLaneLeft}-${c.dataset.livingProfileLaneRight}` : "none"; });
console.log("lanes before:", await lanes());
await p.screenshot({ path: "scratchpad/shift0924/width_before.png" });
await p.getByRole("button", { name: /^Tools/ }).first().click(); await p.waitForTimeout(700);
await p.getByText("Chart tools", { exact: true }).first().click(); await p.waitForTimeout(1200);
await p.getByRole("button", { name: "Move Visible Range Profile inward" }).click(); await p.waitForTimeout(300);
await p.getByRole("button", { name: "Move Visible Range Profile inward" }).click(); await p.waitForTimeout(300);
await p.locator('[data-testid="stack-width-COMPOSITE"]').click(); await p.locator('[data-testid="stack-width-COMPOSITE"]').click();
await p.locator('[data-testid="stack-arrange-bar"]').scrollIntoViewIfNeeded();
await p.screenshot({ path: "scratchpad/shift0924/width_panel.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(1200);
console.log("lanes after:", await lanes());
await p.screenshot({ path: "scratchpad/shift0924/width_after.png" });
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(16000);
console.log("lanes after reload:", await lanes());
await b.close();
