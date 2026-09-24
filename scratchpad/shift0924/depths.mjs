import { chromium } from "playwright-core";
import { fixtureWeekNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureWeekNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(() => {
  for (const k of ["wm_ofLivingProfile","wm_ofCompositeProfile","wm_ofProfileMemory","wm_ofProfileFusion","wm_ofTpoProfile","wm_ofValueMigration","wm_ofMarketStructure","wm_ofEffortMark"]) localStorage.setItem(k, "true");
  for (const k of ["wm_fixedVP","wm_sessionVP","wm_ofStructureProfile","wm_ofProfileDna","wm_ofVisibleRangeProfile","wm_ofRegimeLighting"]) localStorage.setItem(k, "false");
});
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(25000);
const read = async () => p.evaluate(() => {
  const d = document.querySelector("[data-living-profile]")?.dataset ?? {};
  return { zoom: d.semanticZoom, bars: d.semanticZoomBars, density: d.semanticDensity, decision: d.activeDecisionId ?? "(none)" };
});
const shot = async (name) => { await p.mouse.move(1500, 960); await p.waitForTimeout(800); await p.screenshot({ path: `scratchpad/shift0924/depth_${name}.png` }); console.log(name.padEnd(5), JSON.stringify(await read())); };
await shot("start");
for (let i = 0; i < 14; i++) { await p.mouse.move(700, 450); await p.mouse.wheel(0, 400); await p.waitForTimeout(150); }
await p.waitForTimeout(1500); await shot("out");
for (let i = 0; i < 45; i++) { await p.mouse.move(1000, 450); await p.mouse.wheel(0, -600); await p.waitForTimeout(120); }
await p.waitForTimeout(1500); await shot("in");
await b.close();
