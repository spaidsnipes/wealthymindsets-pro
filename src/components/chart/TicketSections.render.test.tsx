/** The ticket body rendered at phone width (compact) and at tablet/desktop: order, the single Details fold, nothing twice. */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TicketSection } from "@/lib/execution/ticketLayout";
import { TicketSections } from "./TicketSections";

const IDS: TicketSection[] = ["QUOTE", "PROPOSAL", "BOOK", "SIDE_SIZE", "ENTRY_TYPE", "PRICE", "RISK_INPUTS", "RISK_LINE", "ECONOMICS", "PICK_STATUS", "PROTECTION_DRYRUN", "PLAN", "LIVE_ORDER", "PROTECT"];
const sections = Object.fromEntries(IDS.map(id => [id, <i key={id} data-s={id} />])) as Record<TicketSection, React.ReactNode>;
const order = (html: string) => [...html.matchAll(/data-s="([A-Z_]+)"/g)].map(m => m[1]);

describe("TicketSections", () => {
  it("390 (compact): the action path is before the fold; book / entry type / economics / protection / plan / protect are inside ONE Details", () => {
    const html = renderToStaticMarkup(<TicketSections compact sections={sections} summary="Details · FLAT · 0 working" />);
    const [before, inside] = html.split("<details");
    expect(order(before)).toEqual(["QUOTE", "PROPOSAL", "SIDE_SIZE", "PRICE", "RISK_INPUTS", "RISK_LINE", "PICK_STATUS", "LIVE_ORDER"]);
    expect(order(inside)).toEqual(["BOOK", "ENTRY_TYPE", "ECONOMICS", "PROTECTION_DRYRUN", "PLAN", "PROTECT"]);
    expect(html.match(/<details/g) ?? []).toHaveLength(1);
    expect(html).toContain('<summary data-testid="trade-details-summary"');
    expect(html).toContain("Details · FLAT · 0 working");
    expect(html).not.toMatch(/<details[^>]* open/);            // folded until the trader opens it
    expect(new Set(order(html)).size).toBe(order(html).length); // nothing twice
    expect(order(html)).toHaveLength(14);
  });
  it("390 PEEK: quote, proposal, side + quantity show; price → stop/target → risk → preview are hidden with CSS but STILL MOUNTED", () => {
    const html = renderToStaticMarkup(<TicketSections compact peek sections={sections} summary="Details · FLAT · 0 working" />);
    const actStart = html.indexOf('data-testid="trade-act-sections"');
    expect(order(html.slice(0, actStart))).toEqual(["QUOTE", "PROPOSAL", "SIDE_SIZE"]);
    expect(html).toMatch(/data-testid="trade-act-sections" data-folded="yes" hidden="" style="display:none"/);
    expect(order(html)).toHaveLength(14);                         // every section is in the DOM — nothing unmounted
    expect(order(html.slice(actStart, html.indexOf("<details")))).toEqual(["PRICE", "RISK_INPUTS", "RISK_LINE", "PICK_STATUS", "LIVE_ORDER"]);
  });
  it("390 ACT: the same DOM, the act sections shown (display: contents), in order", () => {
    const html = renderToStaticMarkup(<TicketSections compact sections={sections} summary="Details · FLAT · 0 working" />);
    expect(html).toMatch(/data-testid="trade-act-sections" data-folded="no" style="display:contents"/);
    expect(order(html.split("<details")[0])).toEqual(["QUOTE", "PROPOSAL", "SIDE_SIZE", "PRICE", "RISK_INPUTS", "RISK_LINE", "PICK_STATUS", "LIVE_ORDER"]);
  });
  it("tablet / desktop: unchanged flowing order, no Details, no phone-only risk line", () => {
    const html = renderToStaticMarkup(<TicketSections compact={false} sections={sections} summary="x" />);
    expect(html).not.toContain("<details");
    expect(order(html)).toEqual(["QUOTE", "PROPOSAL", "BOOK", "SIDE_SIZE", "ENTRY_TYPE", "PRICE", "RISK_INPUTS", "ECONOMICS", "PICK_STATUS", "PROTECTION_DRYRUN", "PLAN", "LIVE_ORDER", "PROTECT"]);
  });
});
