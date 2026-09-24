import { chromium } from "playwright-core";
import { fixtureWeekNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: (() => { const c = fixtureWeekNow(); return JSON.stringify({ candles: c, barFidelity: "INDICATIVE", sessionKnown: false,
    barIdentities: c.map(b => ({ barId: `AAPL|5m|${b.time * 1000}|e0`, symbolId: "AAPL", sessionId: "UNKNOWN", timeframe: "5m",
      asOf: b.time * 1000, receivedAt: b.time * 1000 + 1, fidelity: "INDICATIVE", source: "yahoo", provenance: "REST_BACKFILL", truthEpoch: 0 })) }); })() }));
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(18000);
await p.getByRole("button", { name: /^Tools/ }).first().click();
await p.waitForTimeout(900);
await p.getByText("Market object passport", { exact: true }).first().click();
await p.waitForTimeout(1800);
console.log("picker rows:", (await p.locator('[data-testid="passport-object-picker"] button').allInnerTexts()).join(" | "));
await p.screenshot({ path: "scratchpad/shift0924/passport_door.png" });
await p.locator('[data-testid="passport-pick-DEMAND"]').click();
await p.waitForTimeout(1500);
console.log("inspect zone:", await p.locator('[data-testid="chart-inspect-ticket"]').getAttribute("data-inspect-zone"));
await p.screenshot({ path: "scratchpad/shift0924/passport_door_picked.png" });
await b.close();
process.exit(0);
for (const name of ["Market reality", "Market object passport", "Decision chain", "Your personal edge"]) {
  await p.getByRole("button", { name: /^Tools/ }).first().click();
  await p.waitForTimeout(900);
  await p.getByText(name, { exact: true }).first().click();
  await p.waitForTimeout(1800);
  const f = "scratchpad/shift0924/door_" + name.replace(/\s+/g, "_") + ".png";
  await p.screenshot({ path: f });
  console.log(name, "→", f);
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  const close = p.getByRole("button", { name: /^close$/i }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  await p.waitForTimeout(600);
}
await b.close();
