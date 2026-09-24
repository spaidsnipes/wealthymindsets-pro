// Appearance owns the absorption ink: set it to pure cyan, count cyan pixels on the chart. FIXTURE bars.
import { chromium } from "playwright-core";
import { fixtureExhaustNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const ink of [null, "#00FFFF"]) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
  await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ candles: fixtureExhaustNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
  if (ink) await ctx.addInitScript(v => { try { localStorage.setItem("wm_chartSettings", JSON.stringify({ absorptionInk: v })); } catch {} }, ink);
  const p = await ctx.newPage();
  await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 180000 });
  await p.waitForTimeout(16000);
  const n = await p.evaluate(() => {
    const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.absorption !== undefined);
    if (!c) return -1;
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let k = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 40 && d[i + 1] > 200 && d[i + 2] > 200 && d[i + 3] > 150) k++;
    return k;
  });
  console.log(ink ?? "default", "cyan px on overlay:", n);
  if (ink) await p.screenshot({ path: "scratchpad/shift0924/appearance_absorption_ink.png" });
  await ctx.close();
}
await b.close();
