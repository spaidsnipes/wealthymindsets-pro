#!/usr/bin/env node
/**
 * WHO OWNS THE BAND ABOVE THE MASTHEAD?
 *
 * The Founder's complaint is "this old July shell". The obvious suspect was
 * `TickerTape` — MainLayout.tsx:344 mounts a full-width multi-symbol tape, and
 * the repo's own sentinel already calls it "the July multi-symbol tape"
 * (MainLayout.residency.sentinel.test.tsx:11).
 *
 * THAT SUSPECT IS INNOCENT, AND READING PROVED IT BEFORE ANY EDIT WAS MADE.
 * `/charts` is `frame: "os"` (wmDestinations.ts:171, via INSTRUMENT_VIEW_ROUTE),
 * so `isFounderRoomRoute("/charts")` is true, so MainLayout returns
 * `<WMExperienceShell>` at :287 and never reaches the July header at :310.
 * TickerTape cannot be on this page. Deleting it would have been a commit
 * against a component that does not render here.
 *
 * So the band that IS above the masthead in production has some other owner,
 * and the honest move is to ask the page rather than the repo. This walks the
 * real DOM top-down and reports every block-level element whose top edge sits
 * ABOVE the masthead's top edge, with the component-ish hooks (id, testid,
 * class) that let it be traced back to a file.
 *
 * Canon for comparison — F24 masthead carries EXACTLY: the Workspace and Tools
 * plates at the leading edge, and one INDICATIVE · asOf chip at the trailing
 * edge. Nothing above the candles but that band.
 *
 * LAYOUT ONLY — /api/auth/me RESPONSE stubbed inside this browser context.
 * No password typed, no token minted, no account touched.
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

const report = await page.evaluate(() => {
  const box = (el) => { const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };

  const masthead = document.querySelector(".wm-os-masthead");
  const canvas = [...document.querySelectorAll("canvas")].sort((a, b) =>
    b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
  const mastheadBox = masthead ? box(masthead) : null;

  // Every element that paints in the strip between y=0 and the masthead's top.
  const ceiling = mastheadBox ? mastheadBox.y : 0;
  const above = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width < 200 || r.height < 8) continue;      // not a band
    if (r.top >= ceiling) continue;                    // not above the masthead
    if (r.bottom > ceiling + 4) continue;              // an ancestor, not a band
    above.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      testid: el.getAttribute("data-testid"),
      cls: (el.className && typeof el.className === "string" ? el.className : "").slice(0, 110),
      ...box(el),
      text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 90),
    });
  }

  return {
    viewport: { w: innerWidth, h: innerHeight },
    masthead: mastheadBox,
    mastheadText: masthead ? (masthead.textContent || "").replace(/\s+/g, " ").trim().slice(0, 300) : null,
    canvasTop: canvas ? box(canvas) : null,
    tickerTapePresent: Boolean(document.querySelector(".wm-shell-ticker")),
    julyHeaderPresent: Boolean(document.querySelector(".wm-shell-header")),
    bandsAboveMasthead: above,
  };
});

console.log(JSON.stringify(report, null, 2));
await browser.close();
