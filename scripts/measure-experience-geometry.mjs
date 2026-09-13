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
 * ── The two laws, and why the first one is not enough ────────────────────────
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
 * Both laws refuse the same thing: markup that is addressable by a test and
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
 * Exits non-zero on any offence at any width, so it can gate a pipeline
 * anywhere Playwright plus an installed Chrome exist. Screenshots land in
 * /tmp/geometry-<surface>-<width>.png for human inspection.
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
    root: ".wm-decision-spine",
    cellSelector: ".wm-decision-spine",
    from: p("src/components/experience/DecisionSpineBand"),
    named: "DecisionSpineBand",
    props: `{
        decisionId: "wmd_9f3c1a22-5e77-4a10-b2d4-7c918ee0d311",
        decisionIdAbsence: "No decision born yet — permission has not crossed.",
        market: {
          symbol: "TSLA", timeframe: "5m",
          quality: "SESSION CLOSED — LAST VERIFIED",
          capturedAt: Date.UTC(2026, 8, 12, 14, 46, 5), last: 332.25,
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
];

/**
 * The band is TSX, and node cannot import TSX. esbuild is already a direct
 * dependency (it is the OpenNext build's own bundler), so the entries are
 * compiled here rather than duplicating each component's markup into this file
 * — a copy would drift and then measure something the Founder never sees.
 */
const ENTRY = `
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
${SURFACES.map((s, i) => `import { ${s.named} as C${i} } from ${s.from};`).join("\n")}

export const surfaces = [
${SURFACES.map(
  (s, i) =>
    `  { name: ${JSON.stringify(s.name)}, root: ${JSON.stringify(s.root)}, ` +
    `cellSelector: ${JSON.stringify(s.cellSelector ?? null)}, ` +
    `html: renderToStaticMarkup(React.createElement(C${i}, ${s.props})) },`,
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

// `channel: "chrome"` uses the Chrome already installed on this machine.
// `playwright install` downloads nothing here, so a fresh clone measures
// against the same engine the Founder actually looks through.
const browser = await chromium.launch({ channel: "chrome" });
const offences = [];

for (const surface of surfaces) {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:#0D0E14;font-family:system-ui">` +
        `<div data-wm-measure-root>${surface.html}</div></body></html>`,
    );

    const found = await page.evaluate(
      ({ root, cellSelector, NOODLE_MIN, PHRASE_CHARS, CLIP_SLACK }) => {
        const host = document.querySelector(root);
        if (!host) throw new Error(`no ${root} in the rendered markup`);
        const results = [];

        // CLIPPED — the words do not fit the box holding them.
        for (const el of host.querySelectorAll("*")) {
          const text = (el.textContent ?? "").trim();
          if (!text) continue;
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

        // NOODLE — a phrase crushed into a column of broken words.
        if (cellSelector) {
          const row = document.querySelector(cellSelector);
          for (const cell of row ? [...row.children] : []) {
            const text = (cell.textContent ?? "").trim();
            const w = Math.round(cell.getBoundingClientRect().width);
            if (text.length >= PHRASE_CHARS && w < NOODLE_MIN) {
              results.push({ law: "NOODLE", text: text.slice(0, 48), width: w, content: cell.scrollWidth });
            }
          }
        }
        return results;
      },
      { root: surface.root, cellSelector: surface.cellSelector, NOODLE_MIN, PHRASE_CHARS, CLIP_SLACK },
    );

    console.log(`\n=== ${surface.name} @ ${width}px ===`);
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

if (offences.length > 0) {
  console.error(
    `\nFAIL — ${offences.length} geometry offence(s). Text crushed or truncated inside the viewport is still unreadable text.`,
  );
  process.exit(1);
}
console.log(`\nPASS — ${surfaces.length} surface(s) clear at ${WIDTHS.join(", ")}px. Screenshots in /tmp/geometry-<surface>-<width>.png`);
