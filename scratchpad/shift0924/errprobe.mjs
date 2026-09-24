import { chromium } from "playwright-core";
import { fixtureDays } from "./fixture.mjs";
const [,, mode = "load"] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureDays(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript((mode) => {
  const all = ["wm_fixedVP","wm_sessionVP","wm_ofTpoProfile","wm_ofStructureProfile","wm_ofProfileDna","wm_ofValueMigration","wm_ofProfileMemory","wm_ofProfileFusion","wm_ofCompositeProfile","wm_ofVisibleRangeProfile"];
  for (const k of all) localStorage.setItem(k, mode === "allon" ? "true" : "false");
}, mode);
const p = await ctx.newPage();
const t0 = Date.now();
p.on("console", m => { if (m.type() === "error" && /Maximum update depth/.test(m.text())) console.log(`LOOP at +${((Date.now()-t0)/1000).toFixed(1)}s`); });
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(25000);
if (mode === "tools") {
  console.log("opening tools at", ((Date.now()-t0)/1000).toFixed(1));
  await p.getByRole("button", { name: /^Tools/ }).first().click(); await p.waitForTimeout(3000);
  const ct = p.getByText("Chart tools", { exact: false }).first();
  if (await ct.count()) { console.log("chart tools at", ((Date.now()-t0)/1000).toFixed(1)); await ct.click(); await p.waitForTimeout(3000); }
}
if (mode.startsWith("draw-")) {
  const label = mode === "draw-delta" ? "Delta + VP." : "Anchored Range VP.";
  await p.getByRole("button", { name: /^Tools/ }).first().click(); await p.waitForTimeout(1500);
  const ct = p.getByText("Chart tools", { exact: false }).first();
  if (await ct.count()) { await ct.click(); await p.waitForTimeout(1500); }
  console.log("click row at", ((Date.now()-t0)/1000).toFixed(1));
  await p.locator(`[aria-label^="${label}"]`).first().click(); await p.waitForTimeout(1500);
  console.log("escape at", ((Date.now()-t0)/1000).toFixed(1));
  await p.keyboard.press("Escape"); await p.waitForTimeout(1500);
  console.log("drag at", ((Date.now()-t0)/1000).toFixed(1));
  await p.mouse.move(560, 450); await p.mouse.down(); await p.mouse.move(820, 520, { steps: 15 }); await p.mouse.up();
  await p.waitForTimeout(2500);
  console.log("pan at", ((Date.now()-t0)/1000).toFixed(1));
  await p.mouse.move(500, 300); await p.mouse.down(); await p.mouse.move(700, 300, { steps: 10 }); await p.mouse.up();
  await p.waitForTimeout(2500);
}
console.log("done", mode);
await b.close();
