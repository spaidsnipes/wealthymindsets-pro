#!/usr/bin/env node
/**
 * Measure the geometry of `/charts` experience surfaces in a real browser, at
 * real widths. Generalises `scripts/measure-spine-band.mjs`, which this file
 * replaces.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 *
 * On 2026-09-12 `DecisionSpineBand` shipped onto `/charts` with nineteen
 * passing tests and a defect that made it useless on the primary device.
 * `flex: "1 1 0"` with `minWidth: 0` cannot wrap — `flex-wrap` only moves an
 * item to the next line once items exceed their BASE size, and a base of zero
 * with no minimum shrinks forever instead. Measured at 390px the six cells were
 * 240 / 30 / 30 / 30 / 30 / 30 px wide and 220px tall: five vertical noodles of
 * one character per line. Present in the DOM, addressable by every test, and
 * unreadable by a human.
 *
 * The nineteen tests were green throughout, and correctly so: they use
 * `renderToStaticMarkup`, and STATIC MARKUP HAS NO GEOMETRY. The band's sealing
 * baton then recorded the standing warning this file answers:
 *
 *   "every other component on /charts is in exactly the same position —
 *    source-gated, geometry-ungated. The band was found because it was new and
 *    suspected. Nothing has swept the rest."
 *
 * A per-component script cannot discharge that warning, so the measurement is
 * registry-driven: adding a surface is adding a fixture, and the gate then
 * holds it forever.
 *
 * ── The three laws ───────────────────────────────────────────────────────────
 *
 * NOODLE  — a text-bearing leaf crushed so narrow it wraps to near one word per
 *           line. This is the band's original failure. It is measured as a
 *           width floor, which only works when you already know which boxes are
 *           supposed to be cells.
 *
 * CLIPPED — a text-bearing leaf whose content is wider than the box holding it
 *           (`scrollWidth > clientWidth`). This needs no knowledge of intent:
 *           it is the direct observation that the words do not fit. It catches
 *           the sibling failure mode the width floor is blind to — a row with
 *           no `flexWrap` whose items are individually wide enough but
 *           collectively too wide, so each one silently truncates.
 *
 * TINY     — a human-readable phrase whose computed font size falls below the
 *           readable floor. Text can fit its box and still be illegible. The
 *           phrase-length floor excludes short glyphs and counters, not labels
 *           or metadata that the trader still has to read.
 *
 * All three laws refuse the same thing: markup that is addressable by a test and
 * unreadable by a human.
 *
 * ── Why it renders each surface alone ────────────────────────────────────────
 *
 * `audit-phone-parity.mjs` holds no session and every authenticated route
 * redirects to /login, so it cannot reach `/charts`. Rather than claim a number
 * about a page it never loaded, this renders each surface by itself with a
 * fully populated fixture — sufficient for the question asked here, because
 * these surfaces lay out against their own width. It is NOT a substitute for
 * seeing the composed scene; that remains HUMAN_PROOF_REQUIRED.
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *
 *   node scripts/measure-experience-geometry.mjs [width...]   # default 390 834 1440
 *
 * Exits non-zero on any offence at any width. It prefers the Chrome installed
 * on the machine and falls back to Playwright's bundled Chromium, naming which
 * engine measured; with neither it exits 2 rather than report a clean run it
 * did not perform. It is wired into .github/workflows/sentinels.yml.
 *
 * Screenshots land in /tmp/geometry-<surface>-<width>.png for human inspection.
 *
 * ── On what "rendered text" means here ───────────────────────────────────────
 *
 * Both laws only look at text a HUMAN CAN SEE. That sounds obvious and was not
 * true until 2026-09-13: `textContent` returns the CSS source inside an inline
 * <style> child, and several surfaces inject their responsive rules that way,
 * so the NOODLE law reported a 0px-wide cell holding a 700-character "phrase"
 * and this gate was permanently, unfixably RED. It therefore could not be
 * wired into CI, and while it was red a real offence was indistinguishable
 * from the noise. The `showsTextToAHuman` predicate below is the repair.
 */

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * A cell narrower than this cannot hold a two-word phrase at 11px without
 * breaking mid-word. Chosen from the band's measured failure (30px) and its
 * measured repair (195px at a 390px viewport), not from taste.
 */
const NOODLE_MIN = 120;

/**
 * Leaves shorter than this are chips and counters — "WAIT", "LIVE", "3/8" —
 * which are legitimately narrow. The noodle law is about phrases.
 */
const PHRASE_CHARS = 12;

/** Sub-pixel rounding makes exact comparison lie. One pixel of slack. */
const CLIP_SLACK = 1;

const PHRASE_MIN_PX = 11;

const widths = process.argv.slice(2).map(Number).filter(Boolean);
const WIDTHS = widths.length > 0 ? widths : [390, 834, 1440];

const p = (rel) => JSON.stringify(join(ROOT, rel));

