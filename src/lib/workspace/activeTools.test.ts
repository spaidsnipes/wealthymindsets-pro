/**
 * ACTIVE TOOLS — Drive Garden 18 snapshot 10-02 §B5 (2026-10-07).
 * The panel must agree with what the canvas paints: its words come from the
 * chart's receipts (`senseEventStates`), its rows from the switch state.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";

import { selectProfileMenu, type ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";
import { senseEventStates } from "@/lib/chart/senseEventStates";
import { activeToolWords, clearFocus, focusTool, selectActiveTools, toggleHidden } from "./activeTools";
import { ActiveToolsPanel } from "@/components/chart/ActiveToolsPanel";

const menu = (active: Readonly<Partial<Record<ProfileId, boolean>>>, flow = true, symbol?: string) =>
  selectProfileMenu({ barsPresent: true, printsPresent: flow, observedAggressorFlow: flow, active, symbol });

describe("rows = the switches that are ON, worded by the receipts", () => {
  it("lists exactly the ON tools, in the catalogue's own names", () => {
    const m = menu({ ABSORPTION: true, TPO_PROFILE: true });
    const rows = selectActiveTools({ entries: m.entries });
    expect(rows.map((r) => r.id).sort()).toEqual(["ABSORPTION", "TPO_PROFILE"]);
    for (const r of rows) expect(r.label).toBe(m.entries.find((e) => e.id === r.id)!.label);
  });

  it("an ON tool whose receipt found nothing says “ON — nothing on this camera”, never on the chart", () => {
    const receipts = senseEventStates({ absorptionZones: "0" });
    const [row] = selectActiveTools({ entries: menu({ ABSORPTION: true }).entries, receipts });
    expect(row).toMatchObject({ paint: "QUIET", words: "ON — nothing on this camera" });
  });

  it("an ON tool that painted says so, with the receipt's own count", () => {
    const receipts = senseEventStates({ absorptionZones: "3" });
    const [row] = selectActiveTools({ entries: menu({ ABSORPTION: true }).entries, receipts });
    expect(row).toMatchObject({ paint: "PAINTING", words: "ON — on the chart · 3 zones" });
  });

  it("a volume reader on spot FX says “ON — needs traded volume”", () => {
    const receipts = senseEventStates({ absorptionZones: "2" }, { symbol: "EURUSD" });
    const [row] = selectActiveTools({ entries: menu({ ABSORPTION: true }, true, "EURUSD").entries, receipts });
    expect(row).toMatchObject({ paint: "BLOCKED", words: "ON — needs traded volume" });
  });

  it("with no receipt it falls back to the menu's availability and never claims a paint", () => {
    expect(activeToolWords({ availability: "NEEDS_SIDED_TAPE", availabilityNote: "" }, undefined).words).toBe("ON — needs sided tape");
    expect(activeToolWords({ availability: "READY", availabilityNote: "" }, undefined)).toEqual({ paint: "UNREPORTED", words: "ON" });
    expect(activeToolWords({ availability: "READY", availabilityNote: "" }, "BROKEN / NOT WIRED").paint).toBe("BLOCKED");
  });
});

describe("focus / hide change roles only — nothing switches off", () => {
  const on: ProfileId[] = ["ABSORPTION", "TPO_PROFILE", "MARKET_STRUCTURE"];
  it("focus brings one forward and quiets the other ON tools", () => {
    expect(focusTool({}, on, "TPO_PROFILE")).toEqual({ TPO_PROFILE: "PRIMARY", ABSORPTION: "AMBIENT", MARKET_STRUCTURE: "AMBIENT" });
    expect(clearFocus(focusTool({ ABSORPTION: "LATENT" }, ["TPO_PROFILE"], "TPO_PROFILE"), ["TPO_PROFILE"])).toEqual({ ABSORPTION: "LATENT" });
  });
  it("hide is LATENT, and pressing again shows it", () => {
    expect(toggleHidden({}, "ABSORPTION")).toEqual({ ABSORPTION: "LATENT" });
    expect(toggleHidden({ ABSORPTION: "LATENT" }, "ABSORPTION")).toEqual({});
    const [row] = selectActiveTools({ entries: menu({ ABSORPTION: true }).entries, roles: { ABSORPTION: "LATENT" } });
    expect(row.hidden).toBe(true);
    expect(row.words).toMatch(/· hidden$/);
  });
});

describe("the panel", () => {
  it("renders one row per ON tool with focus, configure, hide and remove at 44px", () => {
    const html = renderToStaticMarkup(
      React.createElement(ActiveToolsPanel, {
        entries: menu({ ABSORPTION: true }).entries,
        receipts: senseEventStates({ absorptionZones: "0" }),
        roles: {},
        onToggle: () => {},
        configureOpenId: null,
        onConfigure: () => {},
        renderConfigure: () => null,
        instruments: [{ id: "FP_volume", label: "Footprint · Volume", what: "", onToggle: () => {} }],
      }),
    );
    expect(html).toContain('data-testid="active-tools-strip"');
    expect(html).toContain('data-active-tools-count="2"');
    expect(html).toContain("ON — nothing on this camera");
    for (const id of ["focus", "configure", "hide", "off"]) expect(html).toContain(`data-testid="active-tool-${id}-ABSORPTION"`);
    expect(html).toContain('data-testid="active-tool-off-FP_volume"');
    // Configure deep-links to the family door (toolDoor.ts).
    expect(html).toMatch(/data-testid="active-tool-configure-ABSORPTION" data-tool-door="order-flow"/);
    expect(html).toContain('aria-label="Turn off Footprint · Volume"');
    expect(html).not.toMatch(/min-width:(?:[0-3]\d|4[0-3])px/);
    // Narrow Tools sheet (live 47a4c37, 2026-10-07): the name takes its own line, the controls wrap below it.
    expect(html).toContain('class="min-w-0 basis-full"');
    expect(html).not.toMatch(/min-height:(?:[0-3]\d|4[0-3])px/);
  });

  it("Clean says so", () => {
    const html = renderToStaticMarkup(
      React.createElement(ActiveToolsPanel, { entries: menu({}).entries, roles: {}, onToggle: () => {}, configureOpenId: null, onConfigure: () => {}, renderConfigure: () => null }),
    );
    expect(html).toContain("Clean — just the market.");
  });
});
