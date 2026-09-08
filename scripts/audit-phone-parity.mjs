#!/usr/bin/env node
/**
 * Measure rendered layout at phone width. Geometry, not source strings.
 *
 * WHY THIS EXISTS
 *
 * On 2026-09-08 a Sentinel named "keeps the nonmodal prompt named, contained,
 * and touch reachable" was green while the dismiss button it vouched for sat
 * 100% off the viewport. It string-matched a Tailwind class. A class name
 * cannot witness geometry: the sibling `-translate-x-1/2` that did the actual
 * centering was silently discarded by Framer Motion, which owns `transform` on
 * a motion element. Measured at 375px, the card ran from left 188 to right 531
 * in a 375px viewport.
 *
 * Nothing reported an error, because `body { overflow-x: hidden }` CLIPPED the
 * overflow instead of reflowing it — documentElement.scrollWidth still equalled
 * clientWidth. Page-level overflow is therefore NOT a sufficient check. This
 * script walks elements and reports the INNERMOST ones crossing the viewport
 * edge, which is what actually names the offender.
 *
 * USAGE
 *
 *   node scripts/audit-phone-parity.mjs [--base URL] [--width N] [route...]
 *
 * Exits non-zero if any route has offenders, so it can gate a pipeline.
 *
 * KNOWN LIMIT — READ BEFORE TRUSTING A GREEN RUN
 *
 * This harness holds NO session. Every authenticated route client-side
 * redirects to /login, so pointing it at /charts measures the login page and
 * reports it clean. The `landed` field is printed for exactly this reason:
 * if `landed` is not the route you asked for, the route was NOT audited.
 * Auditing interior routes needs a seeded test account.
 */

import { chromium } from "playwright";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const BASE = flag("base", "http://localhost:3000");
const WIDTH = Number(flag("width", 375));
const HEIGHT = Number(flag("height", 812));
const SETTLE = Number(flag("settle", 4000));
const routes = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
const ROUTES = routes.length ? routes : ["/login"];

/**
 * Minimum comfortable touch target. WCAG 2.5.5 / Apple HIG both land on 44.
 *
 * Reported at 1px tolerance: `py-3` on a 3x device measures 43.5px, and a
 * half-pixel of layout rounding is not a reachability defect. Sizes are
 * printed as MEASURED, not rounded up to the threshold.
 */
const MIN_TAP = 44;
const TAP_TOLERANCE = 1;

function probe({ minTap, tolerance }) {
  const vw = document.documentElement.clientWidth;
  const name = (el) => {
    const cls =
      typeof el.className === "string" && el.className
        ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
        : "";
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 36);
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${cls}${text ? ` "${text}"` : ""}`;
  };
  const shown = (el) => {
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none";
  };

  const all = [...document.body.querySelectorAll("*")];

  const crossing = all.filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    if (!shown(el)) return false;
    return r.right > vw + 1 || r.left < -1;
  });
  // An ancestor is only guilty by containment; report the innermost element.
  const offenders = crossing.filter((el) => !crossing.some((o) => o !== el && el.contains(o)));

  const TAPPABLE = 'a[href], button, [role="button"], [role="tab"], input, select, summary';
  const smallTaps = [...document.body.querySelectorAll(TAPPABLE)].filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || !shown(el)) return false;
    if (el.hasAttribute("disabled")) return false;
    return r.width < minTap - tolerance || r.height < minTap - tolerance;
  });

  const describe = (el) => {
    const r = el.getBoundingClientRect();
    return {
      el: name(el),
      left: Math.round(r.left),
      right: Math.round(r.right),
      offBy: Math.round(Math.max(r.right - vw, -r.left)),
    };
  };

  return {
    landed: location.pathname,
    viewport: vw,
    // Kept for contrast: this is the check that MISSED the 2026-09-08 defect.
    documentOverflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    offenderCount: offenders.length,
    offenders: offenders.slice(0, 10).map(describe),
    smallTapCount: smallTaps.length,
    smallTaps: smallTaps.slice(0, 10).map((el) => {
      const r = el.getBoundingClientRect();
      // MEASURED, not rounded to the threshold — rounding up would hide
      // exactly the near-miss this tolerance exists to tolerate.
      return { el: name(el), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    }),
  };
}

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
    "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
const page = await context.newPage();

let failed = 0;
for (const route of ROUTES) {
  let result;
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(SETTLE);
    result = await page.evaluate(probe, { minTap: MIN_TAP, tolerance: TAP_TOLERANCE });
  } catch (error) {
    console.log(`${route}  ERROR  ${error.message.split("\n")[0]}`);
    failed++;
    continue;
  }

  const redirected = result.landed !== route;
  const note = redirected ? `  NOT AUDITED — redirected to ${result.landed}` : "";
  console.log(
    `${route}  offenders=${result.offenderCount}  under-${MIN_TAP}px-taps=${result.smallTapCount}${note}`,
  );
  for (const o of result.offenders) console.log(`    off by ${o.offBy}px  ${o.el}`);
  for (const t of result.smallTaps) console.log(`    tap ${t.w}x${t.h}  ${t.el}`);
  if (result.offenderCount > 0) failed++;
}

await browser.close();
process.exit(failed > 0 ? 1 : 0);
