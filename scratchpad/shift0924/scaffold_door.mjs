import { chromium } from "playwright-core";
import { fixtureExhaustNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureExhaustNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(() => { localStorage.setItem("wm_absorptionAnatomy", "true"); localStorage.setItem("wm_ofScaffolding", "\"OFF\""); });
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(18000);
await p.getByRole("button", { name: /^Tools/ }).first().click();
await p.waitForTimeout(900);
await p.getByText("Chart tools", { exact: true }).first().click();
await p.waitForTimeout(1500);
const row = p.locator('[data-testid="reading-lenses-panel"] [role="menuitemcheckbox"]', { hasText: "Scaffolding" });
for (let i = 0; i < 2; i++) {
  await row.click(); await p.waitForTimeout(900);
  console.log("click", i + 1, "→", (await row.innerText()).replace(/\s+/g, " "),
    "| canvas:", await p.evaluate(() => [...document.querySelectorAll("canvas")].map(c => c.dataset.scaffolding).find(Boolean)));
}
await row.scrollIntoViewIfNeeded();
await p.screenshot({ path: "scratchpad/shift0924/scaffold_door.png" });
await b.close();
