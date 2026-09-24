// H-1001 proof: a FIXTURE born decision + a FIXTURE long-position drawing on FIXTURE bars.
// 1) brackets on price; 2) Tools › Chart tools › Tear receipt; 3) reload → same asOf, second tear refused.
import { chromium } from "playwright-core";
import { fixtureContradictNow } from "./fixture.mjs";
const bars = fixtureContradictNow();
const i0 = bars.length - 13;                       // inside the last pullback
const entry = +(bars[i0].close).toFixed(2), stop = +(entry - 1.2).toFixed(2), target = +(entry + 5).toFixed(2);
const t0 = bars[i0].time;
const OWNER = "floor-instrument-no-real-account";
const identity = { lawVersion: "wm.decision-identity.v1", decisionId: "wmd_fixture-h1001-0924", bornAt: bars[i0].time * 1000,
  bornFrom: "EXPLICIT_INTENT", bornOnDeviceId: "fixture-device" };
const drawing = [{ id: 1, tool: "long-position", pts: [{ price: entry, time: t0 }, { price: target, time: t0 + 1800 }, { price: stop, time: t0 + 1800 }],
  style: { color: "#d4af37", width: 1, dash: "solid", fill: true, opacity: 1 } }];
console.log("plan", { entry, stop, target, t0 });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: Number(process.env.DSF ?? 1) });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: OWNER, email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: bars, barFidelity: "INDICATIVE", sessionKnown: false }) }));
await ctx.addInitScript(([OWNER, identity, drawing]) => {
  if (sessionStorage.getItem("seeded")) return;
  localStorage.setItem("wm_prefRepair", "1");
  for (const k of ["wm_ofTpoProfile","wm_ofProfileMemory","wm_ofProfileFusion","wm_ofValueMigration","wm_ofCompositeProfile","wm_absorptionAnatomy","wm_ofContradiction"]) localStorage.setItem(k, "false");
  localStorage.setItem(`wm:decision-identity:v1:${encodeURIComponent(OWNER)}:AAPL`, JSON.stringify({ version: 1, owner: OWNER, underlying: "AAPL", identity }));
  for (const u of ["anon", OWNER]) localStorage.setItem(`wm_draw:v1:${u}:AAPL`, JSON.stringify(drawing));
  sessionStorage.setItem("seeded", "1");
}, [OWNER, identity, drawing]);
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(20000);
const ds = () => p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.riskOnPrice); return c ? Object.fromEntries(Object.entries(c.dataset).filter(([k]) => /risk|DecisionId/i.test(k))) : "none"; });
console.log("before tear:", JSON.stringify(await ds()));
await p.screenshot({ path: "scratchpad/shift0924/runtime_risk_brackets.png" });
await p.getByRole("button", { name: /^Tools/ }).first().click(); await p.waitForTimeout(700);
await p.getByText("Chart tools", { exact: true }).first().click(); await p.waitForTimeout(1200);
const bar = p.locator('[data-testid="risk-receipt-bar"]');
await bar.scrollIntoViewIfNeeded();
console.log("bar before:", (await bar.innerText()).replace(/\s+/g, " "));
await p.locator('[data-testid="risk-receipt-tear"]').click(); await p.waitForTimeout(800);
console.log("bar after:", (await bar.innerText()).replace(/\s+/g, " "));
await p.screenshot({ path: "scratchpad/shift0924/runtime_risk_tear_door.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(600);
console.log("after tear:", JSON.stringify(await ds()));
await p.screenshot({ path: "scratchpad/shift0924/runtime_risk_receipt.png" });
// Reload: the receipt is read back, asOf unchanged; the button refuses a second tear.
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(18000);
console.log("after reload:", JSON.stringify(await ds()));
await p.screenshot({ path: "scratchpad/shift0924/runtime_risk_receipt_reload.png" });
if (process.env.CLIP) { const [x, y, w, h] = process.env.CLIP.split(",").map(Number); await p.screenshot({ path: "scratchpad/shift0924/runtime_risk_detail.png", clip: { x, y, width: w, height: h } }); }
await b.close();
