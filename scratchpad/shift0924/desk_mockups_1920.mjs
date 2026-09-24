// Fresh visit → Workspace → ORDER FLOW / REVIEW: do the mockup tools appear? FIXTURE bars.
import { chromium } from "playwright-core";
import { fixtureExhaustNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ candles: fixtureExhaustNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 180000 });
await p.waitForTimeout(16000);
const ds = () => p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.absorption !== undefined); const d = c?.dataset ?? {}; return { absorption: d.absorption, cards: d.anatomyCards, lens: d.questionLens, scaffold: d.scaffolding, chips: d.absorptionChips, callout: d.questionCallout, cardK: d.anatomyCardsScale, lcs: d.liquidityLifecycleStatus, lc: d.liquidityLifecycle }; });
for (const desk of ["Order Flow", "Review"]) {
  await p.getByRole("button", { name: /^Workspace/ }).first().click(); await p.waitForTimeout(900);
  await p.getByRole("button", { name: new RegExp("^" + desk) }).first().click(); await p.waitForTimeout(2000);
  await p.keyboard.press("Escape"); await p.mouse.move(1590, 990); await p.waitForTimeout(1500);
  console.log(desk, JSON.stringify(await ds()));
  await p.screenshot({ path: `scratchpad/shift0924/desk1920_${desk.replace(" ", "_").toLowerCase()}.png` });
}
await b.close();
