#!/usr/bin/env node
/**
 * THE FLOOR-AREA INSTRUMENT — C-101 "charts 70% FLOOR AREA", made falsifiable.
 *
 * The IFC hard-hat set issued 2026-09-19 carries one numeric target for the
 * primary trading surface: the candle field is to own 70% of the floor. A
 * number in a blueprint that nothing measures is a number nobody is held to,
 * and this house has been caught by that before — which is why
 * `prove-vp-pixels.mjs` exists next door and why this sits beside it.
 *
 * ── WHAT IT MEASURES ────────────────────────────────────────────────────────
 *
 * The CANDLE FIELD is `.tv-lightweight-charts` — the element the chart library
 * actually mounts — measured with `getBoundingClientRect()` and clamped to the
 * viewport, so a box that overflows off-screen cannot count the pixels nobody
 * can see. If the library has not mounted, the run REFUSES rather than falling
 * back to the largest canvas and calling that the chart.
 *
 * Two denominators are printed because C-101 does not say which it means:
 *
 *   pctViewport — candle area over the whole glass.
 *   pctRoom     — candle area over `main[data-testid="os-room"]`, the shell's
 *                 content box. The masthead is chrome, and chrome is arguably
 *                 not floor.
 *
 * The VERDICT is taken against pctRoom, the more generous of the two, so a
 * failure here cannot be argued away as a framing dispute. The viewport number
 * is printed alongside so nobody has to take that choice on trust.
 *
 * ── THE EXIT CODES ──────────────────────────────────────────────────────────
 *
 *   0  every measured viewport meets the spec.
 *   1  measured, and at least one viewport MISSES. This is the honest state
 *      as of 2026-09-19 and the script is expected to exit 1 today.
 *   2  could NOT measure — the route bounced, the chart never mounted, no
 *      server answered. A refusal is not a failure and must not be read as
 *      one, so it gets its own code.
 *
 * ── AUTH, STATED PLAINLY ────────────────────────────────────────────────────
 *
 * Every route but /login is client-side guarded, so an unauthenticated
 * scripted context lands on /login and measures nothing. This harness stubs
 * the /api/auth/me RESPONSE inside its own browser context to get past that
 * guard. No password is typed, no token is minted, no server check is
 * bypassed, and no real account is touched. It follows that any surface whose
 * CONTENT needs a real authenticated API is empty or errored here: this
 * instrument measures LAYOUT, and it may not be cited for anything else.
 *
 * Point it at production with BASE=https://wealthymindsetspro.com only from a
 * context that is genuinely authenticated; against an anonymous one it will
 * land on /login and correctly exit 2.
 *
 *   node scripts/prove-charts-floor.mjs
 *   BASE=http://localhost:3000 SETTLE=9000 node scripts/prove-charts-floor.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
/** lightweight-charts fits asynchronously; a rect read too early is a smaller
 *  chart than the trader gets. Measured stable at 9s, re-read to confirm. */
const SETTLE = Number(process.env.SETTLE || 9000);
/** C-101. One place, so a future relaxation is a visible diff. */
const FLOOR_SPEC_PCT = 70;

const CASES = [
  { label: "desk", w: 1440, h: 900, mobile: false, dpr: 2 },
  { label: "phone", w: 390, h: 844, mobile: true, dpr: 3 },
];

const STUB_USER = {
  id: "floor-instrument-no-real-account",
  email: "floor-instrument@localhost.invalid",
  displayName: "Floor Instrument",
  handle: "floor",
  profileComplete: true,
};

