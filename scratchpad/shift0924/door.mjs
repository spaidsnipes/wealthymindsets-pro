import { chromium } from "playwright-core";
import { fixtureDays } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureDays(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(() => {
  for (const k of ["wm_ofLivingProfile","wm_ofTpoProfile","wm_ofProfileMemory","wm_ofProfileFusion","wm_ofValueMigration"]) localStorage.setItem(k, "true");
  for (const k of ["wm_fixedVP","wm_sessionVP","wm_ofStructureProfile","wm_ofProfileDna","wm_ofCompositeProfile","wm_ofVisibleRangeProfile"]) localStorage.setItem(k, "false");
});
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(25000);
await p.getByRole("button", { name: /^Tools/ }).first().click(); await p.waitForTimeout(1500);
const ct = p.getByText("Chart tools", { exact: false }).first();
if (await ct.count()) { await ct.click(); await p.waitForTimeout(2000); }
const panel = p.locator('[data-testid="profiles-menu-panel"]').first();
await panel.scrollIntoViewIfNeeded().catch(() => {});
await p.screenshot({ path: "scratchpad/shift0924/door_full.png" });
const box = await panel.boundingBox();
if (box) await p.screenshot({ path: "scratchpad/shift0924/door_panel.png", clip: { x: Math.max(0, box.x - 4), y: Math.max(0, box.y - 4), width: Math.min(1600, box.width + 8), height: Math.min(1000 - Math.max(0, box.y - 4), box.height + 8) } });
const rows = await p.$$eval('[data-testid="profiles-instrument-grid"] [aria-label]', els => els.map(e => e.getAttribute("aria-label")));
console.log(rows.length + " rows");
for (const r of rows) console.log(" · " + r);
await b.close();
