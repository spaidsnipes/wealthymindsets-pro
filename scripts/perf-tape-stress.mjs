#!/usr/bin/env node
/**
 * /charts UNDER A BUSY TAPE — frame time, long tasks, heap, sockets, with BUDGETS (perf P0 2026-10-25).
 *
 * Founder 2026-10-25: "lag on the second charts and delays … inventions must pop up. No lags, no
 * delays, no bugs; stress tests." A quiet weekend BTC tape (~5 prints/s) hides every one of the
 * defects this harness was built around, so it serves /charts a SYNTHETIC stress tape instead: the
 * Coinbase socket is intercepted (Playwright routeWebSocket) and fed `match` messages at --rate
 * prints/s (bursts ×4 every 3 s), a bounded random walk from the real last BTC price. It is labelled
 * synthetic everywhere it is reported; it measures the CHART, not the market.
 *
 * Measured with it on a local production build (BTC 15s, every invention on, 40 prints/s):
 *   before  minute 1 = 26 fps · minute 2 = 12 fps / heap 720 MB · minute 10 = 1.5 fps / heap 3.6 GB
 *           (the print dedupe window was smaller than the tape it guarded — printDedupe.ts)
 *   after   60 fps · frame p95 16.8 ms · heap flat across the soak
 *
 * The auth RESPONSE is stubbed (as prove-command-deck does) so the interior route renders. No account,
 * no token, no broker: futures/stock lanes read their honest refusals; the crypto lane is the stress.
 *
 *   npm run audit:perf -- --base http://localhost:3488 [--rate 40] [--soak-min 3] [--video DIR]
 *
 * Exit 0 = every budget met · 1 = a budget failed (named) · 2 = nothing could be measured.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : dflt; };
const BASE = arg("base", "http://localhost:3488");
const RATE = Number(arg("rate", "40"));
const SOAK_MIN = Number(arg("soak-min", "3"));
const VIDEO = arg("video", "");
const ON = [
  "LivingProfile", "LiquidityWeather", "ImbalanceStack", "ValueCandle", "ProfileDna", "DeltaDivergence", "MarketStructure",
  "TpoProfile", "RegimeLighting", "FlowCurrent", "ExpectedEnvelope", "EffortMark", "DeltaLevels", "CompositeProfile",
  "ClarityCandle", "VisibleRangeProfile", "ValueMigration", "StructureProfile", "ProfileMemory", "ProfileFusion", "MtfAncestry",
  "MemoryGhost", "LiquidityLifecycle", "Contradiction", "sessionVP", "absorptionAnatomy", "exhaustion", "sessionBands",
  "effortResponse", "deltaKeel", "zones", "fvg", "fp:big-trades",
].join(",");

/** The budgets. A frame is 16.7 ms at 60 Hz; p95 at or under ~one frame means no visible hitching. */
const BUDGET = {
  stressFps: 50,
  stressFrameP95Ms: 20,
  stressLongTaskMsPerMin: 1000,
  soakLastMinuteFps: 50,
  soakHeapGrowthMb: 200,
  soakPaintMeanMs: 20,
  coinbaseSocketsPerProduct: 1,
};

const PROBE = `(() => {
  const P = window.__perf = { frames: [], longtasks: [], sockets: [] };
  const rAF = window.requestAnimationFrame.bind(window);
  let last = 0; const loop = (ts) => { if (last) P.frames.push(ts - last); last = ts; rAF(loop); }; rAF(loop);
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.longtasks.push([e.startTime, e.duration]); }).observe({ type: "longtask", buffered: true }); } catch {}
  const WS = window.WebSocket;
  window.WebSocket = function (url, p) { const ws = p ? new WS(url, p) : new WS(url); const rec = { url: String(url), open: true, product: "?" }; P.sockets.push(rec); ws.addEventListener("close", () => { rec.open = false; });
    const send = ws.send.bind(ws); ws.send = (d) => { try { const j = JSON.parse(String(d)); if (j && j.type === "subscribe" && Array.isArray(j.product_ids)) rec.product = j.product_ids.join("+"); } catch {} return send(d); };
    return ws; };
  window.WebSocket.prototype = WS.prototype; Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
})();`;

let startPx = 80000;
try { startPx = Number((await (await fetch("https://api.exchange.coinbase.com/products/BTC-USD/ticker")).json()).price) || startPx; } catch { /* offline: a fixed start */ }

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-precise-memory-info"] })
  .catch(() => chromium.launch({ headless: true, args: ["--enable-precise-memory-info"] }))
  .catch((e) => { console.log(`REFUSING TO REPORT — no browser could be launched (${String(e.message).split("\n")[0]}).`); process.exit(2); });

