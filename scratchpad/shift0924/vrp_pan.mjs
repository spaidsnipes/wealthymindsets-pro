import { chromium } from "playwright-core";
import { fixtureDays } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "floor-instrument@localhost.invalid", displayName: "Floor Instrument", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureDays(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(() => {
  const all = ["wm_fixedVP","wm_sessionVP","wm_ofTpoProfile","wm_ofStructureProfile","wm_ofProfileDna","wm_ofValueMigration","wm_ofProfileMemory","wm_ofProfileFusion","wm_ofMarketStructure","wm_absorptionAnatomy"];
  for (const k of all) try { localStorage.setItem(k, "false"); } catch {}
  for (const k of ["wm_ofLivingProfile","wm_ofCompositeProfile","wm_ofVisibleRangeProfile"]) localStorage.setItem(k, "true");
});
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(25000);
const read = async () => p.evaluate(() => {
  const d = document.querySelector("[data-living-profile]")?.dataset ?? {};
  return { vrp: d.visibleRangeProfile, vrpBars: d.visibleRangeProfileBars, vrpPoc: d.visibleRangeProfilePoc, lanes: d.profileStackLanes, living: d.livingProfile, composite: d.compositeProfile };
});
const before = await read();
await p.screenshot({ path: "scratchpad/shift0924/vrp_before.png" });
// Pan the camera toward older bars: drag the chart body to the right.
for (let i = 0; i < 3; i++) {
  await p.mouse.move(500, 500); await p.mouse.down();
  await p.mouse.move(900, 500, { steps: 12 }); await p.mouse.up();
  await p.waitForTimeout(600);
}
await p.waitForTimeout(1500);
const after = await read();
await p.screenshot({ path: "scratchpad/shift0924/vrp_after_pan.png" });
console.log("BEFORE", JSON.stringify(before));
console.log("AFTER ", JSON.stringify(after));
console.log(before.vrpPoc !== after.vrpPoc ? "VRP MOVED WITH THE VIEW ✓" : "VRP DID NOT MOVE ✗");
await b.close();
