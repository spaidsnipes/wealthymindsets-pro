import { chromium } from "playwright-core";
import { fixtureWeekNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ candles: fixtureWeekNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 180000 });
await p.waitForTimeout(15000);
await p.getByRole("button", { name: /^Tools/ }).first().click(); await p.waitForTimeout(700);
await p.getByText("Chart tools", { exact: true }).first().click(); await p.waitForTimeout(1200);
const panel = p.locator('[data-testid="profiles-menu-panel"]');
await panel.scrollIntoViewIfNeeded();
console.log("PROFILES:", (await panel.innerText()).replace(/\s+/g, " ").replace(/READY|DRAWING|TAPE REQUIRED/g, "").slice(0, 700));
await p.screenshot({ path: "scratchpad/shift0924/taxonomy_profiles.png" });
await b.close();