/**
 * THE REGISTRY.
 *
 * One entry per measured surface: where to import it from, the props to hand
 * it, and the selector for its root. `cellSelector` is optional and names the
 * row whose direct children are meant to be readable cells — only those are
 * held to the noodle floor. The clip law applies to every text leaf regardless,
 * because truncation is a defect no matter whose box it is in.
 *
 * `props` is emitted verbatim into the generated entry module, so it is
 * ordinary TypeScript-free JS and is typechecked by nothing. That is the cost
 * of measuring a real browser from a script; the fixtures are deliberately
 * small and shaped directly from the VM interfaces beside each component.
 */
const SURFACES = [
  {
    name: "spine-band",
    widths: [390, 834],
    root: ".wm-decision-spine",
    cellSelector: ".wm-decision-spine",
    from: p("src/components/experience/DecisionSpineBand"),
    named: "DecisionSpineBand",
    props: `{
        decisionId: "wmd_9f3c1a22-5e77-4a10-b2d4-7c918ee0d311",
        decisionIdAbsence: "No decision born yet — permission has not crossed.",
        now: {
          token: "SESSION CLOSED",
          detail: "Regular hours ended at 16:00 ET; no session is open.",
          established: true,
        },
        market: {
          symbol: "TSLA", timeframe: "5m",
          quality: "SESSION CLOSED — LAST VERIFIED",
          capturedAt: Date.UTC(2026, 8, 12, 14, 46, 5),
          last: null, lastBarClose: 332.25, lastBarTimeframe: "5m",
        },
        oneStory: {
          primary: "Price is inside value with no resolved direction.",
          contradiction: null, missing: null,
          decision: { value: "WAIT", detail: "Direction unresolved.", tone: "pending" },
          debt: null,
        },
        availableR: {
          resolution: "PARTIAL", conservativeR: 2.5, optimisticR: 4.1,
          riskPerUnit: 1.25, costDragR: "UNKNOWN", destination: null,
          missingInputs: [], warnings: [],
        },
        decisionWhy: {
          version: "wm.decision-why.v1", verdict: "WAIT", clear: false,
          headline: "Right-of-way withheld — evidence debt unpaid.",
          blockers: [], clearances: [],
          invalidators: ["Value migrates below 330.10"],
        },
        expression: null,
        onOpenWhy: () => {},
      }`,
  },
  {
    // `/charts` mounts the spine as a fixed 320px rail on desktop. Measuring
    // the default band at a 1440px viewport does not exercise that projection,
    // especially when BAR_CLOSE adds a qualified provenance sentence.
    name: "spine-rail-bar-close",
    widths: [1440],
    root: ".wm-decision-spine--rail",
    cellSelector: ".wm-decision-spine--rail",
    from: p("src/components/experience/DecisionSpineBand"),
    named: "DecisionSpineBand",
    props: `{
        presentation: "rail",
        decisionId: "wmd_9f3c1a22-5e77-4a10-b2d4-7c918ee0d311",
        decisionIdAbsence: "No decision born yet — permission has not crossed.",
        // The UNESTABLISHED tone, deliberately, so the two spine fixtures
        // between them measure both branches of NOW_TOKEN_TONE. The detail
        // sentence is long on purpose: the rail is 320px and this is the
        // string most likely to crush a neighbouring cell.
        now: {
          token: "SESSION UNKNOWN",
          detail: "No session clock has been observed, so the moment cannot be named.",
          established: false,
        },
        market: {
          symbol: "TSLA", timeframe: "5m",
          quality: "SESSION CLOSED — LAST VERIFIED",
          capturedAt: Date.UTC(2026, 8, 12, 14, 46, 5),
          last: null, lastBarClose: 332.25, lastBarTimeframe: "5m",
        },
        oneStory: {
          primary: "Price is inside value with no resolved direction.",
          contradiction: null, missing: null,
          decision: { value: "WAIT", detail: "Direction unresolved.", tone: "pending" },
          debt: null,
        },
        availableR: {
          resolution: "PARTIAL", conservativeR: 2.5, optimisticR: 4.1,
          riskPerUnit: 1.25, costDragR: "UNKNOWN", destination: null,
          missingInputs: [], warnings: [],
        },
        decisionWhy: {
          version: "wm.decision-why.v1", verdict: "WAIT", clear: false,
          headline: "Right-of-way withheld — evidence debt unpaid.",
          blockers: [], clearances: [], invalidators: ["Value migrates below 330.10"],
        },
        expression: null,
        onOpenWhy: () => {},
      }`,
  },
  {
    name: "passport-panel",
    root: '[aria-label="Market object passports"]',
    from: p("src/components/experience/MarketObjectPassportPanel"),
    named: "MarketObjectPassportPanel",
    props: `((obj) => ({
        vm: {
          version: "wm.market-object-passport.v1",
          snapshotId: "cms_2026-09-12T14:46:05Z_TSLA",
          capturedAt: Date.UTC(2026, 8, 12, 14, 46, 5),
          qualityState: "SESSION CLOSED — LAST VERIFIED",
          objects: [
            obj("direction", "Direction", "RESOLVED", "Balanced inside value", "OBSERVED", 0.72),
            obj("location", "Location", "RESOLVED", "Inside prior-day value area", "DERIVED", 0.61),
            obj("orderFlow", "Order Flow", "FORMING", "Aggression mixed, no dominant side", "DERIVED", 0.4),
            obj("regime", "Regime", "UNRESOLVED", null, null, null),
          ],
          resolvedCount: 2, totalCount: 4,
        },
      }))((id, label, lifecycle, value, fidelity, confidence) => ({
        id, label, lifecycle, value, confidence, fidelity,
        sources: ["alpaca"], evidence: [], contradictions: [], unknowns: [],
        summary: "Not enough evidence has arrived to seal this object.",
      }))`,
  },
  {
    name: "decision-why-panel",
    root: '[aria-label="Why / why not — decision"]',
    from: p("src/components/experience/DecisionWhyPanel"),
    named: "DecisionWhyPanel",
    props: `{
        vm: {
          version: "wm.decision-why.v1", verdict: "WAIT", clear: false,
          headline: "Right-of-way withheld — evidence debt unpaid.",
          blockers: [
            { kind: "EVIDENCE_DEBT", label: "Order flow", detail: "No dominant aggressor has resolved." },
            { kind: "CONTRADICTION", label: "Active contradiction", detail: "Direction says balanced while structure says expansion." },
          ],
          clearances: ["Risk budget is intact for the session."],
          invalidators: [],
        },
      }`,
  },
  {
    name: "experience-mode-bar",
    root: '[aria-label="Experience mode"]',
    from: p("src/components/experience/ExperienceModeBar"),
    named: "ExperienceModeBar",
    // No bus: the bar's own no-bus branch is the one a cold page load renders,
    // and it is the branch most likely to carry the longest hint strings.
    props: `{}`,
  },
  {
    name: "exit-ramp-card",
    root: '[aria-label="Exit ramp"]',
    from: p("src/components/experience/ExitRampCard"),
    named: "ExitRampCard",
    // Composed, not hand-written. A hand-written ExitRamp would drift from the
    // composer and then this gate would measure a shape the Founder never sees.
    imports: [`import { composeExitRamp } from ${p("src/lib/experience/composeExitRamp")};`],
    props: `{
        ramp: composeExitRamp({
          assessment: {
            version: "wm.completion-state.v1",
            state: "HOLDING",
            reason: "An open position has no attached invalidation level.",
            safeToLeave: false,
            criteria: {},
          },
          done: ["Thesis compiled and sealed against the 14:46:05Z snapshot."],
          saved: ["Decision wmd_9f3c1a22 and its full evidence lineage."],
          open: ["The open TSLA position still has no invalidation attached."],
          next: "Attach an invalidation level to the open TSLA position.",
          returnCondition: "Value migrates below 330.10",
        }),
      }`,
  },
  {
    name: "decision-receipt-panel",
    root: '[aria-label="Decision receipt"]',
    from: p("src/components/experience/DecisionReceiptPanel"),
    named: "DecisionReceiptPanel",
    // Composed through the real seal → manage → close → review chain, not a
    // hand-written VM. The receipt is the surface a trader takes to their own
    // journal; a fixture that drifts from `sealDecision` would have this gate
    // measuring a receipt nobody is ever shown.
    //
    // The FULLEST record is used deliberately: outcome attached, review
    // attached, lessons recorded, an amendment appended. Every optional block
    // renders, so this is the widest the panel ever gets.
    imports: [
      `import { selectDecisionReceipt } from ${p("src/lib/traderMemory/viewModels/selectDecisionReceipt")};`,
      `import { DECISION_MEMORY_SCHEMA_VERSION, sealDecision, appendManagement, attachOutcome, attachReview } from ${p("src/lib/traderMemory/decisionMemory")};`,
      `const RECEIPT_FROZEN = {
  schemaVersion: DECISION_MEMORY_SCHEMA_VERSION,
  capturedAt: 1800000000000,
  marketStateSummary: {
    regime: "TREND", direction: "LONG", location: "VAL", volatility: "NORMAL",
    session: "REGULAR", structure: "BOS", aggression: "HIGH", profile: "BALANCED",
    unresolvedDimensionCount: 0, canonicalStateId: "cms-123",
  },
  marketProvenance: {
    providersUsed: [{ provider: "alpaca", feed: "iex", coverageScope: "IEX", freshness: "LIVE" }],
  },
  traderState: {
    ownerId: "owner-1", capturedAt: 1800000000000, planStatus: "ACTIVE",
    ruleAdherenceAtDecision: true, externalInfluenceFlagged: false,
    tradeNumberInSession: 1, coachingShown: false,
  },
  playbook: { playbookId: "clc-long-v1", playbookVersion: 1, genomeSnapshot: {} },
};
const RECEIPT_VM = (() => {
  let r = sealDecision({
    decisionId: "wmd_9f3c1a22-5e77-4a10-b2d4-7c918ee0d311",
    ownerId: "owner-1",
    sessionIdentity: "s-1",
    frozen: RECEIPT_FROZEN,
    plan: {
      action: "ENTER_LONG",
      thesis: "CLC Long at VAL reclaim — value migrated up and held on the retest.",
      intendedSize: 100, intendedStop: 99.5, intendedTargets: [101, 102],
      expectedR: 2.0, availableRAtDecision: 2.0,
      invalidationCriteria: "Break below VAL - 0.5 ATR",
      expectedBehavior: ["Rejection wick at VAL", "Increasing CVD"],
    },
  });
  r = appendManagement(r, {
    id: "mg-1", type: "TRAIL_STOP", at: 1800000600000,
    detail: "Stop trailed to breakeven once the first target printed.",
    numeric: { newStop: 100 },
  });
  r = attachOutcome(r, { closedAt: 1800001200000, realizedR: 1.4, reason: "TARGET", averageFillPrice: 101.4 });
  r = attachReview(r, {
    reviewedAt: 1800002000000,
    marketOpportunityQuality: 4, playbookMatch: 5, riskQuality: 4,
    executionQuality: 3, processAdherence: 5,
    lessons: ["Sized correctly but hesitated on the retest entry by two bars."],
  });
  return selectDecisionReceipt(r);
})();`,
    ],
    props: `{ vm: RECEIPT_VM }`,
  },
  {
    name: "scene-admission-panel",
    // The accessible name is COMPILED (`Scene ${scene}. ${reason}`), so the
    // selector matches its stable prefix. Pinning the whole string here would
    // make this gate fail on a reason-wording change, which is not a geometry
    // fact and would train the next reader to ignore a red gate.
    root: 'section[aria-label^="Scene "]',
    from: p("src/components/experience/SceneAdmissionPanel"),
    named: "SceneAdmissionPanel",
    // The WIDEST state this panel ever reaches, chosen deliberately:
    //
    //   DEGRADED  — the longest compiled reason sentence in the cascade, and
    //               the one that must stay readable precisely when capital is
    //               exposed and unverified.
    //   governed  — one element, which is the honest /command-deck number. It
    //               also produces ELEVEN "not governed here" chips, so the chip
    //               wrap is measured at its real maximum rather than at a
    //               flattering one.
    //   provenance— one group unobserved, so the derived "WM has not read…"
    //               paragraph renders too.
    //
    // Compiled through the real `compileScene`, never hand-written: a fixture
    // that drifted from the compiler would have this gate measuring a scene the
    // Founder is never shown.
    imports: [
      `import { compileScene } from ${p("src/lib/experience/compileScene")};`,
      `const SCENE_COMPILATION = compileScene({
  position: "LONG",
  positionConfidence: "CONFIRMED",
  intentInFlight: false,
  exposureIncreasingWorkingOrders: 0,
  linkVerified: false,
  sessionOpen: true,
  rightOfWay: null,
  composingIntent: false,
  hadCapitalEvent: true,
  receiptWritten: false,
});
const SCENE_PROVENANCE = {
  SESSION: "OBSERVED", DECISION: "UNOBSERVED", POSITION: "OBSERVED",
  ORDERS: "OBSERVED", LINK: "OBSERVED",
};`,
    ],
    props: `{
        compilation: SCENE_COMPILATION,
        provenance: SCENE_PROVENANCE,
        observedCount: 4,
        totalCount: 5,
        governed: ["MARKET_CANVAS"],
      }`,
  },
  {
    // The decision SPINE, mounted on both /command-deck and /charts. It was
    // dechromed during the 2026-09-13 SCENE_FRAGMENTATION cure and had never
    // been measured at any width — exactly the "source-gated, geometry-
    // ungated" position this file's header warns about.
    //
    // The fixture is deliberately hostile rather than tidy: long verdicts, a
    // long narrative, and long HINT strings. The hint chips carry
    // whiteSpace:nowrap + maxWidth:220 + textOverflow:ellipsis, so if this
    // surface truncates evidence on the founder-path phone, the gate should
    // be the thing that says so — not the Founder.
    name: "decision-chain-panel",
    root: ".wm-decision-chain",
    from: p("src/components/chart/DecisionChainPanel"),
    named: "DecisionChainPanel",
    props: `{
        vm: {
          phase: "IN_POSITION",
          evaluatedAt: 1757770000000,
          headline: "Managing an open position — auction balanced, one input missing.",
          summary: { ok: 5, watch: 2, warn: 1, unknown: 1, total: 9 },
          nodes: [
            { key: "regime", label: "Regime", verdict: "BALANCED", indicator: "OK",
              narrative: "Two-sided auction inside yesterday's value; no directional edge from regime alone." },
            { key: "availableR", label: "Available R", verdict: "UNKNOWN", indicator: "UNKNOWN",
              narrative: "Account equity has not been observed this session, so risk-per-trade cannot be derived.",
              hints: ["account equity not observed this session", "broker link not established"],
              hintTones: ["missing", "missing"] },
            { key: "permission", label: "Permission", verdict: "WITHHELD", indicator: "WARN",
              narrative: "Two rules are engaged against entry and neither has cleared.",
              hints: ["daily loss limit engaged", "no A+ setup identified"],
              hintTones: ["warn", "watch"] },
          ],
        },
        showNarratives: true,
      }`,
  },
  {
    // T-WAIT, measured rather than asserted.
    //
    // The Founder's ship-blocking suite names T-WAIT as its own gate: the room
    // must be able to WITHHOLD and still read as a room. DeckExpressionShortlist
    // is where the deck withholds — when canonical market evidence has not
    // resolved a direction, it refuses to pick a side and says so in a full
    // sentence. That sentence is the longest single unbroken run of prose the
    // Founder route renders, and it had never been measured at any width.
    //
    // Rendering with direction=null is not a contrivance to reach a rare state.
    // It is the state the deck is in whenever canonical direction is null,
    // which is the common case today.
    //
    // Only the WITHHELD state is reachable here, and that is stated rather than
    // papered over: LOADING / READY / UNAVAILABLE are all entered from an
    // effect, and renderToStaticMarkup runs no effects. Measuring the other
    // three needs a live session against the real provider, which this harness
    // deliberately does not hold.
    name: "expression-shortlist-wait",
    root: '[data-testid="deck-expression-shortlist"]',
    from: p("src/components/experience/DeckExpressionShortlist"),
    named: "DeckExpressionShortlist",
    props: `{ symbol: "TSLA", spot: 365.42, direction: null }`,
  },
  {
    // READY is effect-owned in DeckExpressionShortlist, so SSR cannot enter it.
    // Measure the exported canonical tile directly rather than pretending the
    // WAIT fixture covers timestamps and quote-role metadata it never renders.
    name: "expression-shortlist-ready-tile",
    root: '[data-testid="shortlist-tile-fast"]',
    from: p("src/components/experience/DeckExpressionShortlist"),
    named: "ShortlistTile",
    props: `{
        slot: {
          job: "FAST", reason: "",
          contract: {
            symbol: "TSLA260918C00365000", contractType: "call",
            expirationDate: "2026-09-18", strike: 365,
            quoteTimestamp: "2026-09-13T20:00:00.000Z",
            tradeTimestamp: "2026-09-13T19:59:57.000Z",
            bid: 4.15, ask: 4.30, last: 4.22,
          },
        },
        nowMs: Date.parse("2026-09-13T20:00:05.000Z"),
      }`,
  },
];

