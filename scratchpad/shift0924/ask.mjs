// ORDER FLOW desk → Question Lens on → ASK each question. FIXTURE bars, auth stubbed.
import { chromium } from "playwright-core";
import { fixtureExhaustNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ candles: fixtureExhaustNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 180000 });
await p.waitForTimeout(16000);
await p.getByRole("button", { name: /^Workspace/ }).first().click(); await p.waitForTimeout(900);
await p.getByRole("button", { name: /^Order Flow/ }).first().click(); await p.waitForTimeout(2000);
await p.keyboard.press("Escape"); await p.mouse.move(1590, 990); await p.waitForTimeout(1200);
const ds = () => p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.questionLens !== undefined); return { lens: c?.dataset.questionLens, choice: c?.dataset.questionChoice }; });
console.log("chooser count", await p.locator("[data-testid=question-lens-chooser]").count(), "lens", JSON.stringify(await ds()));
await p.screenshot({ path: "scratchpad/shift0924/ask_debug.png" });
for (const id of ["AUTO", "CONTINUATION", "TRAP", "HOLD", "EXHAUSTION", "WHAT_CHANGED", "ABSORPTION"]) {
  await p.locator(`[data-testid=question-lens-chooser] [data-question-choice="${id}"]`).click(); await p.mouse.move(1590, 990); await p.waitForTimeout(1500);
  console.log(id, JSON.stringify(await ds()));
  await p.screenshot({ path: `scratchpad/shift0924/ask_${id.toLowerCase()}.png` });
}
console.log("persisted:", await p.evaluate(() => localStorage.getItem("wm_questionChoice")));
await b.close();
