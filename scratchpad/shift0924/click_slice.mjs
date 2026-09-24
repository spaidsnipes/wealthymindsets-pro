import { chromium } from "playwright-core";
import { fixtureBars } from "./fixture.mjs";
const [,, out, pageY = "640"] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "floor-instrument@localhost.invalid", displayName: "Floor Instrument", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureBars(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(() => {
  for (const k of ["wm_fixedVP","wm_sessionVP","wm_ofTpoProfile","wm_ofStructureProfile","wm_ofProfileDna","wm_ofValueMigration"]) try { localStorage.setItem(k, "false"); } catch {}
  localStorage.setItem("wm_ofLivingProfile", "true");
});
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(25000);
const lane = await p.evaluate(() => {
  const el = document.querySelector("[data-living-profile]");
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, l: +el.dataset.livingProfileLaneLeft, rr: +el.dataset.livingProfileLaneRight };
});
const x = lane.left + (lane.l + lane.rr) / 2;
await p.mouse.move(x, +pageY);
await p.mouse.down(); await p.mouse.up();
await p.waitForTimeout(1500);
await p.screenshot({ path: out });
const t = await p.evaluate(() => {
  const el = document.querySelector('[data-testid="chart-inspect-ticket"]');
  const c = document.querySelector("[data-living-profile]");
  return { slice: el?.getAttribute("data-inspect-profile-slice"), text: el?.textContent?.slice(0, 400), outlined: c?.dataset.livingProfileSelected };
});
console.log(JSON.stringify({ lane, x, ...t }, null, 1));
await b.close();