/**
 * The band is TSX, and node cannot import TSX. esbuild is already a direct
 * dependency (it is the OpenNext build's own bundler), so the entries are
 * compiled here rather than duplicating each component's markup into this file
 * — a copy would drift and then measure something the Founder never sees.
 */
/*
 * EVERY SURFACE RENDERS INSIDE ITS OWN try/catch, AND THAT IS THE WHOLE POINT.
 *
 * These `props` are TEMPLATE STRINGS. `tsc --noEmit` never sees them, so the
 * type system cannot hold a fixture to its component's contract — the one
 * safety net the rest of this repo relies on is structurally absent here.
 * On 2026-09-16 that bill came due: `DecisionSpineBand` had made `now` a
 * REQUIRED prop in 1fc7975, both spine fixtures still omitted it, and the
 * render threw `Cannot read properties of undefined`.
 *
 * The throw happened while the bundle was being IMPORTED, because every
 * surface was rendered eagerly into one array literal. So one stale fixture
 * did not fail one surface — it aborted the process before a single pixel was
 * measured, and took all fourteen other surfaces with it silently. The gate is
 * wired into sentinels.yml, so it had been reporting nothing at all.
 *
 * A fixture that cannot render is a REAL FINDING, not an infrastructure
 * hiccup: either the fixture drifted from its component or the component
 * cannot render its own declared contract. Either way it is named, it is
 * counted as an offence, and — critically — the other surfaces still get
 * measured. Refusing to report is right when the INSTRUMENT is missing (see
 * the browser fallback below). It is wrong when one SPECIMEN is broken.
 */
