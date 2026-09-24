// H-601A presets proof on FIXTURE bars: Tools › Chart tools › Presets.
import { chromium } from "playwright-core";
import { fixtureWeekNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureWeekNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(() => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("wm_prefRepair", "1"); localStorage.setItem("wm_absorptionAnatomy", "false"); sessionStorage.setItem("seeded", "1"); } });
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(16000);
const species = async () => p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.tpoProfile !== undefined || c.dataset.livingProfile !== undefined); if (!c) return "none"; const d = c.dataset; return { tpo: d.tpoProfile, memory: d.profileMemory, migration: d.valueMigration, living: d.livingProfile, composite: d.compositeProfile, stack: d.profileStack }; });
await p.getByRole("button", { name: /^Tools/ }).first().click(); await p.waitForTimeout(700);
await p.getByText("Chart tools", { exact: true }).first().click(); await p.waitForTimeout(1200);
const bar = p.locator('[data-testid="profile-preset-bar"]');
console.log("bar at open:", (await bar.innerText()).replace(/\s+/g, " "));
await p.locator('[data-testid="profile-preset-AUCTION"]').click(); await p.waitForTimeout(1200);
console.log("after Auction:", (await bar.innerText()).replace(/\s+/g, " "));
console.log("pressed:", await p.locator('[data-testid="profile-preset-AUCTION"]').getAttribute("aria-pressed"));
await p.screenshot({ path: "scratchpad/shift0924/runtime_presets_door.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(1500);
console.log("chart:", JSON.stringify(await species()));
await p.screenshot({ path: "scratchpad/shift0924/runtime_presets_auction.png" });
// A hand flip unlights the preset.
await p.getByRole("button", { name: /^Tools/ }).first().click(); await p.waitForTimeout(700);
await p.getByText("Chart tools", { exact: true }).first().click(); await p.waitForTimeout(1000);
await p.locator('[data-testid="profiles-menu-panel"] [role="menuitemcheckbox"]', { hasText: "Living Profile" }).first().click(); await p.waitForTimeout(800);
console.log("after hand flip:", (await bar.innerText()).replace(/\s+/g, " "));
await b.close();
