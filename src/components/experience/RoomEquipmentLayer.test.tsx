/**
 * RoomEquipmentLayer — the three depths, rendered.
 *
 * The Sentinel beside this file (`roomAdoptsEquipment.sentinel.test.ts`) asks
 * WHERE the grammar is wired. This file asks WHAT the trader actually sees at
 * each stage, which is a different question and neither one covers the other.
 *
 * THE DEFECT THIS FILE WAS BORN FROM
 * ----------------------------------
 * Measured live on /command-deck: the FULL stage took the whole screen — and
 * therefore took the chart away — while reading "MARKET REALITY · WAIT" over a
 * canvas naming eight unresolved dimensions, with NOTHING on that screen
 * saying it was about NQ1! on a 15m. The subject was legible at every depth
 * except the one where the trader could no longer see it for themselves.
 */

import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MarketCanvasPanel } from "./MarketCanvasPanel";
import { RoomEquipmentLayer } from "./RoomEquipmentLayer";
import type { EquipmentContent } from "./RoomEquipmentLayer";
import type { EquipmentJourney } from "@/lib/workspace/equipmentJourney";
import type { MarketCanvasVM } from "@/lib/marketData/viewModels/selectMarketCanvas";

const vm: MarketCanvasVM = {
  version: "wm.market-canvas.v1",
  verdict: "WAIT",
  clear: false,
  headline: "Right-of-way is withheld — the market has not earned entry.",
  missing: ["Direction is unresolved."],
  resolved: [],
  blockers: ["Regime", "Direction"],
  blockerCount: 11,
  clearances: [],
  invalidators: [],
  hasSnapshot: true,
};

const journey = (stage: EquipmentJourney["stage"]): EquipmentJourney => ({
  stage,
  equipmentId: stage === "closed" ? null : "market-reality",
  decisionId: null,
  // Only FULL carries a place to come back to — invariant 3 of the grammar.
  returnTo: stage === "full" ? { stage: "drawer", scrollY: 1048 } : null,
});

const noop = () => {};

/**
 * The ROOM's descriptor, rebuilt here exactly as /command-deck builds it. The
 * layer no longer knows what a MarketCanvasVM is; these tests therefore assert
 * the grammar END TO END — chrome plus the content a real room hands it —
 * rather than asserting that the chrome still contains one invention's panel.
 */
const content: EquipmentContent = {
  equipmentId: "market-reality",
  title: "Market reality",
  verdict: vm.verdict,
  headline: vm.headline,
  counts: [
    { testId: "equipment-count-resolved", label: `${vm.resolved.length} resolved` },
    { testId: "equipment-count-missing", label: `${vm.missing.length} missing` },
    { testId: "equipment-count-blockers", label: `${vm.blockerCount} blocking` },
  ],
  renderDepth: (unabridged: boolean) => <MarketCanvasPanel vm={vm} unabridged={unabridged} />,
};

const render = (stage: EquipmentJourney["stage"]) =>
  renderToStaticMarkup(
    <RoomEquipmentLayer
      journey={journey(stage)}
      content={content}
      subject={{ symbol: "NQ1!", timeframe: "15m" }}
      onExpand={noop}
      onEnter={noop}
      onReturn={noop}
      onClose={noop}
    />,
  );

describe("RoomEquipmentLayer — the subject survives the depth", () => {
  it("names WHICH market at every stage that renders at all", () => {
    for (const stage of ["preview", "drawer", "full"] as const) {
      const html = render(stage);
      expect(html, `${stage} lost the symbol`).toContain("NQ1!");
      expect(html, `${stage} lost the timeframe`).toContain("15m");
      expect(html, `${stage} did not publish the subject`).toContain(
        'data-testid="equipment-subject"',
      );
    }
  });

  it("names it hardest at FULL — the only stage that takes the chart away", () => {
    // Regression guard with a name: the preview and the drawer sit BESIDE the
    // chart, so a trader who forgets the symbol can glance left. FULL cannot
    // be glanced past. If this assertion is ever the only one left passing,
    // the subject line is still doing the job it was added for.
    expect(render("full")).toContain("NQ1!");
  });

  it("renders nothing at all when closed", () => {
    expect(render("closed")).toBe("");
  });
});

