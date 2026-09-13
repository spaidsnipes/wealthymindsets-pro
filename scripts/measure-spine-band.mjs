#!/usr/bin/env node
/**
 * Measure DecisionSpineBand geometry in a real browser, at real widths.
 *
 * ── Why a whole script for one component ─────────────────────────────────────
 *
 * On 2026-09-12 the band shipped onto `/charts` with nineteen passing tests and
 * a defect that made it useless on the primary device. `flex: "1 1 0"` with
 * `minWidth: 0` cannot wrap — `flex-wrap` only moves an item to the next line
 * once items exceed their BASE size, and a base of zero with no minimum shrinks
 * forever instead. Measured here at 390px, the six cells were:
 *
 *   Decision 240px · Now 30px · Market 30px · Risk 30px · Why 30px · Next 30px
 *   all 220px tall
 *
 * Five vertical noodles of one character per line. Present in the DOM,
 * addressable by every test, and unreadable by a human.
 *
 * The nineteen tests were green throughout, and correctly so: they use
 * `renderToStaticMarkup`, and STATIC MARKUP HAS NO GEOMETRY. This is the same
 * lesson `scripts/audit-phone-parity.mjs` records in its own header — "a class
 * name cannot witness geometry" — arriving a second time by a different door.
 * A string gate cannot stand for a layout law, so this measures instead.
 *
 * ── Why it renders the band alone ────────────────────────────────────────────
 *
 * `audit-phone-parity.mjs` holds no session and every authenticated route
 * redirects to /login, so it cannot reach `/charts`. Rather than claim a number
 * about a page it never loaded, this renders the band by itself with a fully
 * populated fixture — which is sufficient to answer the one question that
 * matters here, because the band's layout depends on its own width and nothing
 * else. It is NOT a substitute for seeing the composed scene; that remains
 * HUMAN_PROOF_REQUIRED until the route can be reached with a session.
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *
 *   node scripts/measure-spine-band.mjs [width...]     # default 390 834 1440
 *
 * Exits non-zero if any cell is narrower than MIN_READABLE at any width, so it
 * can gate a pipeline anywhere Playwright plus an installed Chrome exist.
 * Screenshots land in /tmp/spine-<width>.png for human inspection.
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
 * breaking mid-word. Chosen from the measured failure (30px) and the measured
 * repair (195px at 390px viewport), not from taste.
 */
const MIN_READABLE = 120;

const widths = process.argv.slice(2).map(Number).filter(Boolean);
const WIDTHS = widths.length > 0 ? widths : [390, 834, 1440];

/**
 * The band is TSX, and node cannot import TSX. esbuild is already a direct
 * dependency (it is the OpenNext build's own bundler), so the entry is compiled
 * here rather than duplicating the component's markup into this file — a copy
 * would drift and then measure something the Founder never sees.
 */
const ENTRY = `
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { DecisionSpineBand } from ${JSON.stringify(join(ROOT, "src/components/experience/DecisionSpineBand"))};

export const html = renderToStaticMarkup(
  React.createElement(DecisionSpineBand, {
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
  }),
);
`;

const dir = mkdtempSync(join(tmpdir(), "spine-"));
const src = join(dir, "entry.tsx");
const out = join(ROOT, ".spine-measure.mjs");
writeFileSync(src, ENTRY);
execFileSync(join(ROOT, "node_modules/.bin/esbuild"), [
  src, "--bundle", "--platform=node", "--format=esm", "--jsx=automatic",
  "--external:react", "--external:react-dom", `--outfile=${out}`,
], { stdio: "inherit" });

const { html } = await import(pathToFileURL(out).href);

// `channel: "chrome"` uses the Chrome already installed on this machine.
// `playwright install` downloads nothing here, so a fresh clone measures
// against the same engine the Founder actually looks through.
const browser = await chromium.launch({ channel: "chrome" });
let offenders = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 844 } });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:#0D0E14;font-family:system-ui">${html}</body></html>`,
  );

  const cells = await page.evaluate(() => {
    const band = document.querySelector(".wm-decision-spine");
    if (!band) throw new Error("no .wm-decision-spine in the rendered markup");
    return [...band.children].map((c) => {
      const r = c.getBoundingClientRect();
      return {
        label: c.querySelector("span")?.textContent ?? "?",
        x: Math.round(r.x), width: Math.round(r.width), height: Math.round(r.height),
      };
    });
  });

  console.log(`\n=== ${width}px ===`);
  for (const c of cells) {
    const bad = c.width < MIN_READABLE;
    if (bad) offenders += 1;
    console.log(`  ${bad ? "✗" : "·"} ${c.label.padEnd(9)} x=${String(c.x).padStart(5)} w=${String(c.width).padStart(5)} h=${String(c.height).padStart(4)}`);
  }

  await page.screenshot({ path: `/tmp/spine-${width}.png` });
  await page.close();
}

await browser.close();

if (offenders > 0) {
  console.error(`\nFAIL — ${offenders} cell(s) narrower than ${MIN_READABLE}px. Text crushed inside the viewport is still unreadable text.`);
  process.exit(1);
}
console.log(`\nPASS — every cell at least ${MIN_READABLE}px at ${WIDTHS.join(", ")}px. Screenshots in /tmp/spine-<width>.png`);
