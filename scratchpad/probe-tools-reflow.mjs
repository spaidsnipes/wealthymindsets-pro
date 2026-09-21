#!/usr/bin/env node
/**
 * ATOM 0 — DOES OPENING "TOOLS" NARROW THE CHART, OR ONLY COVER IT?
 *
 * WHY THIS IS A MEASUREMENT AND NOT A FIX. A-201 says `RoomEquipmentLayer
 * SHALL NOT UNMOUNT MarketCanvas`, and the working complaint has been "Tools
 * narrows the chart". But reading the source says the opposite is already
 * true: the equipment panel is `position: absolute; left:0; top:0; bottom:0;
 * width: OS_EQUIPMENT_RAIL_WIDTH_PX` (WMOperatingSystem.tsx:1324-1336) — i.e.
 * OUT OF FLOW, which cannot reflow a sibling. So there are two live theories
 * and they need OPPOSITE repairs:
 *
 *   (A) REFLOW  — the canvas element genuinely gets narrower. Fix = take the
 *                 panel out of flow. (Source says this is already done.)
 *   (B) COVER   — the canvas keeps its width and a 264px opaque panel is
 *                 simply painted over the left third of the candles. Fix =
 *                 move the panel to the RIGHT flank per C-101, where it lands
 *                 outside the price axis instead of on top of the market.
 *
 * Guessing wrong here costs a commit that changes geometry for no reason —
 * which is exactly the mistake `probe-footer-left.mjs` records being avoided.
 * So: measure the canvas box CLOSED, then OPEN, and compare. The canvas is
 * the thing that matters; `lightweight-charts` paints to it and has no DOM
 * inside, so the DOM of the pane is not evidence about what the trader sees.
 *
 * ALSO CHECKED: canvas IDENTITY across the toggle. If the element instance is
 * replaced rather than resized, A-201's unmount clause is being violated even
 * if the width happens to match — a remount throws away the chart's pan/zoom
 * and any drawings, which reads to a trader as the tool destroying their work.
 *
 * ── THE ANSWER, MEASURED 2026-09-21 AT 1440 — IT IS (B) COVER ──────────────
 *
 *     canvas CLOSED   x=18  y=129  w=1159  h=689
 *     canvas OPEN     x=18  y=129  w=1159  h=689     ← byte-identical
 *     canvas identity  survived the toggle (no remount)
 *     panel OPEN      x=0   y=79   w=264   h=787
 *                     position:absolute  opacity:1  z-index:40
 *                     background rgb(7,8,10)   ← fully opaque
 *
 * So A-201's clause is SATISFIED and has been all along: `MarketCanvas` is
 * neither unmounted nor resized. The long-standing complaint that "Tools
 * narrows the chart" is FALSE AS STATED, and any commit written to "take the
 * panel out of flow" would have been work against a defect that does not
 * exist — the panel is already out of flow.
 *
 * The REAL defect is adjacent and worse than the reported one. The canvas
 * spans x=18..1177; the panel covers x=0..264. That is 246px of live market
 * hidden behind an opaque wall — 21% of the candles, and specifically the
 * OLDEST bars, the part a trader reads to place the current one in context.
 * Nothing narrows; something is simply painted on top. "The chart got
 * smaller" and "the chart got covered" produce the same complaint from a
 * trader and need opposite repairs, which is precisely why this was measured
 * before anything was edited.
 *
 * WHAT THIS DOES *NOT* LICENSE. The obvious next move — flip the panel to the
 * right flank because C-101 draws the DOORS there — would put an opaque wall
 * over the PRICE AXIS, which is one of the only two pieces of axis furniture
 * canon keeps. That trades a bad occlusion for a worse one. C-101 puts the
 * doors on the right; it does not say the room that opens behind them may
 * stand on the market. The fix therefore has to give the panel its own floor
 * — the same lesson the footer band taught: a canvas cannot draw into room it
 * was never given, and a panel should not stand in room it was never given
 * either. That is a design decision with a cost (less chart width while open)
 * and it is NOT made here. This file measures; it does not prescribe.
 *
 * LAYOUT ONLY — /api/auth/me RESPONSE stubbed in this context. No password is
 * typed, no token is minted, no account is touched.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) =>
  r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ user: { id: "layout-probe", email: "layout@probe.local", displayName: "Layout Probe", handle: "layout", profileComplete: true } }) }),
);
const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);

/** Tag the canvas so we can prove it is the SAME element after the toggle. */
const readGeometry = async (label) => page.evaluate((label) => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top),
             w: Math.round(r.width), h: Math.round(r.height) };
  };
  // The biggest canvas on the page is the candle surface.
  const canvases = [...document.querySelectorAll("canvas")];
  const canvas = canvases.sort((a, b) =>
    b.getBoundingClientRect().width * b.getBoundingClientRect().height -
    a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
  if (canvas && !canvas.dataset.probeId) canvas.dataset.probeId = `probe-${label}`;

  const panel = document.querySelector("#wm-os-rail");
  const main = document.querySelector("main");

  return {
    canvas: box(canvas),
    // If this still says `probe-closed` in the OPEN pass, the element survived.
    canvasIdentity: canvas?.dataset.probeId ?? null,
    canvasAttrWidth: canvas?.getAttribute("width") ?? null,
    main: box(main),
    panel: box(panel),
    panelStyle: panel ? (() => { const cs = getComputedStyle(panel);
      return { position: cs.position, width: cs.width, left: cs.left,
               right: cs.right, opacity: cs.opacity, zIndex: cs.zIndex,
               background: cs.backgroundColor }; })() : null,
  };
}, label);

const closed = await readGeometry("closed");

// Open Tools by its accessible name — the same hand a trader uses.
const tools = page.locator('[data-testid="os-equipment-tools"]');
const toolsCount = await tools.count();
if (toolsCount > 0) {
  await tools.first().click();
  await page.waitForTimeout(2500);
}
const open = await readGeometry("open");

const verdict = (() => {
  if (!toolsCount) return "INCONCLUSIVE — no os-equipment-tools control found";
  if (!closed.canvas || !open.canvas) return "INCONCLUSIVE — no canvas measured";
  const remounted = open.canvasIdentity !== "probe-closed";
  const dw = open.canvas.w - closed.canvas.w;
  const dx = open.canvas.x - closed.canvas.x;
  if (remounted) return `A-201 VIOLATION — canvas was REMOUNTED (identity ${open.canvasIdentity})`;
  if (dw === 0 && dx === 0) return "COVER — canvas geometry identical; panel paints over the market";
  return `REFLOW — canvas moved/resized by dx=${dx} dw=${dw}`;
})();

console.log(JSON.stringify({ verdict, toolsControlFound: toolsCount, closed, open }, null, 2));
await browser.close();