const ENTRY = `
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
${SURFACES.map((s, i) => `import { ${s.named} as C${i} } from ${s.from};`).join("\n")}
${SURFACES.flatMap((s) => s.imports ?? []).join("\n")}

function render(name, Component, props) {
  try {
    return { html: renderToStaticMarkup(React.createElement(Component, props)), renderError: null };
  } catch (error) {
    return { html: "", renderError: error && error.message ? error.message : String(error) };
  }
}

export const surfaces = [
${SURFACES.map(
  (s, i) =>
    `  { name: ${JSON.stringify(s.name)}, root: ${JSON.stringify(s.root)}, ` +
    `widths: ${JSON.stringify(s.widths ?? null)}, ` +
    `cellSelector: ${JSON.stringify(s.cellSelector ?? null)}, ` +
    `...render(${JSON.stringify(s.name)}, C${i}, ${s.props}) },`,
).join("\n")}
];
`;

const dir = mkdtempSync(join(tmpdir(), "geometry-"));
const src = join(dir, "entry.tsx");
const out = join(ROOT, ".geometry-measure.mjs");
writeFileSync(src, ENTRY);
execFileSync(join(ROOT, "node_modules/.bin/esbuild"), [
  src, "--bundle", "--platform=node", "--format=esm", "--jsx=automatic",
  "--external:react", "--external:react-dom", `--outfile=${out}`,
], { stdio: "inherit" });

