import { chromium } from "playwright-core";
import { fixtureExhaustNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureExhaustNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(() => { localStorage.setItem("wm_absorptionAnatomy", "true"); });
const p = await ctx.newPage();
const errs = []; p.on("pageerror", e => errs.push(e.message.split("\n")[0]));
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(18000);
await p.getByRole("button", { name: /^Tools/ }).first().click();
await p.waitForTimeout(1200);
await p.screenshot({ path: "scratchpad/shift0924/s1366_tools_menu.png" });
await p.getByText("Order flow", { exact: true }).first().click();
await p.waitForTimeout(2000);
console.log("order-flow tools present:", await p.locator('[data-testid="order-flow-tools"]').count(),
  "rows:", await p.locator('[data-testid="order-flow-tools-menu"] [role="menuitemcheckbox"]').allInnerTexts().then(t => t.map(x => x.split("\n")[0]).join(" | ")));
await p.screenshot({ path: "scratchpad/shift0924/s1366_tools_orderflow.png" });
// switch on Anatomy Cards from this door
await p.locator('[data-testid="order-flow-tools-menu"] [role="menuitemcheckbox"]', { hasText: "Anatomy Cards" }).click();
await p.waitForTimeout(1500);
console.log("anatomy receipt:", await p.evaluate(() => [...document.querySelectorAll("canvas")].map(c => c.dataset.anatomyCards).find(Boolean)));
await p.keyboard.press("Escape"); await p.waitForTimeout(1200);
await p.screenshot({ path: "scratchpad/shift0924/s1366_tools_orderflow_after.png" });
// Chart tools door: Profiles and Reading lenses, separated.
await p.getByRole("button", { name: /^Tools/ }).first().click();
await p.waitForTimeout(1000);
await p.getByText("Chart tools", { exact: true }).first().click();
await p.waitForTimeout(2000);
console.log("profiles rows:", (await p.locator('[data-testid="profiles-menu-panel"] [role="menuitemcheckbox"]').allInnerTexts()).map(x => x.split("\n")[0]).join(" | "));
console.log("lens rows:", (await p.locator('[data-testid="reading-lenses-panel"] [role="menuitemcheckbox"]').allInnerTexts()).map(x => x.split("\n")[0]).join(" | "));
await p.screenshot({ path: "scratchpad/shift0924/s1366_tools_charttools.png" });
console.log("pageerrors", JSON.stringify(errs.slice(0, 3)));
await b.close();
