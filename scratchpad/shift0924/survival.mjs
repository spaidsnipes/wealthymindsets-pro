import { chromium } from "playwright-core";
import { fixtureBars } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "floor-instrument@localhost.invalid", displayName: "Floor Instrument", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureBars(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
const p = await ctx.newPage();
const KEYS = ["livingProfile","tpoProfile","structureProfile","profileDna","valueMigration"];
const read = async label => {
  const ds = await p.evaluate(() => { const el = document.querySelector("[data-living-profile]"); return el ? { ...el.dataset } : {}; });
  const ls = await p.evaluate(() => ["wm_ofLivingProfile","wm_ofTpoProfile","wm_ofStructureProfile","wm_ofProfileDna","wm_ofValueMigration"].map(k => localStorage.getItem(k)).join(","));
  console.log(label.padEnd(26), KEYS.map(k => `${k}=${ds[k] ?? "-"}`).join("  "), " | ls:", ls, " | url:", new URL(p.url()).pathname + new URL(p.url()).search);
};
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
// Turn the five ON THROUGH THE REAL MENU is slow to script; set the trader's
// persisted switches once (the same keys the menu writes), then prove they
// SURVIVE — that is the claim under test.
await p.evaluate(() => { for (const k of ["wm_ofLivingProfile","wm_ofTpoProfile","wm_ofStructureProfile","wm_ofProfileDna","wm_ofValueMigration"]) localStorage.setItem(k, "true"); });
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(22000);
await read("1 after first load");
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(22000);
await read("2 after REFRESH");
await p.getByRole("button", { name: /^Tools/ }).first().click(); await p.waitForTimeout(2500);
await read("3 W (Tools) OPEN");
await p.screenshot({ path: "scratchpad/shift0924/survival_w_open.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(2500);
await read("4 W closed (Escape)");
await p.screenshot({ path: "scratchpad/shift0924/survival_w_closed.png" });
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=15m", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(20000);
await read("5 timeframe 15m");
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(20000);
await read("6 RETURN to 5m");
await b.close();