const { surfaces } = await import(pathToFileURL(out).href);

// `channel: "chrome"` uses the Chrome already installed on this machine, so a
// developer measures against the same engine the Founder actually looks
// through. CI has no such Chrome, and refusing there would mean the gate can
// only ever run on one laptop — which is how this script spent its life as a
// manual command instead of an enforced gate. So it falls back, and NAMES the
// engine it fell back to, because a measurement is only as quotable as its
// instrument. With neither browser it refuses outright: "could not measure"
// must never be reportable as "found nothing".
let engine = "chrome";
const browser = await chromium.launch({ channel: "chrome" }).catch(async (error) => {
  engine = "bundled-chromium";
  console.log(
    `NOTICE  installed Chrome unavailable (${error.message.split("\n")[0]}) — ` +
      "measuring with Playwright's bundled Chromium instead.",
  );
  return chromium.launch().catch((second) => {
    console.log(
      "REFUSING TO REPORT — no browser to measure with. Neither the installed " +
        `Chrome nor Playwright's bundled Chromium could launch (${second.message.split("\n")[0]}). ` +
        "Run `npx playwright install chromium`. This is NOT a clean measurement.",
    );
    process.exit(2);
  });
});
const offences = [];

/*
 * REVIVE MODES — the census is itself a claim, and an unprobed claim is a
 * comment. Each mode reinstates the exact silence the census exists to break,
 * so a census that has quietly stopped measuring can be caught:
 *
 *   WM_GEOM_REVIVE=EMPTY_SURFACE   every fixture renders its host and nothing
 *                                  inside it — the state that used to print
 *                                  "· clear" and exit 0.
 *   WM_GEOM_REVIVE=MISSING_HOST    the host selector never appears.
 *
 * Both must go RED. Neither is reachable without the environment variable, so
 * this costs the real run nothing.
 */
