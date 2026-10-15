// BRICK WALLS REGRESSION (Garden 19 finish-line order §2, 2026-10-15). Playwright, no runner.
//
// Opens the real /charts route on the deterministic WALLED lens fixture (a heavy PUT strike 3%
// below price, a heavy CALL strike 3% above), switches Brick Walls on through the proof-scene
// grammar, and asserts the masonry is PAINTED — not merely "ACTIVE" — through every step the
// Founder named: timeframe change, symbol change and return, pan + zoom, resize, reload, and
// the switch off and back on. Geometry assertions read the overlay canvas's own receipts
// (data-brick-walls, data-derivatives-pressure-painted); pixel assertions sample the canvas at
// each wall's y and require non-transparent ink. DOM "ON" with no pixels FAILS.
//
// A session is required (every route is auth-gated). Export one from a signed-in browser
// (Playwright `context.storageState()`) and pass it; it is never written anywhere here.
//
//   WM_STORAGE_STATE=/path/state.json node tests/brick-walls-regression.mjs [--base URL] [--out DIR]
//
// Exit 0 = every step passed; 1 = a step failed (the report names it); 2 = no session.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
const BASE = flag("base", "https://wealthymindsetspro.com");
const OUT = flag("out", "brick-walls-out");
const STATE = process.env.WM_STORAGE_STATE;
if (!STATE) { console.error("Set WM_STORAGE_STATE to a Playwright storageState JSON exported from a signed-in session."); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const SYMBOL = flag("symbol", "NQ1!");
const scene = (tf, extra = "") => `${BASE}/charts?symbol=${encodeURIComponent(SYMBOL)}&tf=${tf}&scene=lens-fixture&climate=WALLED&on=BrickWalls${extra}&r=${Date.now()}`;

const READ = `(() => {
  const cs = [...document.querySelectorAll('canvas')];
  const ov = cs.find(c => 'brickWalls' in c.dataset);
  if (!ov) return { found: false };
  const d = ov.dataset;
  const painted = String(d.derivativesPressurePainted || '');
  const walls = painted.split('|').filter(s => s.startsWith('WALL@') && !s.endsWith('OFF_CAMERA'));
  // Pixel proof: at each wall's y (parsed from WALL@<strike>), sample the overlay for ink.
  const ctx = ov.getContext('2d');
  const W = ov.width, H = ov.height;
  const inkAt = (y) => {
    if (!ctx || y == null) return null;
    const yy = Math.max(0, Math.min(H - 1, Math.round(y * (window.devicePixelRatio || 1))));
    const row = ctx.getImageData(0, yy, W, 1).data;
    let lit = 0; for (let i = 3; i < row.length; i += 4) if (row[i] > 40) lit++;
    return lit;
  };
  // data-brick-walls-at = "<strike>:<y px>|…" — one entry per wall the masonry laid this frame.
  const ys = (d.brickWallsAt || '').split('|').map(s => Number(s.split(':')[1])).filter(Number.isFinite);
  const ink = ys.map(inkAt);
  return { found: true, brickWalls: d.brickWalls, walls, at: d.brickWallsAt || null, ink, paintMeanMs: d.paintMeanMs, w: W, h: H };
})()`;

const steps = [];
let failed = false;
function record(name, ok, detail) {
  steps.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${detail ? "— " + detail : ""}`);
  if (!ok) failed = true;
}

async function settle(page, ms = 9000) {
  await page.waitForSelector(".tv-lightweight-charts", { timeout: 90000 });
  await page.waitForTimeout(ms);
  // The overlay only paints while the tab is visible; a screenshot forces a frame.
  await page.screenshot({ path: join(OUT, "_frame.png") });
  await page.waitForTimeout(300);
}

async function expectWalls(page, name, wantN = 2) {
  const r = await page.evaluate(READ);
  const ok = !!r.found && /^ON:\d+$/.test(String(r.brickWalls)) && Number(String(r.brickWalls).slice(3)) >= wantN
    && r.walls.length >= wantN && r.ink.length >= wantN && r.ink.every(n => n != null && n > 0);
  record(name, ok, JSON.stringify({ brickWalls: r.brickWalls, walls: r.walls, ink: r.ink }));
  await page.screenshot({ path: join(OUT, `${name.replace(/[^a-z0-9]+/gi, "-")}.png`) });
  return r;
}

const browser = await chromium.launch();
const context = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto(scene("5m"), { waitUntil: "domcontentloaded", timeout: 90000 });
await settle(page);
await expectWalls(page, "01 fixture painted");

await page.goto(scene("15m"), { waitUntil: "domcontentloaded", timeout: 90000 });
await settle(page);
await expectWalls(page, "02 timeframe change");

await page.goto(`${BASE}/charts?symbol=ES1!&tf=5m&scene=lens-fixture&climate=WALLED&on=BrickWalls&r=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 90000 });
await settle(page);
await expectWalls(page, "03 other symbol");
await page.goto(scene("5m"), { waitUntil: "domcontentloaded", timeout: 90000 });
await settle(page);
await expectWalls(page, "04 symbol return");

// Pan + zoom through the chart's own surface.
const plot = await page.locator(".tv-lightweight-charts").first().boundingBox();
if (plot) {
  const cx = plot.x + plot.width * 0.5, cy = plot.y + plot.height * 0.5;
  await page.mouse.move(cx, cy); await page.mouse.wheel(0, -600); await page.waitForTimeout(600);
  await page.mouse.down(); await page.mouse.move(cx - 160, cy, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(1200);
}
await page.screenshot({ path: join(OUT, "_frame.png") });
await expectWalls(page, "05 pan and zoom");

await page.setViewportSize({ width: 1100, height: 760 });
await page.waitForTimeout(1500);
await page.screenshot({ path: join(OUT, "_frame.png") });
await expectWalls(page, "06 resize");
await page.setViewportSize({ width: 1440, height: 900 });

await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
await settle(page);
await expectWalls(page, "07 reload");

// Off, then on again (a fresh scene without the switch, then with it).
await page.goto(`${BASE}/charts?symbol=${encodeURIComponent(SYMBOL)}&tf=5m&scene=lens-fixture&climate=WALLED&r=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 90000 });
await settle(page, 6000);
{
  const r = await page.evaluate(READ);
  record("08 toggle off", r.found && String(r.brickWalls) === "OFF", JSON.stringify({ brickWalls: r.brickWalls }));
}
await page.goto(scene("5m"), { waitUntil: "domcontentloaded", timeout: 90000 });
await settle(page);
await expectWalls(page, "09 toggle on");

// Sustained session: the masonry must still be there after a minute of streaming.
await page.waitForTimeout(60_000);
await page.screenshot({ path: join(OUT, "_frame.png") });
await expectWalls(page, "10 sustained 60 s");

writeFileSync(join(OUT, "report.json"), JSON.stringify({ base: BASE, symbol: SYMBOL, at: new Date().toISOString(), steps }, null, 2));
await browser.close();
process.exit(failed ? 1 : 0);