function probe() {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const vArea = vw * vh;
  const clamp = (r) => {
    const l = Math.max(0, r.left);
    const t = Math.max(0, r.top);
    const rr = Math.min(vw, r.right);
    const b = Math.min(vh, r.bottom);
    return { w: Math.max(0, rr - l), h: Math.max(0, b - t), left: l, top: t };
  };
  const shown = (el) => {
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) !== 0;
  };
  const rectOf = (el) => clamp(el.getBoundingClientRect());
  const areaOf = (el) => {
    const r = rectOf(el);
    return r.w * r.h;
  };
  const name = (el) => {
    if (!el) return "(none)";
    const cls =
      typeof el.className === "string" && el.className
        ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
        : "";
    const tid = el.getAttribute?.("data-testid");
    return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${tid ? `[${tid}]` : ""}${cls}`;
  };

  const lw = [...document.querySelectorAll(".tv-lightweight-charts")].filter(shown);
  // REFUSE rather than substitute. The largest visible canvas on this page may
  // be a heat lens or a sparkline, and calling one of those "the chart" would
  // manufacture a floor-area number out of the wrong element.
  if (!lw.length) {
    return { path: location.pathname, refused: "lightweight-charts did not mount", vw, vh };
  }
  const candle = lw.reduce((a, b) => (areaOf(a) >= areaOf(b) ? a : b));
  const cr = rectOf(candle);
  const cArea = cr.w * cr.h;

  const room = document.querySelector('main[data-testid="os-room"]');
  const rArea = room ? areaOf(room) : 0;

  // WHO IS EATING THE FLOOR. Attribution, so a miss names boxes rather than
  // asking the next reader to go hunting for them.
  const childrenOf = (host, denom) =>
    [...host.children]
      .filter(shown)
      .filter((c) => c !== candle && !c.contains(candle))
      .map((c) => {
        const r = rectOf(c);
        return {
          el: name(c),
          w: Math.round(r.w),
          h: Math.round(r.h),
          pctContainer: +((100 * r.w * r.h) / (denom || 1)).toFixed(1),
        };
      })
      .filter((e) => e.w * e.h > 0)
      .sort((a, b) => b.pctContainer - a.pctContainer)
      .slice(0, 8);

  let eaters = [];
  let containerName = null;
  let node = candle.parentElement;
  while (node && node !== document.body) {
    if (areaOf(node) > cArea * 1.25) break;
    node = node.parentElement;
  }
  if (node) {
    containerName = name(node);
    eaters = childrenOf(node, areaOf(node));
  }

  // THE ANCESTOR CHAIN, ALWAYS. Two earlier attempts at attribution were both
  // true numbers about the wrong box:
  //
  //   (1) The walk above stops at the first ancestor meaningfully larger than
  //       the candle. Useful when the candle is merely squeezed; useless when
  //       it has already collapsed. Measured on phone at 390x844 the candle
  //       was THIRTY PIXELS tall, so the walk halted on a 28px row and
  //       attributed the entire miss to it.
  //   (2) Listing `main[os-room]`'s own children reported NOTHING, because the
  //       room has a single wrapper child and that child contains the candle.
  //       An empty list reads as "nothing is eating the floor", which beside a
  //       4.3% candle is the most misleading output of the three.
  //
  // So the chain is walked from the room DOWN to the candle and every level is
  // reported. Whichever level owns the squeeze, it is named — no level can
  // hide between a stopping rule and a single-child wrapper.
  const chain = [];
  if (room && room.contains(candle)) {
    const lineage = [];
    for (let n = candle.parentElement; n && n !== room.parentElement; n = n.parentElement) {
      lineage.unshift(n);
    }
    for (const host of lineage) {
      const sibs = childrenOf(host, areaOf(room));
      if (sibs.length) chain.push({ host: name(host), sibs });
    }
  }

  return {
    path: location.pathname,
    vw,
    vh,
    outerWidth: window.outerWidth,
    mqPhone: window.matchMedia("(max-width: 640px)").matches,
    candle: { w: Math.round(cr.w), h: Math.round(cr.h) },
    pctViewport: +((100 * cArea) / vArea).toFixed(1),
    pctRoom: rArea ? +((100 * cArea) / rArea).toFixed(1) : null,
    roomFound: Boolean(room),
    // The desk does not scroll and the phone does. "SAME ORGANISM" is already
    // false at the scroll model, so the fact is reported rather than implied.
    scrolls: document.documentElement.scrollHeight > vh + 1,
    containerName,
    eaters,
    chain,
  };
}

let engine = "chrome";
const browser = await chromium.launch({ channel: "chrome" }).catch(async (e) => {
  engine = "bundled-chromium";
  console.log("NOTICE installed Chrome unavailable:", e.message.split("\n")[0]);
  return chromium.launch();
});

console.log(`engine=${engine}  base=${BASE}  spec=${FLOOR_SPEC_PCT}% of room`);
console.log("LAYOUT ONLY — auth response stubbed in this context; no token, no account.\n");

let missed = false;
let refused = false;

for (const c of CASES) {
  const ctx = await browser.newContext({
    viewport: { width: c.w, height: c.h },
    deviceScaleFactor: c.dpr,
    isMobile: c.mobile,
    hasTouch: c.mobile,
    ...(c.mobile
      ? {
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        }
      : {}),
  });
  await ctx.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: STUB_USER }),
    }),
  );
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));

  let r;
  try {
    await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(SETTLE);
    r = await page.evaluate(probe);
  } catch (e) {
    r = { refused: e.message.split("\n")[0] };
  }

  console.log(`===== ${c.label}  ${c.w}x${c.h} =====`);
  if (r.refused) {
    refused = true;
    console.log(`REFUSED — ${r.refused}. No number is reported for this viewport.`);
  } else if (r.path !== "/charts") {
    refused = true;
    console.log(`REFUSED — landed on ${r.path}, not /charts. Numbers suppressed.`);
  } else {
    const verdictPct = r.pctRoom ?? r.pctViewport;
    const pass = verdictPct >= FLOOR_SPEC_PCT;
    if (!pass) missed = true;
    console.log(
      `candle ${r.candle.w}x${r.candle.h}  ` +
        `pctViewport=${r.pctViewport}%  pctRoom=${r.pctRoom ?? "n/a"}%  ` +
        `outerWidth=${r.outerWidth} mqPhone=${r.mqPhone} scrolls=${r.scrolls}`,
    );
    console.log(`${pass ? "MEETS" : "MISSES"} C-101 ${FLOOR_SPEC_PCT}% (measured against ${r.roomFound ? "os-room" : "viewport"})`);
    if (!pass && r.eaters.length) {
      console.log(`  floor eaten inside ${r.containerName}:`);
      for (const e of r.eaters) console.log(`    ${e.pctContainer}%  ${e.w}x${e.h}  ${e.el}`);
    }
    if (!pass && r.chain.length) {
      console.log("  the chain from os-room down to the candle (% of room):");
      for (const lvl of r.chain) {
        console.log(`    in ${lvl.host}`);
        for (const e of lvl.sibs) console.log(`      ${e.pctContainer}%  ${e.w}x${e.h}  ${e.el}`);
      }
    }
  }
  if (errors.length) console.log("  pageerrors:", [...new Set(errors)].slice(0, 4));
  console.log("");
  await ctx.close();
}

await browser.close();

if (refused) {
  console.log("EXIT 2 — could not measure. A refusal is not a failure; nothing here says the floor is wrong.");
  process.exit(2);
}
if (missed) {
  console.log(`EXIT 1 — the floor misses C-101 ${FLOOR_SPEC_PCT}%. This is the expected state as of 2026-09-19.`);
  process.exit(1);
}
console.log(`EXIT 0 — every measured viewport owns at least ${FLOOR_SPEC_PCT}% of the room.`);
