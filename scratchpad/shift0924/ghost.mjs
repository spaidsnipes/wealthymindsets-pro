import { chromium } from "playwright-core";
import { fixtureExhaustNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureExhaustNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(() => {
  for (const k of ["wm_ofTpoProfile","wm_ofProfileMemory","wm_ofProfileFusion","wm_ofValueMigration","wm_ofCompositeProfile","wm_ofLivingProfile"]) localStorage.setItem(k, "false");
  localStorage.setItem("wm_absorptionAnatomy", "true"); localStorage.setItem("wm_ofMarketStructure", "true");
});
const p = await ctx.newPage();
const errs = []; p.on("pageerror", e => errs.push(e.message.split("\n")[0]));
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(20000);
for (const d of ["CARDS"]) {
  await p.evaluate(v => { localStorage.setItem("wm_ofAnatomyCards", "false"); localStorage.setItem("wm_ofQuestionLens", "false"); localStorage.setItem("wm_ofMemoryGhost", "true"); localStorage.setItem("wm_ofScaffolding", "\"OFF\""); }, d);
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForTimeout(14000);
  const rc = await p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.memoryGhost); return c ? c.dataset.memoryGhost + " bars=" + c.dataset.memoryGhostBars : "none"; });
  console.log(d, "receipt:", rc);
  await p.screenshot({ path: `scratchpad/shift0924/runtime_ghost_${d}.png` });
}
console.log("pageerrors", JSON.stringify(errs.slice(0,3)));
await b.close();
