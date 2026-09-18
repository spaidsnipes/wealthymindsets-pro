/**
 * A REFERENCE PAGE FOR THE BOARD — AND FOR THE DISAGREEMENT IT CURED.
 *
 * Two surfaces show how much of the board is lit. `MarketCanvasPanel` DREW it.
 * `CanvasSummaryPill` SPELLED it — "8 unresolved · 1 measured" — and the two
 * did exactly what one fact in two registers always does: on live TSLA the pill
 * read "7 unresolved" beside a panel reading "RESOLVED (4)". Eleven marks on a
 * board of eight, because PARTIAL was counted in both.
 *
 * A page is worth writing for this because the failure is not visible in either
 * surface ALONE. Each looked plausible. It is only side by side, at the same
 * reading, that eleven-of-eight becomes obvious — which is the argument for the
 * page and the argument for the shared owner, and they are the same argument.
 *
 * ── WHAT THE PILL COLUMN IS SHOWING YOU ──────────────────────────────────────
 *
 * The pill-scale band is drawn INSIDE A REAL CHIP ROW, not floating on its own.
 * At 3px tall in a 10px row the question is not "is it correct" — the panel
 * column already answers that — it is "can a trader read it at all, and does it
 * grow the row it sits in". Both are questions only a picture answers.
 *
 * ── AND THE READING THE PILL USED TO OMIT ────────────────────────────────────
 *
 * The words the pill printed named only the DARK buckets. A trader could read
 * the whole chip and learn what the house does NOT know, while never learning
 * what it does. Every row below carries its resolved marks first, in less room
 * than the two words took.
 *
 * The boards are a FIXTURE and the page says so on its face. A reference page
 * that could be mistaken for a live screen is a worse problem than no page.
 */

import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { DimensionStandingBand, standingInWords } from "./DimensionStandingBand";

/** The eight canonical dimensions, named as the compiler names them. */
const DIMS = [
  "Regime",
  "Direction",
  "Location",
  "Participation",
  "Volatility",
  "Liquidity",
  "Time",
  "Correlation",
] as const;

type VM = React.ComponentProps<typeof DimensionStandingBand>["vm"];

/** A board, split at two cut points. Always eight dimensions. */
const board = (nResolved: number, nMeasured: number): VM => ({
  resolved: DIMS.slice(0, nResolved),
  measured: DIMS.slice(nResolved, nResolved + nMeasured),
  missing: DIMS.slice(nResolved + nMeasured),
});

/**
 * The readings worth looking at.
 *
 * The dark board is the one that matters most: eight dimensions, none of them
 * resolved, is a FINDING — the house looked and the board is dark. It must look
 * different from the last row, where there is no snapshot at all and the house
 * draws nothing. H1 lives in the gap between those two rows.
 */
const READINGS: readonly (readonly [string, VM])[] = [
  ["A dark board — the house LOOKED, and nothing resolved", board(0, 0)],
  ["The live-TSLA reading the two surfaces disagreed about", board(4, 1)],
  ["Mostly lit, one dimension still unresolved", board(7, 0)],
  ["Every dimension resolved — and still no green", board(8, 0)],
  ["No snapshot at all — the house draws NOTHING", { resolved: [], measured: [], missing: [] }],
];

/** The pill's real neighbours, so the band is judged in the row it lives in. */
const chip = (inner: string): string => `
  <span style="display:inline-flex;align-items:center;gap:7px;padding:5px 9px;border:1px solid rgba(201,165,92,0.28);border-radius:11px;background:rgba(18,19,22,0.9)">
    <span style="font-size:10px;letter-spacing:.7px;color:#c9a55c">WAIT</span>
    <span style="color:#3b3730">|</span>
    ${inner}
    <span style="color:#3b3730">|</span>
    <span style="font-size:10px;color:#8a8271">2 blockers</span>
  </span>`;

const SAMPLE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Dimension standing band</title></head>
<body style="margin:0;padding:28px;background:#07080a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <h1 style="font-family:Georgia,serif;font-size:17px;color:#c9a55c;letter-spacing:.5px;margin:0 0 4px">
    Dimension standing — one board, two sizes
  </h1>
  <p style="font-size:12px;color:#8a8271;margin:0 0 22px;max-width:860px;line-height:1.6">
    FIXTURE BOARD — NOT A LIVE SNAPSHOT. Left column is the panel scale, right
    column is the same component at pill scale inside a real chip row. Read the
    two columns against each other: they must show the SAME marks in the SAME
    order. The pill used to SPELL this reading instead, and once said "7
    unresolved" beside a panel saying "RESOLVED (4)" — eleven of eight, because
    the half-lit bucket was counted in both. Every mark holds its full width
    whatever its standing; only the light differs. The last row draws nothing at
    all, which is the house declining to render "we have not looked" as a dark
    board it never read.
  </p>
  ${READINGS.map(
    ([note, vm]) => `
  <section style="margin-bottom:24px;max-width:860px">
    <div style="font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:#8a8271;margin-bottom:8px">
      ${note}
    </div>
    <div style="display:flex;gap:56px;align-items:flex-start">
      <div data-surface="panel" style="width:240px">
        <div style="font-size:9px;letter-spacing:.4px;color:#5d5747;margin-bottom:5px">MarketCanvasPanel</div>
        ${renderToStaticMarkup(
          <DimensionStandingBand vm={vm} testId="sample-panel" scale="panel" />,
        )}
      </div>
      <div data-surface="pill">
        <div style="font-size:9px;letter-spacing:.4px;color:#5d5747;margin-bottom:5px">CanvasSummaryPill</div>
        ${chip(
          renderToStaticMarkup(
            <DimensionStandingBand vm={vm} testId="sample-pill" scale="pill" />,
          ),
        )}
        <div style="font-size:9px;color:#5d5747;margin-top:6px;font-style:italic">
          tooltip: ${standingInWords(vm) || "(nothing — the house says nothing)"}
        </div>
      </div>
    </div>
  </section>`,
  ).join("")}
