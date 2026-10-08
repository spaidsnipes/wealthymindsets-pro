#!/usr/bin/env node
/**
 * §52 RESPONSIVE RELEASE TEST — PUBLIC PAGES (Garden 19, 2026-10-07).
 *
 * Re-runnable by the Founder or anyone on the team, signed OUT, against
 * production or a local dev server. Every public route is opened at every
 * release width; each (route × width) is measured in the rendered page — not
 * from source — and screenshotted.
 *
 *   node scripts/release/responsive-public.mjs
 *   node scripts/release/responsive-public.mjs --base http://localhost:3000
 *   node scripts/release/responsive-public.mjs --widths 390,1440 /welcome /pricing
 *   node scripts/release/responsive-public.mjs --out ~/wm-held/proof/release-52
 *
 * CHECKS (a FAIL makes the exit code 1):
 *   REACHED      the page stayed on the route asked for (a redirect is NOT AUDITED → FAIL)
 *   NO_HSCROLL   documentElement.scrollWidth ≤ viewport width
 *   NO_OVERFLOW  no visible element's right edge past the viewport — reported as
 *                the INNERMOST offenders, skipping anything inside a horizontal
 *                scroller (a scroller is allowed to hold wide content)
 *   NO_EVICTED   no element that holds text is laid out 0 px wide or tall
 *   TAP_44       below 1025 px wide: every visible link / button / [role=button]
 *                / input / select is ≥ 44 × 44 CSS px (inline links in a
 *                paragraph of prose are exempt only if the line itself is ≥ 44)
 *   NO_ERRORS    no uncaught page error (console errors are listed as WARN)
 * WARN (reported, never fails):
 *   SMALL_TEXT   visible text rendered under 10 px
 *   CONSOLE      console.error lines
 *
 * Uses the installed Chrome (channel "chrome") — nothing is downloaded. Holds
 * NO session: signed-in routes need the in-tab snippet, responsive-in-tab.js.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const argv = process.argv.slice(2);
const flag = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
const BASE = flag("base", "https://wealthymindsetspro.com").replace(/\/$/, "");
const WIDTHS = String(flag("widths", "1440,1024,834,768,390,360")).split(",").map(Number).filter(Boolean);
const OUT = String(flag("out", join(homedir(), "wm-held", "proof", "release-52"))).replace(/^~/, homedir());
const SETTLE = Number(flag("settle", 3500));
const positional = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
const ROUTES = positional.length ? positional : [
  "/welcome", "/pricing", "/login", "/login?mode=signup", "/reset-password",
  "/legal", "/legal/risk", "/legal/market-data",
];
const HEIGHT = (w) => (w <= 430 ? 844 : w <= 1024 ? 1112 : 900);

mkdirSync(OUT, { recursive: true });

/** Runs in the page. Pure DOM measurement. */
function measure(coarse) {
  const vw = innerWidth;
  // checkVisibility walks the ancestors (a collapsed drawer at opacity 0 hides its children).
  const shown = (el) => (typeof el.checkVisibility === "function" ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true);
  const visible = (el) => {
    if (!shown(el)) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const inHScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if ((ox === "auto" || ox === "scroll") && p.scrollWidth > p.clientWidth) return true;
      // Clipped by an ancestor that itself ends inside the viewport: not visible overflow.
      if ((ox === "hidden" || ox === "clip") && p.getBoundingClientRect().right <= vw + 1) return true;
    }
    return false;
  };
  const name = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.dataset?.testid ? `[data-testid=${el.dataset.testid}]` : ""} "${(el.textContent || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40)}"`;
  const all = [...document.body.querySelectorAll("*")];

  const over = all.filter(el => visible(el) && el.getBoundingClientRect().right > vw + 1 && !inHScroller(el));
  const innermost = over.filter(el => !over.some(o => o !== el && el.contains(o))).slice(0, 8).map(el => `${name(el)} right=${Math.round(el.getBoundingClientRect().right)}`);

  const evicted = all.filter(el => {
    if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    if (el.closest("[aria-hidden=true], .sr-only, [hidden]")) return false;
    // Not rendered at all (display:none somewhere up the chain — e.g. the
    // desktop-only panel on a phone) is hidden on purpose, not evicted.
    if (el.getClientRects().length === 0) return false;
    if (!shown(el)) return false;
    if (cs.position === "absolute" && (cs.clip !== "auto" || cs.clipPath !== "none")) return false; // visually-hidden pattern
    const r = el.getBoundingClientRect();
    return r.width === 0 || r.height === 0;
  }).slice(0, 8).map(name);

  const small = [];
  if (coarse) {
    for (const el of document.querySelectorAll("a[href], button, [role=button], input:not([type=hidden]), select, textarea, summary")) {
      if (!visible(el) || el.closest("[aria-hidden=true]")) continue;
      const r = el.getBoundingClientRect();
      if (r.height >= 44 && r.width >= 44) continue;
      // An inline link inside running prose is measured by its line box.
      const inProse = el.tagName === "A" && getComputedStyle(el).display === "inline" && el.parentElement && /^(P|LI|SPAN|DD)$/.test(el.parentElement.tagName);
      if (inProse && el.parentElement.getBoundingClientRect().height >= 44) continue;
      small.push(`${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
  }

  const tinyText = [];
  for (const el of all) {
    if (!visible(el)) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 10) tinyText.push(`${name(el)} ${fs}px`);
    if (tinyText.length >= 8) break;
  }

  return {
    path: location.pathname + location.search,
    hScroll: document.documentElement.scrollWidth > vw,
    overflow: innermost,
    evicted,
    smallTargets: small.slice(0, 12),
    smallTargetCount: small.length,
    tinyText,
  };
}

