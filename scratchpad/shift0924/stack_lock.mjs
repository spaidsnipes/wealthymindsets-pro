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
await p.locator('[data-testid="profile-preset-DAY_TRADER"]').click(); await p.waitForTimeout(900);
console.log("day trader:", JSON.stringify(await species()));
await p.locator('[data-testid="stack-lock-LIVING"]').scrollIntoViewIfNeeded();
await p.locator('[data-testid="stack-lock-LIVING"]').click(); await p.waitForTimeout(500);
console.log("lock:", await p.locator('[data-testid="stack-lock-LIVING"]').innerText());
await p.locator('[data-testid="profile-preset-CLEAN"]').scrollIntoViewIfNeeded();
await p.locator('[data-testid="profile-preset-CLEAN"]').click(); await p.waitForTimeout(1200);
console.log("after Clean with Living locked:", JSON.stringify(await species()), "|", (await bar.innerText()).replace(/\s+/g, " ").slice(0, 80));
await p.locator('[data-testid="stack-arrange-bar"]').scrollIntoViewIfNeeded();
await p.screenshot({ path: "scratchpad/shift0924/runtime_stack_lock.png" });
await b.close();
