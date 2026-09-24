import { chromium } from "playwright-core";
import { fixtureExhaustNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureExhaustNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
const p = await ctx.newPage();
await p.goto("http://localhost:3100/education", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(9000);
const card = p.locator('[data-testid="academy-scaffolding-path"]');
await card.scrollIntoViewIfNeeded();
await p.screenshot({ path: "scratchpad/shift0924/academy_scaffold.png" });
await p.locator('[data-testid="academy-scaffolding-open"]').click();
await p.waitForURL("**/charts**", { timeout: 60000 });
await p.waitForTimeout(18000);
console.log("url:", p.url(), "receipt:", await p.evaluate(() => [...document.querySelectorAll("canvas")].map(c => c.dataset.scaffolding).find(Boolean)));
await p.screenshot({ path: "scratchpad/shift0924/academy_scaffold_charts.png" });
await b.close();
