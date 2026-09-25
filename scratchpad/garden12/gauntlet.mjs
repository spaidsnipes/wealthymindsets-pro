// CONTINUITY GAUNTLET (Garden 12 · Defect 7). One MarketObject through the house.
// FIXTURE bars + identities (harness-injected, NOT market data); auth stubbed.
import { chromium } from "playwright-core";
import { fixtureWeekNow } from "../shift0924/fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
const candles = fixtureWeekNow();
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles, barFidelity: "INDICATIVE", sessionKnown: false,
    barIdentities: candles.map(b => ({ barId: `AAPL|5m|${b.time * 1000}|e0`, symbolId: "AAPL", sessionId: "UNKNOWN", timeframe: "5m",
      asOf: b.time * 1000, receivedAt: b.time * 1000 + 1, fidelity: "INDICATIVE", source: "yahoo", provenance: "REST_BACKFILL", truthEpoch: 0 })) }) }));
await ctx.addInitScript(() => { if (!sessionStorage.getItem("g")) { sessionStorage.setItem("g", "1"); localStorage.setItem("wm_ofLivingProfile", "true"); } });
const p = await ctx.newPage();
const errs = []; p.on("pageerror", e => errs.push(e.message.split("\n")[0]));
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 180000 });
await p.waitForTimeout(20000);
const state = () => p.evaluate(() => {
  const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.absorption !== undefined) ?? {};
  const d = c.dataset ?? {};
  const targets = [...document.querySelectorAll("[data-market-object-target]")].map(e => e.getAttribute("data-market-object-target"));
  const selected = [...document.querySelectorAll("[data-market-object-target][aria-pressed=true]")].map(e => e.getAttribute("data-market-object-target"));
  const tickets = document.querySelectorAll('[data-testid="chart-inspect-ticket"]').length;
  const passport = document.querySelector("[data-inspect-zone]")?.getAttribute("data-inspect-zone") ?? null;
  return { selected, passport, zoneOnGlass: d.marketZoneSelected ?? null, dupTargets: targets.length - new Set(targets).size, tickets, depth: d.semanticDensity, candlesPx: null };
});
const ids = await p.$$eval("[data-market-object-target]", els => els.map(e => e.getAttribute("data-market-object-target")));
const z = ids.find(i => i.startsWith("ZONE:") && i.endsWith("DEMAND")) ?? ids.find(i => i.startsWith("ZONE:"));
console.log("OBJECT:", z);
await p.locator(`[data-market-object-target="${z}"]`).click(); await p.waitForTimeout(1200);
const log = async (step) => { await p.mouse.move(1590, 990); await p.waitForTimeout(900); const s = await state(); const ok = s.zoneOnGlass === z && s.dupTargets === 0; console.log(ok ? "PASS" : "FAIL", step.padEnd(34), JSON.stringify(s)); return s; };
await log("1 select");
await p.keyboard.press("Escape"); await log("2 close drawer (Esc)");
for (const desk of ["Order Flow", "Regime", "Review", "Clean"]) {
  await p.getByRole("button", { name: /^Workspace/ }).first().click(); await p.waitForTimeout(700);
  await p.getByRole("button", { name: new RegExp("^" + desk) }).first().click().catch(() => {}); await p.waitForTimeout(1200);
  await p.keyboard.press("Escape"); await log(`3 workspace → ${desk}`);
}
await p.mouse.move(700, 450); for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, 400); await p.waitForTimeout(60); } await log("4 depth → FAR");
await p.mouse.move(1150, 450); for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, -400); await p.waitForTimeout(60); } await log("5 depth → back");
await p.getByRole("button", { name: /inspect/i }).first().click().catch(() => {}); await log("6 Inspect pressed");
await p.mouse.move(600, 400); await p.mouse.down(); await p.mouse.move(760, 400, { steps: 8 }); await p.mouse.up(); await log("7 pan");
console.log("stored before reload:", JSON.stringify(await p.evaluate(() => Object.entries(sessionStorage).filter(([k]) => k.startsWith("wm:selectedObject")))));
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(18000); console.log("stored after reload:", JSON.stringify(await p.evaluate(() => Object.entries(sessionStorage).filter(([k]) => k.startsWith("wm:selectedObject")))), JSON.stringify((await p.$$eval("[data-market-object-target]", els => els.map(e => e.getAttribute("data-market-object-target")))).slice(0,4)));
const r = await log("8 refresh (same object, calm: Inspect closed)");
if (r.zoneOnGlass !== z) { await p.locator(`[data-market-object-target="${z}"]`).click().catch(() => {}); await p.waitForTimeout(1200); await log("9 return to object after refresh"); }
console.log("pageerrors:", JSON.stringify(errs.slice(0, 3)));
await p.screenshot({ path: "scratchpad/garden12/gauntlet_end.png" });
await b.close();