async function openRoom(path, { video = "" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, ...(video ? { recordVideo: { dir: video, size: { width: 960, height: 540 } } } : {}) });
  await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "perf-tape-stress", email: "perf@probe.local", displayName: "Perf", handle: "perf", profileComplete: true } }) }));
  let px = startPx, tid = 5e8, seq = 1e10;
  await ctx.routeWebSocket(/ws-feed\.exchange\.coinbase\.com/, (ws) => {
    let timer = null;
    ws.onMessage((m) => {
      let j; try { j = JSON.parse(String(m)); } catch { return; }
      if (j.type !== "subscribe" || timer) return;
      ws.send(JSON.stringify({ type: "subscriptions", channels: [{ name: "matches", product_ids: j.product_ids ?? [] }] }));
      if (!(j.product_ids ?? []).includes("BTC-USD")) return; // only BTC-USD is stressed; other products stay silent
      const per = Math.max(1, Math.round(RATE / 50));
      timer = setInterval(() => {
        for (let i = 0; i < per; i++) {
          const burst = Date.now() % 3000 < 300 ? 4 : 1;
          for (let b = 0; b < burst; b++) {
            px = Math.max(1, +(px + (Math.random() - 0.5) * 6).toFixed(2));
            ws.send(JSON.stringify({ type: "match", trade_id: ++tid, maker_order_id: "m", taker_order_id: "t", side: Math.random() < 0.5 ? "buy" : "sell",
              size: (Math.random() * (Math.random() < 0.05 ? 3 : 0.05)).toFixed(8), price: px.toFixed(2), product_id: "BTC-USD", sequence: ++seq, time: new Date().toISOString() }));
          }
        }
      }, 20);
    });
    ws.onClose(() => timer && clearInterval(timer));
  });
  await ctx.addInitScript(PROBE);
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 180_000 });
  const found = await page.waitForSelector(".tv-lightweight-charts canvas", { timeout: 180_000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(8000);
  return { ctx, page, found };
}

const window_ = (page, ms) => page.evaluate(async (ms) => {
  const P = window.__perf; P.frames.length = 0; P.longtasks.length = 0; const t0 = performance.now();
  await new Promise((r) => setTimeout(r, ms));
  const d = (performance.now() - t0) / 1000; const f = P.frames.slice().sort((a, b) => a - b);
  const c = document.querySelector("canvas[data-live-painted-close]");
  return { fps: +(f.length / d).toFixed(1), frameP95: f.length ? +f[Math.floor(f.length * 0.95)].toFixed(1) : null,
    longTaskMsPerMin: Math.round(P.longtasks.reduce((s, l) => s + l[1], 0) / d * 60), heapMb: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    paintMeanMs: c ? Number(c.dataset.paintMeanMs) : null,
    coinbaseProducts: Object.entries(P.sockets.filter((s) => s.open && /coinbase/.test(s.url)).reduce((m, s) => ({ ...m, [s.product]: (m[s.product] || 0) + 1 }), {})).map(([product, n]) => ({ product, n })) };
}, ms);

const offences = [];
const law = (name, ok, detail) => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}  — ${detail}`); if (!ok) offences.push(name); };
console.log(`synthetic stress tape: ${RATE} prints/s (bursts ×4) from BTC ${startPx} · base ${BASE}`);

// 1 · STRESS — the seconds chart, every invention on.
{
  const { ctx, page, found } = await openRoom(`/charts?symbol=BTC&tf=15s&on=${encodeURIComponent(ON)}`, { video: VIDEO });
  if (!found) { console.log("REFUSING TO REPORT — /charts never drew a chart canvas."); await browser.close(); process.exit(2); }
  const m = await window_(page, 20_000);
  law("stress · frames per second", m.fps >= BUDGET.stressFps, `${m.fps} fps (budget ≥ ${BUDGET.stressFps})`);
  law("stress · frame p95", m.frameP95 != null && m.frameP95 <= BUDGET.stressFrameP95Ms, `${m.frameP95} ms (budget ≤ ${BUDGET.stressFrameP95Ms})`);
  law("stress · main thread blocked", m.longTaskMsPerMin <= BUDGET.stressLongTaskMsPerMin, `${m.longTaskMsPerMin} ms of long tasks per minute (budget ≤ ${BUDGET.stressLongTaskMsPerMin})`);
  law("stress · one Coinbase socket per product", m.coinbaseProducts.every((p) => p.n <= BUDGET.coinbaseSocketsPerProduct), m.coinbaseProducts.map((p) => `${p.product} ×${p.n}`).join(", ") || "none open");
  // 2 · SOAK — the same room left open (the dedupe-window defect appeared after ~4,000 prints).
  const rows = [];
  for (let i = 1; i <= SOAK_MIN; i++) { const r = await window_(page, 60_000); rows.push(r); console.log(`soak minute ${i}: ${r.fps} fps · p95 ${r.frameP95} ms · heap ${r.heapMb} MB · paint ${r.paintMeanMs} ms`); }
  if (rows.length) {
    const lastRow = rows[rows.length - 1];
    law("soak · last minute frames per second", lastRow.fps >= BUDGET.soakLastMinuteFps, `${lastRow.fps} fps after ${SOAK_MIN} min (budget ≥ ${BUDGET.soakLastMinuteFps})`);
    law("soak · heap growth", lastRow.heapMb != null && m.heapMb != null && lastRow.heapMb - m.heapMb <= BUDGET.soakHeapGrowthMb, `${m.heapMb} → ${lastRow.heapMb} MB (budget ≤ +${BUDGET.soakHeapGrowthMb})`);
    law("soak · overlay paint mean", lastRow.paintMeanMs != null && lastRow.paintMeanMs <= BUDGET.soakPaintMeanMs, `${lastRow.paintMeanMs} ms (budget ≤ ${BUDGET.soakPaintMeanMs})`);
  }
  await ctx.close();
}

// 3 · DESK — several screens and the masthead strip on one product share ONE socket.
{
  const { ctx, page } = await openRoom("/desk");
  const m = await window_(page, 5000);
  law("desk · one Coinbase socket per product", m.coinbaseProducts.every((p) => p.n <= BUDGET.coinbaseSocketsPerProduct), m.coinbaseProducts.map((p) => `${p.product} ×${p.n}`).join(", ") || "none open");
  await ctx.close();
}

await browser.close();
if (VIDEO) for (const f of fs.readdirSync(VIDEO)) console.log(`video: ${VIDEO}/${f}`);
console.log(offences.length ? `\n${offences.length} budget(s) FAILED: ${offences.join(" · ")}` : "\nevery budget met");
process.exit(offences.length ? 1 : 0);