describe("RoomEquipmentLayer — the grammar carries any equipment, but only the one it was handed", () => {
  const withContent = (c: EquipmentContent, stage: EquipmentJourney["stage"] = "drawer") =>
    renderToStaticMarkup(
      <RoomEquipmentLayer
        journey={journey(stage)}
        content={c}
        subject={{ symbol: "NQ1!", timeframe: "15m" }}
        onExpand={noop}
        onEnter={noop}
        onReturn={noop}
        onClose={noop}
      />,
    );

  it("wears a second equipment's name and depth — no market canvas required", () => {
    // The point of the atom. If this test needs MarketCanvasPanel to pass,
    // the layer is still one invention's private chrome and the directive's
    // "reuse that grammar" clause is unreachable.
    const html = withContent({
      equipmentId: "market-reality",
      title: "Object passport",
      verdict: "UNAVAILABLE",
      headline: "This object has no verified birth.",
      counts: [{ testId: "equipment-count-touches", label: "0 touches" }],
      renderDepth: (unabridged: boolean) => (
        <p data-testid="passport-depth">{unabridged ? "whole screen" : "docked"}</p>
      ),
    });
    expect(html, "the chrome would not say the second equipment's name").toContain(
      "Object passport",
    );
    expect(html, "the chrome would not say the second equipment's state").toContain("UNAVAILABLE");
    expect(html, "the second equipment's own depth did not render").toContain(
      'data-testid="passport-depth"',
    );
    expect(html, "the drawer must not be told it has the whole screen").toContain("docked");
  });

  it("renders nothing when the room hands a reading the rail did not ask for", () => {
    // The rail requesting equipment B while the room hands equipment A's
    // compilation would put one invention's name over another's numbers —
    // the exact disagreement the single-compilation rule exists to prevent.
    // Silence is the only honest output.
    expect(withContent({ ...content, equipmentId: "market-object-passport" })).toBe("");
  });
});

describe("RoomEquipmentLayer — depth is depth, not size", () => {
  it("only FULL uncaps the canvas, and only FULL offers RETURN", () => {
    const full = render("full");
    expect(full).toContain('data-testid="equipment-return"');
    for (const shallow of ["preview", "drawer"] as const) {
      expect(render(shallow), `${shallow} must not offer RETURN`).not.toContain(
        'data-testid="equipment-return"',
      );
    }
  });

  it("the blocker shortfall is disclosed wherever the canvas renders", () => {
    // blockerCount 11 against a 2-entry sample. This is a DATA gap, so it must
    // survive the extra room FULL has — it is not a display choice.
    for (const stage of ["drawer", "full"] as const) {
      expect(render(stage), `${stage} absorbed the blocker shortfall`).toContain(
        "+9 more blocking, not named here",
      );
    }
  });
});

describe("RoomEquipmentLayer — the chrome and the content agree where the page is", () => {
  /**
   * Measured live on wealthymindsetspro.com at FULL: the header ran edge to
   * edge while the canvas beneath it sat centred in a 1280 column starting a
   * third of the way in. Two elements, two different answers to "where does
   * this page begin" — a toolbar bolted onto a document, at exactly the depth
   * whose job is to feel like one thing.
   */
  const measure = (html: string, testId: string) => {
    const at = html.indexOf(`data-testid="${testId}"`);
    if (at < 0) return null;
    // The element's OWN style window, not the file's. Asking "does 1280 appear
    // somewhere in this markup" would pass on a header that never got it.
    const style = /style="([^"]*)"/.exec(html.slice(at, html.indexOf(">", at)));
    if (!style) return null;
    const s = style[1];
    return {
      maxWidth: /max-width:\s*([^;"]+)/.exec(s)?.[1]?.trim() ?? null,
      margin: /(?:^|;)\s*margin:\s*([^;"]+)/.exec(s)?.[1]?.trim() ?? null,
    };
  };

  it("header and body carry the SAME measure at full", () => {
    const html = render("full");
    const header = measure(html, "room-equipment-header");
    const body = measure(html, "room-equipment-body");
    expect(header, "the full header has no measure of its own").not.toBeNull();
    expect(body, "the full body has no measure of its own").not.toBeNull();
    expect(header!.maxWidth, "header is not bounded to the measure").toBe("1280px");
    expect(
      header,
      "the chrome and the content disagree about where the page begins",
    ).toEqual(body);
  });

  it("does NOT impose that measure on the docked stages", () => {
    // The preview and the drawer are 420px objects pinned to the corner of the
    // room. A 1280 max-width there is inert at best; centring them would be an
    // outright lie about where they sit.
    for (const stage of ["preview", "drawer"] as const) {
      const header = measure(render(stage), "room-equipment-header");
      expect(header?.maxWidth ?? null, `${stage} header took the full measure`).toBeNull();
      expect(header?.margin ?? null, `${stage} header centred itself`).toBeNull();
    }
  });
});
