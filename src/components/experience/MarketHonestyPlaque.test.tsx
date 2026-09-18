/**
 * ONE FIDELITY, NOT A RAINBOW — the plaque's laws.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MarketHonestyPlaque from "./MarketHonestyPlaque";
import {
  MARKET_FIDELITIES,
  readMarketFidelity,
  type FidelityReason,
  type MarketFidelity,
} from "@/lib/marketData/marketFidelityAlgebra";

const reading = (
  fidelity: MarketFidelity,
  reasons: readonly FidelityReason[] = [],
) => {
  const r = readMarketFidelity(fidelity, 1_700_000_000_000, reasons);
  if (!r) throw new Error("fixture could not be read");
  return r;
};

const render = (props: Parameters<typeof MarketHonestyPlaque>[0]): string =>
  renderToStaticMarkup(<MarketHonestyPlaque {...props} />);

describe("one word, never five chips", () => {
  it("STATES EXACTLY ONE FIDELITY", () => {
    // The rainbow the mockup's title argues with: five badges along a masthead,
    // each technically true and collectively unreadable. The composition is the
    // algebra's job, not the reader's.
    const html = render({ reading: reading("DEGRADED", ["DELAYED", "CONFLICT"]) });
    const shown = Object.values(MARKET_FIDELITIES).filter((f) =>
      html.includes(`>${f}<`),
    );
    expect(shown).toEqual(["DEGRADED"]);
  });

  it("KEEPS REASONS BEHIND A DOOR, NOT AS BADGES", () => {
    // A reason promoted to a badge becomes a second fidelity competing with
    // the first. They stay one press away — reversible, which the canon
    // requires of evidence — without bidding for the glance.
    const html = render({ reading: reading("DEGRADED", ["DELAYED", "CONFLICT"]) });
    expect(html).toContain("<details");
    const detailsAt = html.indexOf("<details");
    expect(html.indexOf("honesty-reason-DELAYED")).toBeGreaterThan(detailsAt);
    expect(html.indexOf("honesty-reason-CONFLICT")).toBeGreaterThan(detailsAt);
  });

  it("does not auto-expand the raw disclosure", () => {
    const html = render({ reading: reading("DEGRADED", ["DELAYED"]) });
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    expect(render({ reading: reading("DEGRADED", ["DELAYED"]), showRaw: true }))
      .toMatch(/<details[^>]*\sopen/);
  });

  it("AN EMPTY REASON LIST IS STATED, NOT LEFT BLANK", () => {
    // Absence of a disclosure and an empty disclosure are different claims.
    const html = render({ reading: reading("EXECUTABLE") });
    expect(html).toContain("honesty-plaque-no-reasons");
    expect(html).not.toContain("<details");
  });
});

describe("asOf — a fidelity without its moment is a mood", () => {
  it("PRINTS THE MOMENT BESIDE THE WORD", () => {
    const html = render({
      reading: reading("DEGRADED"),
      formatAsOf: () => "15:47:02",
    });
    expect(html).toContain("asOf 15:47:02");
  });

  it("carries asOf for every one of the five", () => {
    for (const f of Object.values(MARKET_FIDELITIES)) {
      expect(render({ reading: reading(f) }), f).toContain("honesty-plaque-asof");
    }
  });
});

describe("no reading is not a clean bill", () => {
  it("RENDERS UNMEASURED RATHER THAN RENDERING NOTHING", () => {
    // The tempting default — draw only when you have something — makes an
    // unmeasured canvas look exactly like a certified one. UNMEASURED is on
    // the directive's list of honest states and is the one most easily dropped,
    // because dropping it is what "render only when present" does by accident.
    const html = render({ reading: null });
    expect(html).not.toBe("");
    expect(html).toContain("UNMEASURED");
    expect(html).toContain('data-fidelity="UNMEASURED"');
  });

  it("does not claim the canvas paints when nothing was measured", () => {
    const html = render({ reading: null });
    expect(html).not.toContain("Canvas paints");
  });
});

describe("the treatment is printed in words", () => {
  it("A DIMMED CHART AND A DIM MONITOR ARE THE SAME PICTURE", () => {
    // Which is why the treatment is not left to opacity alone.
    expect(render({ reading: reading("STALE") })).toContain("DIMMED");
    expect(render({ reading: reading("PARTIAL") })).toContain("WOUNDED");
    expect(render({ reading: reading("DEGRADED") })).toContain("WOUNDED");
    expect(render({ reading: reading("EXECUTABLE") })).toContain("INTACT");
    expect(render({ reading: reading("INDICATIVE") })).toContain("INTACT");
  });

  it("STALE WITHHOLDS THE CANVAS, AND SAYS SO", () => {
    const html = render({ reading: reading("STALE") });
    expect(html).toContain("Canvas withheld");
    expect(html).not.toContain("Canvas paints");
  });

  it("every fidelity yields an integrity word — none leaves the slot empty", () => {
    // An empty integrity slot reads as integrity.
    for (const f of Object.values(MARKET_FIDELITIES)) {
      expect(render({ reading: reading(f) }), f).toMatch(
        /data-integrity="(INTACT|WOUNDED|DIMMED|NOT PAINTED)"/,
      );
    }
  });
});

describe("§9 — honesty is not colour-coded", () => {
  it("DEGRADED DOES NOT GO RED AND EXECUTABLE DOES NOT GO GREEN", () => {
    // The plaque reports a FINDING about the pipeline, not a verdict on the
    // trader. Spending colour here would make the masthead a mood ring, and
    // a trader would learn the hue instead of the word.
    for (const f of Object.values(MARKET_FIDELITIES)) {
      const html = render({ reading: reading(f) });
      const colours = new Set(
        [...html.matchAll(/color:\s*(#[0-9a-fA-F]{6})/g)].map((m) => m[1].toLowerCase()),
      );
      for (const c of colours) {
        expect(["#ede6d3", "#c2b892", "#8a8271", "#c9a55c"], `${c} in ${f}`).toContain(c);
      }
    }
  });

  it("uses no green anywhere — no fidelity reads as safe", () => {
    for (const f of Object.values(MARKET_FIDELITIES)) {
      const html = render({ reading: reading(f, ["QUARANTINED"]) });
      for (const [, hex] of html.matchAll(/#([0-9a-fA-F]{6})/g)) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        expect(g > r && g > b, `#${hex} is green-dominant in ${f}`).toBe(false);
      }
    }
  });

  it("renders no percentage and no meter — §15", () => {
    const html = render({ reading: reading("PARTIAL", ["AGGREGATE"]) });
    expect(html).not.toMatch(/\d%/);
    expect(html).not.toMatch(/width:\s*\d+(\.\d+)?%/);
  });
});
