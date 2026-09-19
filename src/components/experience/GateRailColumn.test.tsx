/**
 * ONE CONNECTED GATE RAIL — the column's laws.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import GateRailColumn from "./GateRailColumn";
import { GATE_RAIL_ORDER, type GateName } from "@/lib/experience/gateRail";

const render = (props: Parameters<typeof GateRailColumn>[0]): string =>
  renderToStaticMarkup(<GateRailColumn {...props} />);

const allAnswered = (): Partial<Record<GateName, boolean>> =>
  Object.fromEntries(GATE_RAIL_ORDER.map((g) => [g, true]));

describe("never looked is not looked and found nothing", () => {
  it("DOES NOT DRAW SIX SILENT GATES FOR A RAIL NOBODY READ", () => {
    // Drawing six UNASKED rungs would state a finding nobody made — the rail
    // would report five silent gates as though it had gone and checked.
    const html = render({});
    expect(html).toContain("gate-rail-unasked");
    expect(html).toContain('data-interrogated="false"');
    expect(html).not.toContain("gate-rung-REGIME");
  });

  it("an empty map IS a reading — the house asked and heard nothing back", () => {
    const html = render({ answers: {} });
    expect(html).toContain('data-interrogated="true"');
    expect(html).toContain("gate-rung-REGIME");
  });

  it("renders something in both cases — silence is never blank", () => {
    expect(render({})).not.toBe("");
  });
});

describe("the spine, and the order on it", () => {
  it("DRAWS ONE SPINE, NOT SIX CARDS", () => {
    // Six readings of ONE decision. Six separate cards would let a trader take
    // four of them seriously and skip the two that disagree.
    expect(render({ answers: allAnswered() })).toContain("gate-rail-spine");
  });

  it("KEEPS THE RUNGS IN A FIXED ORDER REGARDLESS OF STANDING", () => {
    const html = render({ answers: { AVAILABLE_R: true, REGIME: false } });
    const at = (g: string) => html.indexOf(`gate-rung-${g}`);
    for (let i = 1; i < GATE_RAIL_ORDER.length; i += 1) {
      expect(at(GATE_RAIL_ORDER[i]), GATE_RAIL_ORDER[i])
        .toBeGreaterThan(at(GATE_RAIL_ORDER[i - 1]));
    }
  });

  it("carries a debt mark on every rung, paid or owing", () => {
    const html = render({ answers: { REGIME: true } });
    for (const g of GATE_RAIL_ORDER) expect(html, g).toContain(`gate-debt-${g}`);
  });
});

describe("an unasked gate is not a paid one", () => {
  it("MARKS AN UNASKED GATE AS OWING", () => {
    const html = render({ answers: { REGIME: true } });
    expect(html).toMatch(/gate-debt-CLC"[^>]*data-owes="true"/);
  });

  it("GIVES AN UNASKED GATE NO MARK — a question mark claims somebody asked", () => {
    const html = render({ answers: { REGIME: true } });
    const mark = (g: string) => {
      const i = html.indexOf(`gate-mark-${g}`);
      return html.slice(i, html.indexOf(">", i));
    };
    expect(mark("CLC")).toContain("dashed");
    expect(mark("REGIME")).not.toContain("dashed");
  });

  it("NAMES THE UNASKED GATES RATHER THAN COUNTING THEM", () => {
    const html = render({ answers: { REGIME: true, DIRECTION: false } });
    expect(html).toContain("gate-rail-unasked-names");
    expect(html).toContain("Available R");
  });

  it("drops the not-yet-asked line when every gate was put", () => {
    expect(render({ answers: allAnswered() })).not.toContain("gate-rail-unasked-names");
    expect(render({ answers: { REGIME: false, DIRECTION: false, LOCATION: false,
      ORDER_FLOW: false, CLC: false, AVAILABLE_R: false } }))
      .not.toContain("gate-rail-unasked-names");
  });
});

describe("the two facts, printed together", () => {
  it("KEEPS DRAWING DEBT AFTER THE WAIT CLEARS", () => {
    // The guarded failure: a rail that stops drawing the debt column once the
    // wait clears, because the column looked like it was ABOUT the wait.
    const html = render({ answers: { REGIME: true }, waitFinished: true });
    expect(html).toContain("WAIT FINISHED — EVIDENCE DEBT REMAINS");
    expect(html).toMatch(/data-debt-remains="true"/);
  });

  it("states both facts in every combination", () => {
    for (const waitFinished of [true, false]) {
      for (const answers of [allAnswered(), { REGIME: true }]) {
        const html = render({ answers, waitFinished });
        expect(html).toMatch(/data-wait-finished="(true|false)"/);
        expect(html).toMatch(/data-debt-remains="(true|false)"/);
      }
    }
  });

  it("A CLEAN RAIL NEVER PRINTS A PERMISSION", () => {
    const html = render({ answers: allAnswered(), waitFinished: true });
    expect(html).toContain("NO EVIDENCE DEBT");
    expect(html).not.toMatch(/\bGO\b|PROCEED|CLEAR TO|SAFE TO|ENTER NOW/i);
  });
});

describe("§9 — the rail is not colour-coded", () => {
  it("CLEARED GATES DO NOT GO GREEN AND OWING GATES DO NOT GO RED", () => {
    // The mockup paints them. §9 does not, and the reason is not aesthetic:
    // a trader who learns the hue stops reading the word, and a rail that
    // loses its colour to bright sun or a colour-blind eye has lost its
    // entire content.
    for (const answers of [allAnswered(), { REGIME: true }, {}]) {
      const html = render({ answers, waitFinished: true });
      const colours = new Set(
        [...html.matchAll(/#([0-9a-fA-F]{6})/g)].map((m) => `#${m[1].toLowerCase()}`),
      );
      for (const c of colours) {
        expect(["#ede6d3", "#c2b892", "#8a8271", "#c9a55c"], c).toContain(c);
      }
    }
  });

  it("renders no percentage and no meter — §15, a gate is not partly owed", () => {
    const html = render({ answers: { REGIME: true, DIRECTION: false }, waitFinished: true });
    // Aimed at the thing, not the word: `border-radius:50%` is a round dot and
    // no trader ever read it as a score. What §15 forbids is a percentage a
    // human can SEE, and a bar whose length encodes one.
    const text = html.replace(/<[^>]*>/g, " ");
    expect(text).not.toMatch(/\d\s*%/);
    expect(html).not.toMatch(/width:\s*\d+(\.\d+)?%/);
  });

  it("tells the three standings apart by fill and weight, and says which", () => {
    const html = render({ answers: { REGIME: true, DIRECTION: false } });
    expect(html).toMatch(/data-standing="ANSWERED"/);
    expect(html).toMatch(/data-standing="UNANSWERED"/);
    expect(html).toMatch(/data-standing="UNASKED"/);
  });
});
