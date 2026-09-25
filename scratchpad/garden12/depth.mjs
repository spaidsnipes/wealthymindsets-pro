// Same camera, FAR → MID → NEAR by wheel zoom. FIXTURE bars (week).
import { chromium } from "playwright-core";
import { fixtureWeekNow } from "../shift0924/fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ candles: fixtureWeekNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 180000 });
await p.waitForTimeout(18000);
const read = () => p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.absorptionDepthForm !== undefined); return { far: c?.dataset.farForm, form: c?.dataset.absorptionDepthForm, living: c?.dataset.livingProfileDepthForm, density: c?.dataset.semanticDensity }; });
const shot = async (name) => { await p.mouse.move(1590, 990); await p.waitForTimeout(1200); console.log(name, JSON.stringify(await read())); await p.screenshot({ path: `scratchpad/garden12/depth_${name}.png` }); };
await shot("start");
await p.mouse.move(700, 450);
for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 400); await p.waitForTimeout(80); }
await shot("far");
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(16000);
await p.mouse.move(1180, 450);
for (let i = 0; i < 40; i++) {
  const n = await p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.semanticDensity !== undefined); return c?.dataset.semanticDensity; });
  if (n && n.startsWith("0.28")) break;
  await p.mouse.wheel(0, -150); await p.waitForTimeout(120);
}
await shot("near");
await b.close();
