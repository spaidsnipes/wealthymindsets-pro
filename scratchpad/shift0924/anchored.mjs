import { chromium } from "playwright-core";
import { fixtureDays } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "floor-instrument@localhost.invalid", displayName: "Floor Instrument", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureDays(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(() => {
  for (const k of ["wm_fixedVP","wm_sessionVP","wm_ofTpoProfile","wm_ofStructureProfile","wm_ofProfileDna","wm_ofValueMigration","wm_ofProfileMemory","wm_ofProfileFusion","wm_ofMarketStructure","wm_absorptionAnatomy","wm_ofCompositeProfile","wm_ofVisibleRangeProfile"]) try { localStorage.setItem(k, "false"); } catch {}
  localStorage.setItem("wm_ofLivingProfile", "true");
});
const p = await ctx.newPage();
p.on("pageerror", e => console.log("PAGEERROR", e.message.split("\n")[0]));
p.on("console", m => { if (m.type() === "error" && !/Failed to load resource|WebSocket|net::/.test(m.text())) console.log("CONSOLE.ERROR", m.text().slice(0, 300)); });
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(25000);
// Through the ONE door: Tools → the Profiles menu row.
await p.getByRole("button", { name: /^Tools/ }).first().click();
await p.waitForTimeout(1500);
let row = p.locator('[aria-label^="Anchored Range VP."]').first();
if (!(await row.count())) {
  const ct = p.getByText("Chart tools", { exact: false }).first();
  if (await ct.count()) { await ct.click(); await p.waitForTimeout(1500); }
  row = p.locator('[aria-label^="Anchored Range VP."]').first();
}
console.log("row found:", await row.count());
await p.screenshot({ path: "scratchpad/shift0924/anchored_menu.png" });
await row.click();
await p.waitForTimeout(800);
await p.keyboard.press("Escape"); await p.waitForTimeout(1200);
// Drag across ~25 bars in the middle of the camera.
await p.mouse.move(560, 450); await p.mouse.down();
await p.mouse.move(820, 520, { steps: 15 }); await p.mouse.up();
await p.waitForTimeout(2000);
await p.screenshot({ path: "scratchpad/shift0924/anchored_after.png" });
// Scroll the camera: the box must move WITH its bars.
await p.mouse.move(500, 300); await p.mouse.down(); await p.mouse.move(700, 300, { steps: 10 }); await p.mouse.up();
await p.waitForTimeout(1500);
await p.screenshot({ path: "scratchpad/shift0924/anchored_scrolled.png" });
await b.close();
