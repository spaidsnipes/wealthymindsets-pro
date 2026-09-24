import { chromium } from "playwright-core";
import { fixtureWeekNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureWeekNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(() => { if (!sessionStorage.getItem("seeded")) { localStorage.removeItem("wm_ofMyStack"); localStorage.setItem("wm_ofTpoProfile", "false"); sessionStorage.setItem("seeded", "1"); } });
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(16000);
const tpo = async () => p.evaluate(() => [...document.querySelectorAll("canvas")].map(c => c.dataset.tpoProfile).find(x => x !== undefined) ?? "none");
const open = async () => { await p.getByRole("button", { name: /^Tools/ }).first().click(); await p.waitForTimeout(700); await p.getByText("Chart tools", { exact: true }).first().click(); await p.waitForTimeout(1200); };
await open();
const row = p.locator('[data-testid="profiles-menu-panel"] [role="menuitemcheckbox"]', { hasText: "TPO Profile" });
await row.click(); await p.waitForTimeout(600);
console.log("after TPO on:", await tpo());
await p.locator('[data-testid="my-stack-save"]').click(); await p.waitForTimeout(400);
console.log("bar:", await p.locator('[data-testid="my-stack-bar"]').innerText());
await row.click(); await p.waitForTimeout(800);
console.log("after TPO off:", await tpo());
await p.locator('[data-testid="my-stack-restore"]').click(); await p.waitForTimeout(1000);
console.log("after restore:", await tpo());
await p.locator('[data-testid="my-stack-bar"]').scrollIntoViewIfNeeded();
await p.screenshot({ path: "scratchpad/shift0924/mystack.png" });
await b.close();
