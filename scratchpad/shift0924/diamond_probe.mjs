// Inspect ticket open (profile slice) → is any zone diamond / WAIT plaque painted ON TOP of it? FIXTURE bars.
import { chromium } from "playwright-core";
import { fixtureExhaustNow as fixtureBars } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ candles: fixtureBars(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(() => { try { localStorage.setItem("wm_ofLivingProfile", "true"); } catch {} });
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(22000);
const probe = () => p.evaluate(() => {
  const t = document.querySelector('[data-testid="chart-inspect-ticket"]');
  if (!t) return { ticket: false };
  const tr = t.getBoundingClientRect();
  const over = [];
  for (const el of document.querySelectorAll("[data-market-object-target],[data-h101-wait-plaque]")) {
    const r = el.getBoundingClientRect();
    const x = Math.max(r.left, tr.left), y = Math.max(r.top, tr.top), x2 = Math.min(r.right, tr.right), y2 = Math.min(r.bottom, tr.bottom);
    if (x2 <= x || y2 <= y) continue;
    const top = document.elementFromPoint((x + x2) / 2, (y + y2) / 2);
    over.push({ el: el.hasAttribute("data-h101-wait-plaque") ? "WAIT_PLAQUE" : "DIAMOND", onTop: el.contains(top) });
  }
  return { ticket: true, rect: [tr.left, tr.top, tr.width, tr.height].map(Math.round), overlaps: over };
});
// Open the Inspect ticket via the INSPECT chip / keyboard-free path: click a candle area then press the Inspect button if present.
const insp = p.getByRole("button", { name: /inspect/i }).first();
if (await insp.count()) { await insp.click().catch(() => {}); await p.waitForTimeout(1200); }
console.log("targets:", await p.locator("[data-market-object-target]").count(), JSON.stringify(await probe()));
await p.screenshot({ path: "scratchpad/shift0924/diamond_probe.png" });
await b.close();
