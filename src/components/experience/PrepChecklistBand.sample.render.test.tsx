/**
 * A REFERENCE PAGE FOR THE PREP BAND — AND FOR THE DRIFT IT CURED.
 *
 * The claim is that /command-deck and /journal now show the SAME INSTRUMENT.
 * They did not: the deck drew the band 76px wide with a caption at 0.3 letter
 * spacing, the journal drew it 72px at 0.2. Nobody decided that; it is what two
 * hands produce when they copy a picture instead of importing one.
 *
 * Four pixels is small enough that no assertion would ever have been written
 * for it, which is exactly why it needs a page: side by side, at magnification,
 * two rooms disagreeing about one instrument is visible, and a diff of two
 * style objects is not.
 *
 * Both rows below are the REAL component at the two rooms' real prop sets. The
 * boards are a FIXTURE and the page says so on its face — a reference page that
 * could be mistaken for a live screen is a worse problem than no page.
 */

import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrepChecklistBand } from "./PrepChecklistBand";
import type { PrepChecklistBand as PrepChecklistBandVM } from "@/lib/experience/selectPrepChecklistBand";

const band = (done: number, total: number): PrepChecklistBandVM => ({
  marks: [
    ...Array.from({ length: done }, () => ({ checked: true })),
    ...Array.from({ length: total - done }, () => ({ checked: false })),
  ],
  done,
  total,
  remaining: total - done,
});

/**
 * The two rooms, at their real prop sets — and the three readings worth
 * looking at in each.
 *
 * `0 of 11` is the one that matters most: it is a REAL list the trader has not
 * started, and it must look different from the case where the band is absent
 * entirely (an unreadable or missing prep). One is a finding; the other is the
 * house admitting it could not look. H1 lives in the gap between them.
 */
const ROOMS = [
  {
    room: "/command-deck",
    testId: "prep-checklist",
    inline: false,
    caption: (b: PrepChecklistBandVM) => `${b.done} of ${b.total} checked`,
  },
  {
    room: "/journal",
    testId: "journal-prep",
    inline: true,
    caption: (b: PrepChecklistBandVM) => `checklist ${b.done} of ${b.total}`,
  },
] as const;

const READINGS: readonly (readonly [string, PrepChecklistBandVM | null])[] = [
  ["Nothing ticked yet — a real list, untouched", band(0, 11)],
  ["Part-way through the trader's own list", band(7, 11)],
  ["Every item ticked — and still no colour changes", band(11, 11)],
  ["No readable prep — the house could not look, so it draws NOTHING", null],
];

const SAMPLE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Prep checklist band</title></head>
<body style="margin:0;padding:28px;background:#07080a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <h1 style="font-family:Georgia,serif;font-size:17px;color:#c9a55c;letter-spacing:.5px;margin:0 0 4px">
    Prep checklist band — one instrument, two rooms
  </h1>
  <p style="font-size:12px;color:#8a8271;margin:0 0 22px;max-width:820px;line-height:1.6">
    FIXTURE BOARD — NOT A LIVE PREP. The same component at the two rooms' real
    prop sets. Before extraction /command-deck drew this 76px wide and /journal
    72px; read the two columns against each other and they must now be the same
    length, the same mark height, the same fills. An unticked item keeps its
    full width and loses only its light. The last row draws nothing at all —
    that is the house declining to render "we could not look" as "you did
    nothing".
  </p>
  ${READINGS.map(
    ([note, vm]) => `
  <section style="margin-bottom:22px;max-width:820px">
    <div style="font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:#8a8271;margin-bottom:8px">
      ${note}
    </div>
    <div style="display:flex;gap:64px">
      ${ROOMS.map(
        (r) => `
      <div data-room="${r.room}" style="display:flex;flex-direction:column;gap:3px">
        <div style="font-size:9px;letter-spacing:.4px;color:#5d5747">${r.room}</div>
        ${renderToStaticMarkup(
          <PrepChecklistBand band={vm} testId={r.testId} inline={r.inline} caption={r.caption} />,
        )}
      </div>`,
      ).join("")}
    </div>
  </section>`,
  ).join("")}
</body></html>`;

const TMP = path.join("/tmp", "prep-checklist-band-sample.html");
writeFileSync(TMP, SAMPLE_HTML, "utf8");
try {
  mkdirSync(path.join(process.cwd(), "public"), { recursive: true });
  writeFileSync(
    path.join(process.cwd(), "public", "prep-checklist-band-sample.html"),
    SAMPLE_HTML,
    "utf8",
  );
} catch {
  // A reference page is a convenience. It may never fail a build.
}

describe("prep checklist band sample page", () => {
  it("DRAWS THE TWO ROOMS THE SAME WIDTH — the drift, photographed", () => {
    // The claim under the whole page. Asserted on the markup as well as shown,
    // because a picture proves it to a human and this proves it to CI.
    const widths = [...SAMPLE_HTML.matchAll(/data-testid="[\w-]+-band"[^>]*width:(\d+px)/g)].map(
      (m) => m[1],
    );
    expect(widths.length, "no bands drawn").toBeGreaterThan(0);
    expect(new Set(widths).size, "two rooms, two widths — the drift is back").toBe(1);
  });

  it("gives every mark the same width whatever it is worth", () => {
    const perBand = SAMPLE_HTML.split(/data-testid="[\w-]+-band"/).slice(1);
    for (const html of perBand) {
      const marks = [...html.matchAll(/data-testid="[\w-]+-mark"[^>]*style="([^"]*)"/g)];
      for (const m of marks) expect(m[1]).toContain("flex:1 1 0");
    }
  });

  it("draws NOTHING for an unreadable prep — H1, on the page itself", () => {
    // The last reading has no band in either room. If a row of unlit marks
    // appeared there, the page would be teaching the cardinal defect.
    const bands = [...SAMPLE_HTML.matchAll(/data-testid="[\w-]+-band"/g)];
    expect(bands).toHaveLength((READINGS.length - 1) * ROOMS.length);
  });

  it("says on its face that the board is a fixture", () => {
    expect(SAMPLE_HTML).toContain("FIXTURE BOARD — NOT A LIVE PREP");
  });

  it("carries no green-dominant colour and no percentage — §9, §15", () => {
    for (const m of SAMPLE_HTML.matchAll(/#([0-9a-f]{6})\b/gi)) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
      expect(g > r && g > b, `green-dominant #${m[1]}`).toBe(false);
    }
    expect(SAMPLE_HTML).not.toMatch(/\d+%/);
    expect(SAMPLE_HTML).not.toMatch(/\b(READY|NOT_READY|SCORE|GRADE)\b/i);
  });
});

// eslint-disable-next-line no-console
console.log(`\n  Prep checklist band reference page: file://${TMP}\n`);
