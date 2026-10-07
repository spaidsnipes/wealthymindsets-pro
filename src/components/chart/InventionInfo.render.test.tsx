import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InventionPreview, InventionInfoButton } from "./InventionInfo";
import { ProfilesMenu } from "./ProfilesMenu";
import { ToolFinder } from "./ToolFinder";
import { SelectionFirstTouch } from "./SelectionFirstTouch";
import { educationTruthLines } from "@/lib/chart/inventionEducation";
import { selectProfileMenu } from "@/lib/marketData/viewModels/selectProfileMenu";

describe("§9 ⓘ preview", () => {
  it("answers the six questions, says the truth for this symbol, then offers ADD TO CHART", () => {
    const e = selectProfileMenu({ barsPresent: true, printsPresent: false, observedAggressorFlow: false, active: {}, symbol: "EURUSD", only: ["LIVING_PROFILE"] }).entries[0];
    const html = renderToStaticMarkup(
      <InventionPreview scope="t" id={e.id} label={e.label} what={e.what} symbol="EURUSD"
        truth={educationTruthLines({ entry: e, feed: "DELAYED" })} active={false} onAdd={() => {}} onClose={() => {}} />,
    );
    for (const h of ["What it is", "The question it answers", "What it needs", "On the chart", "How to read it", "Evidence quality", "FULL", "PARTIAL", "DEGRADED"]) {
      expect(html).toContain(h);
    }
    expect(html).toContain("On EURUSD now · UNAVAILABLE HERE");
    expect(html).toContain("Needs traded volume");
    expect(html).toContain("DELAYED");
    expect(html).toContain("Add to chart");
    expect(html).toContain('role="dialog"');
    // "What it is" quotes the catalogue's own sentence
    expect(html).toContain("The levels the market lingered at");
  });

  it("an active tool's button turns it off instead", () => {
    const e = selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: true, active: { TPO_PROFILE: true }, only: ["TPO_PROFILE"] }).entries[0];
    const html = renderToStaticMarkup(<InventionPreview scope="t" id={e.id} label={e.label} what={e.what} truth={educationTruthLines({ entry: e })} active onAdd={() => {}} onClose={() => {}} />);
    expect(html).toContain("On the chart · turn off");
  });

  it("the ⓘ is a labelled 44px button, and only exists for ids with a record", () => {
    const html = renderToStaticMarkup(<InventionInfoButton scope="s" id="ABSORPTION" label="Absorption Shelf" open={false} onToggle={() => {}} />);
    expect(html).toContain('aria-label="About Absorption Shelf"');
    expect(html).toContain("h-11 w-11");
    expect(renderToStaticMarkup(<InventionInfoButton scope="s" id="NOT_A_TOOL" label="x" open={false} onToggle={() => {}} />)).toBe("");
  });

  it("every ProfilesMenu row carries an ⓘ", () => {
    const html = renderToStaticMarkup(<ProfilesMenu barsPresent printsPresent observedAggressorFlow active={{}} onToggle={() => {}} />);
    const rows = (html.match(/data-profile-id="/g) ?? []).length;
    const infos = (html.match(/data-testid="edu-info-/g) ?? []).length;
    expect(rows).toBeGreaterThan(30);
    expect(infos).toBe(rows);
  });

  it("the Tool Finder renders without a query (ⓘ live in results and library)", () => {
    const html = renderToStaticMarkup(<ToolFinder barsPresent printsPresent observedAggressorFlow active={{}} onToggle={() => {}} />);
    expect(html).toContain("tool-finder");
  });
});

describe("§10 first touch", () => {
  it("prints the record's first-touch line and offers Inspect when Inspect is closed", () => {
    const html = renderToStaticMarkup(<SelectionFirstTouch id="BRICK_WALLS" label="Brick Walls" inspectOpen={false} onOpenInspect={() => {}} />);
    expect(html).toContain("You selected");
    expect(html).toContain("Brick wall — a strike dealers are positioned at");
    expect(html).toContain("Inspect the evidence");
    expect(html).toContain("Got it");
  });
  it("renders nothing for no selection", () => {
    expect(renderToStaticMarkup(<SelectionFirstTouch id={null} label="" inspectOpen={false} onOpenInspect={() => {}} />)).toBe("");
  });
});

describe("§10 on a phone — never a second card beside an open Inspect", () => {
  it("hides the card on phone while Inspect is open, and keeps the phone card to one line + two buttons", async () => {
    const open = renderToStaticMarkup(<SelectionFirstTouch id="BRICK_WALLS" label="Brick Walls" inspectOpen onOpenInspect={() => {}} />);
    expect(open).toMatch(/data-inspect-open="true"[^>]*class="[^"]*max-sm:hidden/);
    const closed = renderToStaticMarkup(<SelectionFirstTouch id="BRICK_WALLS" label="Brick Walls" inspectOpen={false} onOpenInspect={() => {}} />);
    expect(closed).toMatch(/data-testid="first-touch-read"[^>]*class="max-sm:hidden/);
  });
  it("the same line rides in Inspect's header, phone only", async () => {
    const { InspectFirstTouchContext, InspectFirstTouchLine } = await import("./SelectionFirstTouch");
    const html = renderToStaticMarkup(
      <InspectFirstTouchContext.Provider value={{ id: "BRICK_WALLS", label: "Brick Walls" }}><InspectFirstTouchLine /></InspectFirstTouchContext.Provider>,
    );
    expect(html).toContain('data-testid="inspect-first-touch"');
    expect(html).toContain("hidden max-sm:block");
    expect(html).toContain("Brick wall — a strike dealers are positioned at");
    expect(renderToStaticMarkup(<InspectFirstTouchLine />)).toBe("");
  });
});