const REVIVE = process.env.WM_GEOM_REVIVE ?? "";
if (REVIVE) {
  console.log(`REVIVE ${REVIVE} — the census must catch this. A clean run here is an instrument gap.`);
}

for (const surface of surfaces) {
  if (REVIVE === "EMPTY_SURFACE") {
    // Keep every element and attribute — so the host still matches its
    // selector — and remove only the words. This is precisely the state the
    // three laws cannot distinguish from a correct surface.
    surface.html = surface.html.replace(/>[^<>]+</g, "><");
  } else if (REVIVE === "MISSING_HOST") {
    surface.html = "<div>nothing to see</div>";
  }
  // A fixture that threw has no markup, so there is nothing to measure and
  // every law below would report a clean surface. Name it once — not once per
  // width, which would triple one fact — and move to the next specimen.
  if (surface.renderError !== null) {
    offences.push({
      surface: surface.name,
      width: null,
      law: "UNRENDERABLE",
      detail:
        `fixture did not render: ${surface.renderError}. Either the fixture ` +
        `drifted from its component's props or the component cannot render ` +
        `its own declared contract. NOT MEASURED — this surface's geometry ` +
        `is unknown, not clean.`,
    });
    console.log(`UNRENDERABLE  ${surface.name} — ${surface.renderError}`);
    continue;
  }

  for (const width of surface.widths ?? WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    /*
     * THE BOX MODEL IS PART OF THE INSTRUMENT'S CALIBRATION.
     *
     * `src/app/globals.css` opens with `@tailwind base`, and Tailwind's
     * preflight sets `box-sizing: border-box` on every element. So the
     * Founder's browser lays these surfaces out in BORDER-BOX. This page
     * carries no stylesheet, which left the harness measuring in the CSS
     * default, CONTENT-BOX — a different geometry from the one shipped.
     *
     * It is not a rounding difference. Measured 2026-09-16, the rail cell
     * (`width: 100%` + `padding: 10px 12px`) came out 341px inside a 317px
     * rail and clipped "would" to "wou" mid-word. Under border-box — what the
     * Founder actually sees — it is 317px and fits. The gate had reported
     * "clear", so this mis-calibration can produce a false PASS as readily as
     * a false FAIL, and neither number described the product.
     *
     * KNOWN REMAINING GAP, STATED RATHER THAN PAPERED OVER: the app renders in
     * Inter (loaded by globals.css); this page renders in system-ui. Glyph
     * widths therefore still differ slightly from production, so a measurement
     * a pixel or two from a threshold is not decisive. The thresholds here
     * (NOODLE_MIN 120, PHRASE_MIN_PX 11) are coarse enough that this does not
     * change a verdict, but a future tightening must load the real face first.
     */
    await page.setContent(
      `<!doctype html><html><head><style>` +
        `*,::before,::after{box-sizing:border-box}` +
        `</style></head>` +
        `<body style="margin:0;background:#0D0E14;font-family:system-ui">` +
        `<div data-wm-measure-root>${surface.html}</div></body></html>`,
    );

    const { results: found, census } = await page.evaluate(
      ({ root, cellSelector, NOODLE_MIN, PHRASE_CHARS, CLIP_SLACK, PHRASE_MIN_PX }) => {
        const host = document.querySelector(root);
        if (!host) return { results: [], census: { examined: 0, textLeaves: 0, missingHost: true } };
        const results = [];

        /**
         * Both laws are about text a HUMAN CAN SEE. `textContent` is not that
         * test: it happily returns the CSS source inside a <style> element,
         * the JS inside a <script>, and the contents of anything switched off
         * with display:none.
         *
         * This mattered in practice. Several surfaces inject their responsive
         * rules with an inline <style> child, and the NOODLE law measured that
         * element as a 0px-wide cell holding a 700-character "phrase" — a
         * permanent, unfixable failure report on a perfectly correct surface.
         *
         * A gate that cries wolf is worse than no gate: it cannot be wired
         * into a pipeline, and while it is red a REAL offence is
         * indistinguishable from the noise. So the predicate lives here, once,
         * and both laws consult it.
         */
        const NON_RENDERED = new Set([
          "STYLE", "SCRIPT", "TEMPLATE", "NOSCRIPT", "TITLE", "META", "LINK", "HEAD",
        ]);
        const showsTextToAHuman = (el) => {
          if (NON_RENDERED.has(el.tagName)) return false;
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") return false;
          // A visible leaf under a hidden ancestor has no rendered box.
          if (el.getClientRects().length === 0) return false;
          // aria-hidden decorative glyphs are not phrases a reader parses.
          if (el.getAttribute("aria-hidden") === "true") return false;
          // SCREEN-READER-ONLY text (the standard visually-hidden pattern:
          // clip: rect(0,0,0,0) in a 1px box) is deliberately not painted for
          // sighted readers — it is announced, not shown. Measuring it as
          // "crushed" flagged the decision rail's sr-only sentences, which is
          // the opposite of a legibility defect. Walks up, because the clip
          // may sit on an ancestor.
          for (let n = el; n && n !== host.parentElement; n = n.parentElement) {
            const c = getComputedStyle(n);
            if (c.clip === "rect(0px, 0px, 0px, 0px)" || c.clipPath === "inset(50%)" || c.clipPath === "inset(100%)") return false;
          }
          return true;
        };

        // CLIPPED — the words do not fit the box holding them.
        for (const el of host.querySelectorAll("*")) {
          const text = (el.textContent ?? "").trim();
          if (!text) continue;
          if (!showsTextToAHuman(el)) continue;
          // Only leaves own their text; an ancestor's scrollWidth is its
          // children's business, and flagging it would double-report.
          if ([...el.children].some((c) => (c.textContent ?? "").trim())) continue;
          if (el.scrollWidth > el.clientWidth + CLIP_SLACK && el.clientWidth > 0) {
            results.push({
              law: "CLIPPED", text: text.slice(0, 48),
              width: Math.round(el.getBoundingClientRect().width),
              content: el.scrollWidth,
            });
          }
        }

        // LEGIBILITY — the words fit the box and are still too small to read.
        for (const el of host.querySelectorAll("*")) {
          const text = (el.textContent ?? "").trim();
          if (!text) continue;
          if (!showsTextToAHuman(el)) continue;
          if ([...el.children].some((c) => (c.textContent ?? "").trim())) continue;
          if (text.length < PHRASE_CHARS) continue;
          const px = parseFloat(getComputedStyle(el).fontSize);
          if (px > 0 && px < PHRASE_MIN_PX) {
            results.push({ law: "TINY", text: text.slice(0, 48), width: Math.round(px), content: PHRASE_MIN_PX });
          }
        }

        // NOODLE — a phrase crushed into a column of broken words.
        if (cellSelector) {
          const row = document.querySelector(cellSelector);
          for (const cell of row ? [...row.children] : []) {
            if (!showsTextToAHuman(cell)) continue;
            const text = (cell.textContent ?? "").trim();
            const w = Math.round(cell.getBoundingClientRect().width);
            if (text.length >= PHRASE_CHARS && w < NOODLE_MIN) {
              results.push({ law: "NOODLE", text: text.slice(0, 48), width: w, content: cell.scrollWidth });
            }
          }
        }
        /*
         * VACUITY CENSUS — how much was actually LOOKED AT.
         *
         * Every number the three laws produce is a count of PROBLEMS, and all
         * three skip any element carrying no visible text. So a surface that
         * renders its host and nothing inside it walks the same loops, finds
         * nothing, and prints "· clear" — a report indistinguishable from a
         * surface measured in full and found correct. That is the same
         * accidentally-correct silence this repo keeps finding, sitting inside
         * the instrument written to catch it.
         *
         * The census is therefore returned alongside the offences, and the
         * caller refuses to read "no offences" as "clean" unless the walk
         * actually saw something.
         */
        const elements = [...host.querySelectorAll("*")];
        const textLeaves = elements.filter(
          (el) =>
            (el.textContent ?? "").trim() !== "" &&
            showsTextToAHuman(el) &&
            ![...el.children].some((c) => (c.textContent ?? "").trim()),
        );
        return {
          results,
          census: { examined: elements.length, textLeaves: textLeaves.length, missingHost: false },
        };
      },
      { root: surface.root, cellSelector: surface.cellSelector, NOODLE_MIN, PHRASE_CHARS, CLIP_SLACK, PHRASE_MIN_PX },
    );

    console.log(
      `\n=== ${surface.name} @ ${width}px ===  ` +
        `[saw ${census.examined} els / ${census.textLeaves} text leaves]`,
    );

    /*
     * The floor is deliberately the lowest number that is still a MEASUREMENT.
     * The smallest surface measured here (experience-mode-bar) renders far more
     * than this, so the floor is not a threshold anyone tunes against — it is
     * the boundary between "we looked" and "there was nothing to look at".
     * A surface whose fixture silently stops producing content crosses it, and
     * the run goes red naming the surface rather than printing "· clear".
     */
    if (census.missingHost || census.examined < 3 || census.textLeaves < 2) {
      const detail = census.missingHost
        ? `no ${surface.root} in the rendered markup`
        : `walked ${census.examined} elements and found ${census.textLeaves} visible text leaves, ` +
          "below the 3/2 floor — every law below skips elements without text, so this " +
          "surface would have reported clean without being measured at all";
      offences.push({
        surface: surface.name,
        width,
        law: "MEASURED_NOTHING",
        text: detail,
        content: 0,
      });
      console.log(`  ✗ MEASURED_NOTHING — ${detail}`);
      await page.close();
      continue;
    }

    if (found.length === 0) {
      console.log("  · clear");
    }
    for (const f of found) {
      offences.push({ surface: surface.name, width, ...f });
      console.log(`  ✗ ${f.law.padEnd(7)} box=${String(f.width).padStart(4)}px content=${String(f.content).padStart(4)}px  “${f.text}”`);
    }

    await page.screenshot({ path: `/tmp/geometry-${surface.name}-${width}.png`, fullPage: true });
    await page.close();
  }
}

