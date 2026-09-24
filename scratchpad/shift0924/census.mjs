import { chromium } from "playwright-core";
import { fixtureBars } from "./fixture.mjs";
const [,, out, openTools = "1"] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "floor-instrument@localhost.invalid", displayName: "Floor Instrument", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureBars(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(() => {
  for (const k of ["wm_fixedVP","wm_sessionVP","wm_ofLivingProfile","wm_ofTpoProfile","wm_ofStructureProfile","wm_ofProfileDna","wm_ofMarketStructure"])
    try { localStorage.setItem(k, "true"); } catch {}
});
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(25000);
if (openTools === "1") {
  await p.getByRole("button", { name: /^Tools/ }).first().click();
  await p.waitForTimeout(2500);
}
await p.screenshot({ path: out });
const rows = await p.$$eval('[data-testid="profiles-instrument-grid"] [role="menuitemcheckbox"], [data-testid="profiles-instrument-grid"] button',
  els => els.map(e => (e.getAttribute("aria-label") || e.textContent || "").slice(0, 90) + " | checked=" + e.getAttribute("aria-checked")));
console.log(rows.join("\n"));
const ds = await p.evaluate(() => { const el = document.querySelector("[data-living-profile]"); return el ? { ...el.dataset } : null; });
console.log(JSON.stringify(ds));
await b.close();
