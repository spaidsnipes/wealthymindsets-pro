#!/usr/bin/env node
/**
 * WHO ELSE IS STANDING IN THE FOOTER BAND'S BOTTOM-LEFT?
 *
 * LOOKED AT at 1440 on 2026-09-21: the new `Vol 2` caption renders on top of a
 * circular glyph in the candle pane's bottom-left corner. Every DOM check
 * passes — the node exists, it is positioned where it was told, nothing
 * `elementFromPoint` reports is covering its centre — and it is still illegible,
 * exactly like the time-axis occlusion this band was created to cure.
 *
 * This enumerates every element whose box intersects the bottom-left 200x40 of
 * the pane, so the corner's real owner gets a NAME instead of a guess.
 *
 * ── THE ANSWER, MEASURED 2026-09-21 AT 1440 — AND IT IS "NO DEFECT" ────────
 *
 * The glyph is `nextjs-portal`, the Next.js DEV-TOOLS INDICATOR. It is injected
 * by `next dev`, is fixed to the viewport's bottom-left, and is not in the
 * production bundle at all. Nothing the product draws is in that corner:
 *
 *     chart canvas   y = 0   → 689   (the reserved band starts here)
 *     Vol caption    y = 692 → 720   x = 10, w = 48
 *     pane height    723
 *
 * So the caption is correctly placed and the "collision" is an artifact of the
 * development harness. THE CODE WAS NOT CHANGED IN RESPONSE TO IT.
 *
 * That outcome is the reason this file is committed rather than deleted. The
 * previous atom in this band was a real occlusion found by LOOKING, which
 * establishes that looking beats DOM assertions — and the cost of that lesson
 * is a standing temptation to treat everything seen in a dev render as a
 * defect. Moving the caption to dodge this circle would have shifted a
 * correctly-placed element away from where canon frame F24 puts it, in order
 * to accommodate a badge no user will ever see. Looking tells you WHERE to
 * point the instrument; it does not excuse you from reading it.
 *
 * A second, quieter reading worth keeping: `elementsFromPoint` at the caption's
 * own coordinates does NOT return the caption. That is correct and intended —
 * the caption carries `pointer-events: none` so it cannot swallow a crosshair
 * or drawing gesture aimed at the market, and hit-testing therefore looks
 * straight through it. Anyone who later "proves" this element is missing with
 * an `elementFromPoint` check will be reading that property, not its absence.
 *
 * LAYOUT ONLY — /api/auth/me RESPONSE stubbed in this context.
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

const out = await page.evaluate(() => {
  const vol = document.querySelector(".wm-chart-volume-footer");
  const pane = document.querySelector(".wm-chart-timeframe-chip")?.parentElement;
  if (!pane) return { error: "no pane" };
  const pr = pane.getBoundingClientRect();

  // The corner under interrogation, in viewport coords.
  const zone = { x0: pr.left, y0: pr.bottom - 40, x1: pr.left + 220, y1: pr.bottom };

  const hits = [];
  for (const el of pane.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right < zone.x0 || r.left > zone.x1) continue;
    if (r.bottom < zone.y0 || r.top > zone.y1) continue;
    const cs = getComputedStyle(el);
    hits.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className?.baseVal ?? el.className ?? "").toString().slice(0, 70),
      text: (el.textContent ?? "").trim().slice(0, 30),
      x: Math.round(r.left - pr.left), y: Math.round(r.top - pr.top),
      w: Math.round(r.width), h: Math.round(r.height),
      z: cs.zIndex, pos: cs.position, op: cs.opacity,
    });
  }
  return {
    pane: { w: Math.round(pr.width), h: Math.round(pr.height) },
    volumeCaption: vol ? (() => { const r = vol.getBoundingClientRect(); return {
      text: vol.textContent, state: vol.getAttribute("data-volume-state"),
      x: Math.round(r.left - pr.left), y: Math.round(r.top - pr.top),
      w: Math.round(r.width), h: Math.round(r.height),
    }; })() : null,
    // Deepest painted element at the caption's own text origin. If this is not
    // the caption, something is drawn OVER it.
    atCaptionOrigin: vol ? (() => {
      const r = vol.getBoundingClientRect();
      const e = document.elementFromPoint(r.left + 4, r.top + r.height / 2);
      return e ? `${e.tagName.toLowerCase()}.${(e.className ?? "").toString().slice(0,50)}` : null;
    })() : null,
    cornerOccupants: hits,
    // DOCUMENT-WIDE, not pane-scoped. The first pass queried only descendants
    // of the pane and reported the corner clear while the render plainly shows
    // a circular glyph behind the caption — which means the glyph is NOT a
    // descendant. A fixed-position overlay anchored to the viewport's bottom
    // left would sit there and never appear in a pane-scoped walk.
    documentWideAtCorner: (() => {
      const r = vol?.getBoundingClientRect();
      if (!r) return null;
      const probes = [];
      for (const [dx, dy] of [[2, 14], [10, 14], [24, 14], [2, 26], [10, 26]]) {
        const stack = document.elementsFromPoint(r.left + dx, r.top + dy);
        probes.push({
          at: [dx, dy],
          stack: stack.slice(0, 4).map(e =>
            `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}.${(e.className?.baseVal ?? e.className ?? "").toString().slice(0, 40)}`),
        });
      }
      return probes;
    })(),
    // Anything fixed-positioned in the viewport's bottom-left quadrant.
    fixedBottomLeft: [...document.querySelectorAll("body *")].filter(el => {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed") return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.left < 300 && r.bottom > innerHeight - 120;
    }).map(el => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        cls: (el.className?.baseVal ?? el.className ?? "").toString().slice(0, 60),
        x: Math.round(r.left), y: Math.round(r.top),
        w: Math.round(r.width), h: Math.round(r.height),
      };
    }),
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