await browser.close();

const unrenderable = offences.filter((o) => o.law === "UNRENDERABLE");
if (offences.length > 0) {
  // The two failures are reported apart because they mean different things. A
  // geometry offence is a measurement that found something wrong. An
  // UNRENDERABLE is a measurement that never happened, and collapsing the two
  // would let "we could not look" hide inside "we looked and it was bad".
  if (unrenderable.length > 0) {
    console.error(
      `\nNOT MEASURED — ${unrenderable.length} surface(s) could not be rendered: ` +
        `${unrenderable.map((o) => o.surface).join(", ")}. Their geometry is UNKNOWN.`,
    );
  }
  // MEASURED_NOTHING belongs with UNRENDERABLE, not with the geometry laws:
  // both are "we did not look", and only the laws below are "we looked and it
  // was wrong". Printing them together would let an unmeasured surface be read
  // as a crushed one, which is a different bug with a different fix.
  const vacuous = offences.filter((o) => o.law === "MEASURED_NOTHING");
  if (vacuous.length > 0) {
    console.error(
      `\nNOT MEASURED — ${vacuous.length} surface/width pair(s) rendered a host with nothing ` +
        `measurable inside it: ${[...new Set(vacuous.map((o) => o.surface))].join(", ")}. ` +
        "Every law here skips elements without text, so these would have reported clean. " +
        "Their geometry is UNKNOWN, not clean.",
    );
  }
  const measured = offences.length - unrenderable.length - vacuous.length;
  if (measured > 0) {
    console.error(
      `\nFAIL — ${measured} geometry offence(s), measured with ${engine}. Text crushed or truncated inside the viewport is still unreadable text.`,
    );
  }
  process.exit(1);
}
console.log(`\nPASS — ${surfaces.length} surface(s) clear at their configured viewports, measured with ${engine}. Screenshots in /tmp/geometry-<surface>-<width>.png`);
