// INVENTIONS PAINTED — browser-level visual acceptance (Garden 19 finish-line order §8), Playwright, no runner.
//
// For each scene below: open the real /charts route on a deterministic fixture or the live chart, switch the
// inventions on through the proof-scene grammar, wait for the overlay, then assert BOTH the overlay's own
// receipt (the invention says it painted) AND pixels (the canvas actually carries ink where the receipt says).
// DOM "ON" with no pixels FAILS. A silence receipt (OFF / SILENT / NO_CURRENT…) is reported as such, never as
// a pass, unless the scene expects it.
//
// Needs a signed-in session (every route is auth-gated): export one from a signed-in browser
// (Playwright `context.storageState()`) and pass it. It is never written anywhere here.
//
//   WM_STORAGE_STATE=/path/state.json node tests/inventions-painted.mjs [--base URL] [--out DIR]
//
// Exit 0 = every scene passed; 1 = a scene failed (the report names it); 2 = no session.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
const BASE = flag("base", "https://wealthymindsetspro.com");
const OUT = flag("out", "inventions-painted-out");
const STATE = process.env.WM_STORAGE_STATE;
if (!STATE) { console.error("Set WM_STORAGE_STATE to a Playwright storageState JSON exported from a signed-in session."); process.exit(2); }
mkdirSync(OUT, { recursive: true });

/** Overlay receipts + pixel samples. `rows` = y px to sample across the plot; `col` = x range at the left edge. */
const READ = `(() => {
  const cs = [...document.querySelectorAll('canvas')];
  const ov = cs.find(c => 'paintMeanMs' in c.dataset);
  if (!ov) return { found: false };
  const d = { ...ov.dataset };
  const ctx = ov.getContext('2d');
  const W = ov.width, H = ov.height;
  const rowInk = (y) => { const p = ctx.getImageData(0, Math.max(0, Math.min(H - 1, Math.round(y))), W, 1).data; let n = 0; for (let i = 3; i < p.length; i += 4) if (p[i] > 40) n++; return n; };
  const colInk = (x0, x1) => { let n = 0; for (let y = 0; y < H; y += 4) { const p = ctx.getImageData(x0, y, x1 - x0, 1).data; let a = 0; for (let i = 3; i < p.length; i += 4) a = Math.max(a, p[i]); if (a > 60) n++; } return n; };
  const wallYs = (d.brickWallsAt || '').split('|').map(s => Number(s.split(':')[1])).filter(Number.isFinite);
  return { found: true, d, W, H, wallInk: wallYs.map(rowInk), ladderRows: colInk(2, 8), plotInk: [0.25, 0.5, 0.75].map(f => rowInk(H * f)) };
})()`;

const SCENES = [
  {
    name: "brick-walls-fixture",
    url: `/charts?symbol=NQ1!&tf=5m&scene=lens-fixture&climate=WALLED&on=BrickWalls`,
    check: r => /^ON:\d+$/.test(r.d.brickWalls) && r.wallInk.length >= 2 && r.wallInk.every(n => n > 0),
    words: r => `brickWalls=${r.d.brickWalls} ink=${r.wallInk.join("/")}`,
  },
  {
    name: "gamma-heatmap-ladder",
    url: `/charts?symbol=SPY&tf=5m&scene=clean&on=wg:GAMMA_HEATMAP,wg:CALL_WALL,wg:PUT_WALL`,
    // A heat band on camera must carry the left-edge ladder; "ON:…:POS0:NEG0" (nothing on camera) is reported, not passed.
    check: r => /^ON:/.test(r.d.gammaHeatmap) && !/POS0:NEG0/.test(r.d.gammaHeatmap) && r.ladderRows > 0,
    words: r => `gammaHeatmap=${r.d.gammaHeatmap} ladderRows=${r.ladderRows}`,
  },
  {
    name: "profiles-eleven",
    url: `/charts?symbol=NQ1!&tf=5m&scene=clean&on=LivingProfile,StructureProfile,ProfileMemory,CompositeProfile,TpoProfile,VisibleRangeProfile,fixedVP,sessionVP`,
    check: r => r.d.livingProfile === "DRAWN" && r.d.structureProfile === "DRAWN" && r.d.tpoProfile === "DRAWN" && r.d.compositeProfile === "DRAWN"
      && r.d.visibleRangeProfile === "DRAWN" && r.d.profileMemory === "DRAWN" && Number(r.d.vpDrawn) >= 2 && r.plotInk.some(n => n > 0),
    words: r => `living=${r.d.livingProfile} structure=${r.d.structureProfile} tpo=${r.d.tpoProfile} composite=${r.d.compositeProfile} vrp=${r.d.visibleRangeProfile} memory=${r.d.profileMemory} vp=${r.d.vpDrawn}`,
  },
  {
    name: "weather-bigtrades-fvg",
    url: `/charts?symbol=NQ1!&tf=5m&scene=clean&on=LiquidityWeather,fp:big-trades,fvg,MarketStructure`,
    check: r => Number(r.d.paintDrawn) > 0 && r.plotInk.some(n => n > 0) && !("paintFault" in r.d),
    words: r => `paintDrawn=${r.d.paintDrawn} bigTrades=${r.d.bigTradesDrawn} fvg=${r.d.fvg} fault=${r.d.paintFault ?? "none"}`,
  },
];

const results = [];
let failed = false;
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
for (const s of SCENES) {
  await page.goto(`${BASE}${s.url}&r=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(".tv-lightweight-charts", { timeout: 90000 });
  await page.waitForTimeout(12000);
  await page.screenshot({ path: join(OUT, `${s.name}-a.png`) }); // forces a frame
  await page.waitForTimeout(800);
  const r = await page.evaluate(READ);
  const ok = !!r.found && s.check(r);
  const words = r.found ? s.words(r) : "no overlay canvas";
  results.push({ scene: s.name, ok, words, paint: r.found ? `${r.d.paintMeanMs}/${r.d.paintLongestMs}` : null });
  console.log(`${ok ? "PASS" : "FAIL"} ${s.name} — ${words}`);
  if (!ok) failed = true;
  await page.screenshot({ path: join(OUT, `${s.name}.png`) });
}
writeFileSync(join(OUT, "report.json"), JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));
await browser.close();
process.exit(failed ? 1 : 0);
