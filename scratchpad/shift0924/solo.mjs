// One profile species (plus Living) switched on, the rest explicitly OFF,
// so each receipt shows exactly one child against its plate.
import { chromium } from "playwright-core";
import { fixtureBars, fixtureDays } from "./fixture.mjs";
const [,, out, ...onKeys] = process.argv;
const ALL = ["wm_fixedVP","wm_sessionVP","wm_ofLivingProfile","wm_ofTpoProfile","wm_ofStructureProfile","wm_ofProfileDna","wm_ofMarketStructure","wm_ofValueMigration","wm_ofProfileMemory","wm_ofProfileFusion","wm_ofCompositeProfile"];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "floor-instrument@localhost.invalid", displayName: "Floor Instrument", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: process.env.FIXTURE === "days" ? fixtureDays() : fixtureBars(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(([all, on]) => {
  for (const k of all) try { localStorage.setItem(k, on.includes(k) ? "true" : "false"); } catch {}
}, [ALL, onKeys]);
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(25000);
await p.screenshot({ path: out });
const ds = await p.evaluate(() => { const el = document.querySelector("[data-living-profile]"); return el ? { ...el.dataset } : null; });
console.log(JSON.stringify(ds));
await b.close();
