#!/usr/bin/env node
/**
 * DID THE SECOND HALF OF THE TRAILING CHIP ACTUALLY REACH THE GLASS?
 *
 * Canon F24 draws the masthead's trailing chip as `INDICATIVE · asOf` — two
 * halves. The build rendered one and put the other in `title={feed.detail}`,
 * a hover affordance that does not exist on touch and is invisible at a glance.
 * A unit test can prove the owner composes both halves; only the page can prove
 * the second one is PAINTED, because a rendered-but-clipped node satisfies
 * every DOM assertion while showing the trader nothing.
 *
 * ── MEASURED 2026-09-21 AT 1440, AFTER THE ATOM ───────────────────────────
 *
 *     chip text        "ACTIVE DEGRADED·observed"
 *     detail node      RENDERED   x=1370 y=33 w=52 h=13
 *     aria-label       "ACTIVE DEGRADED · observed"   ← one sentence, not two
 *     data-tone        DELAYED    data-established  true
 *     masthead         x=0 y=0 w=1440 h=79
 *
 * x=1370 in a 1440 viewport is the trailing edge — where F24 puts it. Before
 * this atom the same reading was reachable only by resting a pointer on the
 * badge for a second.
 *
 * STILL OFF-CANON, AND NOT FIXED HERE. The same read shows the band carrying
 * "Instrument View", "OBSERVE▾" and "0 WM pts" between the plates and the chip.
 * F24 draws the band with the two plates and this chip, and nothing else. Those
 * three have separate owners and separate guards; they are a separate atom.
 *
 * LAYOUT ONLY — /api/auth/me RESPONSE stubbed in this browser context. No
 * password typed, no token minted, no account touched.
 */
import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "p", email: "l@p.local", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();
await page.goto("http://localhost:3000/charts", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
console.log(JSON.stringify(await page.evaluate(() => {
  const chip = document.querySelector('[data-testid="os-feed-standing"]');
  const detail = document.querySelector('[data-testid="os-feed-standing-detail"]');
  const mh = document.querySelector(".wm-os-masthead");
  const b = (e) => { if(!e) return null; const r=e.getBoundingClientRect();
    return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; };
  return { mastheadText: (mh?.textContent||"").replace(/\s+/g," ").trim(),
    chipText: (chip?.textContent||"").replace(/\s+/g," ").trim(),
    chipAria: chip?.getAttribute("aria-label"), chipTone: chip?.getAttribute("data-tone"),
    established: chip?.getAttribute("data-established"),
    detailRendered: Boolean(detail), detailText: (detail?.textContent||"").replace(/\s+/g," ").trim(),
    detailBox: b(detail), mastheadBox: b(mh) };
})), null, 2);
await browser.close();
