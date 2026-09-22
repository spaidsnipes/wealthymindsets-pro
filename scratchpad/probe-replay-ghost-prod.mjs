#!/usr/bin/env node
/**
 * THE GHOST — DOES THE CAMERA ACTUALLY WALK?
 *
 * Bar Replay sets `replayActive` and an interval advances `replayIdx`. But
 * MainChart owns its own bars (`barsRef`, published upward via `onBarsReady`)
 * and an in-file comment at ChartsDashboard.tsx:4321 already records that
 * `replayBars` is passed from NO call site. The suspicion this probe tests is
 * therefore precise: the CONTROLS move an index the CAMERA never reads, so the
 * glass says "replaying" while the drawn bars never move. That is a GHOST — a
 * control surface with nothing behind it.
 *
 * MEASUREMENT, not inference. The price pane is a <canvas>; its pixels ARE the
 * camera's output. We hash them:
 *
 *   t0  before replay is engaged
 *   t1  ~1s after engaging
 *   t2  ~6s after engaging  (several interval ticks must have fired)
 *   t3  ~11s after engaging
 *
 * A camera that is walking produces DIFFERENT hashes at t1/t2/t3. Identical
 * hashes across all three, on a live socket that was changing the canvas at t0,
 * convicts the control of driving nothing.
 *
 * The live-socket control matters: BTC prints constantly, so a frozen canvas is
 * itself a finding rather than a quiet market. `changedWhileLive` records
 * whether the canvas was moving BEFORE replay, which is the premise that makes
 * a frozen replay canvas meaningful.
 *
 * LAYOUT ONLY — /api/auth/me stubbed in this browser context only. No password
 * typed, no token minted, no account touched.
 */
import { chromium } from "playwright";
const BASE = "https://wealthymindsetspro.com";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "p", email: "l@p.local", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();
await page.goto(`${BASE}/charts?symbol=BTC`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(14000);

/**
 * A cheap, stable signature of the LARGEST canvas on the page — the price pane.
 * Cheap deliberately: toDataURL on a 1000x600 canvas every second is enough to
 * perturb the very thing being measured.
 */
const paneHash = () => page.evaluate(() => {
  const canvases = [...document.querySelectorAll("canvas")]
    .map((c) => ({ c, r: c.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 200 && r.height > 120)
    .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height);
  if (canvases.length === 0) return { hash: null, note: "NO PRICE CANVAS FOUND" };
  const { c, r } = canvases[0];
  let url;
  try { url = c.toDataURL(); } catch { return { hash: null, note: "CANVAS TAINTED" }; }
  let h = 5381;
  for (let i = 0; i < url.length; i += 7) h = ((h * 33) ^ url.charCodeAt(i)) >>> 0;
  return {
    hash: h,
    len: url.length,
    box: { w: Math.round(r.width), h: Math.round(r.height) },
    canvasCount: canvases.length,
    note: null,
  };
});

/** Whatever the replay controls are willing to say about where the camera is. */
const controlsText = () => page.evaluate(() => {
  const el = document.querySelector('[data-testid="bar-replay-controls"]');
  return el ? (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 300) : null;
});

const t0a = await paneHash();
await page.waitForTimeout(4000);
const t0b = await paneHash();

await page.click('[data-testid="os-equipment-workspace"]');
await page.waitForTimeout(1000);
await page.click('button[data-equipment="bar-replay"]');
await page.waitForTimeout(1000);
const t1 = await paneHash();
const c1 = await controlsText();
await page.waitForTimeout(5000);
const t2 = await paneHash();
const c2 = await controlsText();
await page.waitForTimeout(5000);
const t3 = await paneHash();
const c3 = await controlsText();
await page.screenshot({ path: "scratchpad/replay-ghost.png" });

console.log(JSON.stringify({
  changedWhileLive: t0a.hash !== null && t0a.hash !== t0b.hash,
  live: { t0a, t0b },
  replay: { t1, t2, t3 },
  cameraMovedDuringReplay: t1.hash !== null && !(t1.hash === t2.hash && t2.hash === t3.hash),
  controls: { c1, c2, c3 },
  controlsTextChanged: !(c1 === c2 && c2 === c3),
}, null, 1));
await browser.close();
