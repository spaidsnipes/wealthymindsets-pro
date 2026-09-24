import { chromium } from "playwright-core";
import { fixtureContradictNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: Number(process.env.DSF ?? 1) });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: (() => { const c = fixtureContradictNow(); return JSON.stringify({ candles: c, barFidelity: "INDICATIVE", sessionKnown: false,
    // FIXTURE identities, same shape /api/yahoo returns beside its candles.
    barIdentities: c.map(b => ({ barId: `AAPL|5m|${b.time * 1000}|e0`, symbolId: "AAPL", sessionId: "UNKNOWN", timeframe: "5m",
      asOf: b.time * 1000, receivedAt: b.time * 1000 + 1, fidelity: "INDICATIVE", source: "yahoo", provenance: "REST_BACKFILL", truthEpoch: 0 })) }); })() }));
await ctx.addInitScript((ABS) => { localStorage.setItem("wm_prefRepair", "1"); for (const k of ["wm_ofTpoProfile","wm_ofProfileMemory","wm_ofProfileFusion","wm_ofValueMigration","wm_ofCompositeProfile","wm_absorptionAnatomy"]) localStorage.setItem(k, "false"); localStorage.setItem("wm_ofLivingProfile","true"); localStorage.setItem("wm_ofContradiction","true"); localStorage.setItem("wm_absorptionAnatomy", ABS); }, process.env.ABS ?? "true");
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(22000);
console.log("contradiction:", await p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.contradiction); return c ? JSON.stringify(Object.fromEntries(Object.entries(c.dataset).filter(([k]) => /contradiction|tructure|exhaustion|absorption$/i.test(k)))) : "none"; }));
await p.screenshot({ path: `scratchpad/shift0924/runtime_contra_staircase${process.env.ABS === "false" ? "_absoff" : ""}.png` });
if (process.env.CLIP) { const [x, y, w, h] = process.env.CLIP.split(",").map(Number); await p.screenshot({ path: "scratchpad/shift0924/runtime_contra_detail.png", clip: { x, y, width: w, height: h } }); }
await b.close();
process.exit(0);
const ids = await p.$$eval("[data-market-object-target]", els => els.map(e => e.getAttribute("data-market-object-target")));
console.log("targets:", ids.join(" , "));
const z = ids.find(i => i.startsWith("ZONE:") && i.endsWith("DEMAND")) ?? ids.find(i => i.startsWith("ZONE:"));
if (z) { await p.locator(`[data-market-object-target="${z}"]`).click(); await p.waitForTimeout(1500); }
const out = await p.evaluate(() => ({
  zone: document.querySelector("[data-living-profile]")?.dataset.marketZoneSelected,
  ticket: document.querySelector('[data-testid="chart-inspect-ticket"]')?.innerText.replace(/\s+/g," ").slice(0, 420),
}));
console.log(JSON.stringify(out, null, 1));
await p.screenshot({ path: "scratchpad/shift0924/zone_selected.png" });
await b.close();