</body></html>`;

const TMP = path.join("/tmp", "dimension-standing-band-sample.html");
writeFileSync(TMP, SAMPLE_HTML, "utf8");
try {
  mkdirSync(path.join(process.cwd(), "public"), { recursive: true });
  writeFileSync(
    path.join(process.cwd(), "public", "dimension-standing-band-sample.html"),
    SAMPLE_HTML,
    "utf8",
  );
} catch {
  // A reference page is a convenience. It may never fail a build.
}

/**
 * The standings drawn by one surface, one entry per reading.
 *
 * Bounded at the NEXT surface marker, not at `</section>` — the two columns
 * share a section, so a section-wide scan would hand the panel column the
 * pill's marks as well and report sixteen of eight. Which is, verbatim, the
 * arithmetic this page exists to forbid.
 */
const SURFACE = /data-surface="(panel|pill)"([\s\S]*?)(?=data-surface="|<\/section>)/g;

const standingsOf = (surface: "panel" | "pill"): readonly (readonly string[])[] =>
  [...SAMPLE_HTML.matchAll(SURFACE)]
    .filter((m) => m[1] === surface)
    .map((m) => [...m[2].matchAll(/data-standing="(\w+)"/g)].map((s) => s[1]));

describe("dimension standing band sample page", () => {
  it("DRAWS THE SAME BOARD IN BOTH SCALES, ON EVERY READING — the disagreement, photographed", () => {
    // The claim under the whole extraction, asserted row by row on the page's
    // own markup. A picture proves it to a human; this proves it to CI.
    const [panel, pill] = [standingsOf("panel"), standingsOf("pill")];
    expect(panel.length, "no boards drawn").toBeGreaterThan(0);
    expect(pill).toEqual(panel);
  });

  it("never draws more marks than the board has dimensions — eleven of eight, forbidden", () => {
    // The production defect, stated as an arithmetic law. It is not enough that
    // the two agree; they must both agree with the denominator.
    for (const drawn of [...standingsOf("panel"), ...standingsOf("pill")]) {
      if (drawn.length === 0) continue; // the no-snapshot row
      expect(drawn).toHaveLength(DIMS.length);
    }
  });

  it("holds every mark to its full width whatever its standing", () => {
    const marks = [...SAMPLE_HTML.matchAll(/data-standing="\w+"[^>]*style="([^"]*)"/g)];
    expect(marks.length).toBeGreaterThan(0);
    for (const m of marks) expect(m[1]).toContain("flex:1 1 0");
  });

  it("does not grow the chip row it sits in", () => {
    // 3px in a 10px row. If the pill band ever took the panel's height, the
    // chip would grow and this page is where it would be seen first.
    const pillMarks = [...SAMPLE_HTML.matchAll(SURFACE)]
      .filter((m) => m[1] === "pill")
      .flatMap((m) => [...m[2].matchAll(/data-standing="\w+"[^>]*style="([^"]*)"/g)]);
    expect(pillMarks.length).toBeGreaterThan(0);
    for (const m of pillMarks) expect(m[1]).toContain("height:3px");
  });

  it("draws NOTHING where there is no snapshot — H1, on the page itself", () => {
    // The last reading has no band in either column. A row of unlit marks there
    // would teach the cardinal defect: absence rendered as a finding.
    const drawn = [...standingsOf("panel"), ...standingsOf("pill")].filter((d) => d.length > 0);
    expect(drawn).toHaveLength((READINGS.length - 1) * 2);
  });

  it("keeps the DARK board and the NO board visibly different", () => {
    // The two rows that would collapse into each other if H1 were violated: one
    // is eight unlit marks, the other is nothing at all.
    const [dark] = standingsOf("panel");
    expect(dark).toHaveLength(DIMS.length);
    expect(new Set(dark)).toEqual(new Set(["MISSING"]));
    expect(standingsOf("panel").at(-1)).toHaveLength(0);
  });

  it("hangs no dimension NAME anywhere on the page's bands", () => {
    // LABEL-NOT-MODEL. The page may name the dimensions in its prose; the BANDS
    // may not. Checked on the band markup only, so the fixture can still say
    // what it is built from.
    const bandMarkup = [...SAMPLE_HTML.matchAll(/data-standing="\w+"[^>]*>/g)]
      .map((m) => m[0])
      .join("");
    for (const dim of DIMS) expect(bandMarkup, `${dim} leaked onto a mark`).not.toContain(dim);
  });

  it("says on its face that the board is a fixture", () => {
    expect(SAMPLE_HTML).toContain("FIXTURE BOARD — NOT A LIVE SNAPSHOT");
  });

  it("carries no green-dominant colour and no percentage — §9, §15", () => {
    for (const m of SAMPLE_HTML.matchAll(/#([0-9a-f]{6})\b/gi)) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
      expect(g > r && g > b, `green-dominant #${m[1]}`).toBe(false);
    }
    expect(SAMPLE_HTML).not.toMatch(/\d+%/);
    expect(SAMPLE_HTML).not.toMatch(/\b(READY|SCORE|GRADE)\b/);
  });
});

// eslint-disable-next-line no-console
console.log(`\n  Dimension standing band reference page: file://${TMP}\n`);