const browser = await chromium.launch({ channel: "chrome" });
const report = { base: BASE, at: new Date().toISOString(), widths: WIDTHS, rows: [] };
let failures = 0;

for (const w of WIDTHS) {
  const mobile = w < 768;
  const ctx = await browser.newContext({ viewport: { width: w, height: HEIGHT(w) }, isMobile: mobile, hasTouch: w <= 1024 });
  for (const route of ROUTES) {
    const page = await ctx.newPage();
    const pageErrors = [], consoleErrors = [];
    page.on("pageerror", e => pageErrors.push(String(e.message).slice(0, 160)));
    page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160)); });
    let navError = null;
    try { await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60_000 }); } catch (e) { navError = String(e.message).slice(0, 160); }
    await page.waitForTimeout(SETTLE);
    const m = navError ? null : await page.evaluate(measure, w <= 1024).catch(e => ({ error: String(e.message) }));
    const wanted = route.split("?")[0];
    const reached = !!m && !m.error && m.path.split("?")[0] === wanted;
    const checks = {
      REACHED: reached,
      NO_HSCROLL: reached && !m.hScroll,
      NO_OVERFLOW: reached && m.overflow.length === 0,
      NO_EVICTED: reached && m.evicted.length === 0,
      TAP_44: reached && (w > 1024 || m.smallTargetCount === 0),
      NO_ERRORS: pageErrors.length === 0 && !navError,
    };
    const pass = Object.values(checks).every(Boolean);
    if (!pass) failures++;
    const slug = `${wanted.replace(/^\//, "").replace(/\//g, "_") || "root"}${route.includes("?") ? "_" + route.split("?")[1].replace(/[^a-z0-9]+/gi, "-") : ""}-${w}`;
    const shot = join(OUT, `release52-${slug}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    report.rows.push({ route, width: w, pass, checks, ...(m ?? {}), navError, pageErrors, consoleErrors: consoleErrors.slice(0, 5), screenshot: shot });
    console.log(`${pass ? "PASS" : "FAIL"}  ${String(w).padStart(4)}  ${route}${pass ? "" : "  " + Object.entries(checks).filter(([, v]) => !v).map(([k]) => k).join(",")}${m?.tinyText?.length ? "  WARN:SMALL_TEXT" : ""}${consoleErrors.length ? "  WARN:CONSOLE" : ""}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();

const file = join(OUT, "release52-public-report.json");
writeFileSync(file, JSON.stringify(report, null, 2));
console.log(`\n${report.rows.length - failures}/${report.rows.length} passed · report ${file}`);
process.exit(failures ? 1 : 0);
