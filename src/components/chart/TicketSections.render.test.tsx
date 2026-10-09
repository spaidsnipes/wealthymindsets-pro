/** The ticket body at phone width (PEEK / BUILD / REVIEW) and at tablet/desktop: order, what is hidden, nothing unmounted, nothing twice. */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TicketSection } from "@/lib/execution/ticketLayout";
import { TicketSections } from "./TicketSections";

const IDS: TicketSection[] = ["QUOTE", "PROPOSAL", "BOOK", "SIDE", "CLOSING", "ACTION_LINE", "SIZE", "ENTRY_TYPE", "PRICE", "RISK_INPUTS", "RISK_LINE", "ECONOMICS", "PICK_STATUS", "PROTECTION_DRYRUN", "PLAN", "LIVE_ORDER", "PROTECT"];
const sections = Object.fromEntries(IDS.map(id => [id, <i key={id} data-s={id} />])) as Record<TicketSection, React.ReactNode>;
const order = (html: string) => [...html.matchAll(/data-s="([A-Z_]+)"/g)].map(m => m[1]);
const OK = { allowed: true, reason: null };
const render = (p: Partial<React.ComponentProps<typeof TicketSections>>) =>
  renderToStaticMarkup(<TicketSections compact sections={sections} summary="Details · FLAT · 0 working" review={OK} {...p} />);
/** The slice of markup that belongs to one wrapper (up to the next wrapper's testid). */
const part = (html: string, from: string, to: string) => html.slice(html.indexOf(`data-testid="${from}"`), html.indexOf(`data-testid="${to}"`));

describe("TicketSections — phone", () => {
  it("every state keeps ALL 17 sections in the DOM, each exactly once (CSS-only hiding, nothing unmounted)", () => {
    for (const p of [{ peek: true, step: null }, { step: "BUILD" as const }, { step: "REVIEW" as const }, { step: "REVIEW" as const, inFlight: true }]) {
      const o = order(render(p));
      expect(o, JSON.stringify(p)).toHaveLength(17);
      expect(new Set(o).size).toBe(17);
    }
  });
  it("PEEK: quote, proposal, side buttons and the order line show; BUILD and REVIEW are hidden; Details is folded", () => {
    const html = render({ peek: true, step: null });
    expect(order(html.slice(0, html.indexOf('data-testid="trade-act-sections"')))).toEqual(["QUOTE", "PROPOSAL", "SIDE", "ACTION_LINE"]);
    expect(html).toMatch(/data-testid="trade-pick-sections" style="display:contents"/);
    expect(html).toMatch(/data-testid="trade-act-sections" data-folded="yes" hidden="" style="display:none"/);
    expect(html.match(/<details/g) ?? []).toHaveLength(1);
    expect(html).not.toMatch(/<details[^>]* open/);
    expect(html).toContain("Details · FLAT · 0 working");
  });
  it("BUILD: closing → quantity → price → stop/target → risk line, then 'Review & preview ▸'; the live-order block is hidden", () => {
    const html = render({ step: "BUILD" });
    expect(html).toMatch(/data-testid="trade-act-sections" data-folded="no" style="display:contents"/);
    expect(order(part(html, "trade-build-sections", "trade-review-sections"))).toEqual(["CLOSING", "SIZE", "PRICE", "RISK_INPUTS", "RISK_LINE", "PICK_STATUS"]);
    expect(html).toMatch(/data-testid="trade-build-sections" style="display:contents"/);
    expect(html).toMatch(/data-testid="trade-review-sections" hidden="" style="display:none"/);
    expect(html).toMatch(/<button type="button" data-testid="trade-review"(?! disabled)[^>]*>Review &amp; preview ▸<\/button>/);
    expect(html).not.toContain('data-testid="trade-review-refusal"');
  });
  it("BUILD with a blocking refusal: the button is disabled and the reason sits beside it", () => {
    const html = render({ step: "BUILD", review: { allowed: false, reason: "Set a limit price first." } });
    expect(html).toMatch(/data-testid="trade-review" disabled="" aria-describedby="trade-review-refusal"/);
    expect(html).toMatch(/<\/button><span id="trade-review-refusal" role="status" data-testid="trade-review-refusal"[^>]*>Set a limit price first\.<\/span>/);
  });
  it("REVIEW: the live-order block alone with '◂ Edit'; the side buttons and BUILD are hidden; the quote stays", () => {
    const html = render({ step: "REVIEW" });
    expect(html).toMatch(/data-testid="trade-pick-sections" hidden="" style="display:none"/);
    expect(html).toMatch(/data-testid="trade-build-sections" hidden="" style="display:none"/);
    expect(html).toMatch(/data-testid="trade-review-sections" style="display:contents"/);
    expect(order(part(html, "trade-review-sections", "trade-details"))).toEqual(["LIVE_ORDER"]);
    expect(order(html)[0]).toBe("QUOTE");
    expect(html).toMatch(/<button type="button" data-testid="trade-edit"(?! disabled)[^>]*>◂ Edit<\/button>/);
  });
  it("REVIEW in flight: Edit is refused and its own label says why", () => {
    const html = render({ step: "REVIEW", inFlight: true });
    expect(html).toMatch(/data-testid="trade-edit" disabled=""[^>]*>IN FLIGHT · the order stays in view<\/button>/);
  });
});

describe("TicketSections — tablet / desktop", () => {
  it("the flowing order, no wrappers, no Details, no phone-only line or step buttons", () => {
    const html = renderToStaticMarkup(<TicketSections compact={false} sections={sections} summary="x" />);
    expect(html).not.toMatch(/<details|trade-review|trade-edit|trade-act-sections/);
    expect(order(html)).toEqual(["QUOTE", "PROPOSAL", "BOOK", "SIDE", "CLOSING", "ACTION_LINE", "SIZE", "ENTRY_TYPE", "PRICE", "RISK_INPUTS", "ECONOMICS", "PICK_STATUS", "PROTECTION_DRYRUN", "PLAN", "LIVE_ORDER", "PROTECT"]);
  });
});
