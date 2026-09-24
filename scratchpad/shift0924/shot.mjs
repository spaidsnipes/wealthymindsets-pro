import { chromium } from "playwright-core";
import { fixtureBars } from "./fixture.mjs";
const [,, out, url = "http://localhost:3100/charts", waitMs = "25000"] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
// LAYOUT/RUNTIME PROOF ONLY — auth response stubbed in this context (same
// technique as scripts/prove-charts-floor.mjs). No token, no account.
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "floor-instrument@localhost.invalid", displayName: "Floor Instrument", handle: "floor", profileComplete: true } }) }));
// FIXTURE BARS: the providers are unreachable from this container, so the
// harness answers the candle request itself. Everything downstream — ingest,
// compilers, canvas — is the real app.
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureBars(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
const p = await ctx.newPage();
await p.addInitScript(() => {
  try {
    localStorage.setItem("wm_ofTpoProfile", "true");
    localStorage.setItem("wm_ofLivingProfile", "true"); localStorage.setItem("wm_ofStructureProfile", "true");
  } catch {}
});
const logs = [];
p.on("console", m => { if (m.type() === "error") logs.push(m.text().slice(0, 200)); });
await p.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(+waitMs);
await p.screenshot({ path: out });
const ds = await p.evaluate(() => {
  const el = document.querySelector("[data-living-profile]") || document.querySelector("[data-tpo-profile]");
  return el ? { ...el.dataset } : null;
});
console.log(JSON.stringify({ url: p.url(), ds }, null, 1));
console.log("errors:", logs.slice(0, 8));
await b.close();
