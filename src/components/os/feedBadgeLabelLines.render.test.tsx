/**
 * THE MASTHEAD READING RENDERS ITS PHRASES WHOLE — Garden 16 §51.
 *
 * Measured on the glass 2026-09-26 (local /charts, 901px): the badge label was
 * one free-wrapping span, squeezed to "SE / C / V" and cut off at the edge.
 * The badge now paints the owner's phrases (feedLabelLines), each nowrap, and
 * still announces the one full sentence.
 */
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WMOperatingSystem } from "./WMOperatingSystem";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import type { FeedDeclaration } from "@/lib/os/osChrome";

const SESSION_CLOSED_BARS = {
  source: null,
  quotePresent: false,
  lastObservedAtMs: null,
  connected: null,
  sessionOpen: false,
  barsPresent: true,
} as unknown as FeedDeclaration;

function charts(): string {
  return renderToStaticMarkup(
    <WMOperatingSystem
      activeHref={INSTRUMENT_VIEW_ROUTE}
      surface={null}
      openEvidenceItems={null}
      rightOfWay="UNKNOWN"
      rightOfWayResolved={false}
      feed={SESSION_CLOSED_BARS}
      destinations="equipment"
      phoneDestinations="door"
      railDefaultOpen={false}
      desktopProvenance="masthead"
    >
      <canvas />
    </WMOperatingSystem>,
  );
}

describe("the feed badge on /charts, session closed over historical bars", () => {
  const html = charts();
  const badge = html.slice(html.indexOf('data-testid="os-feed-standing"'));

  it("paints the label as two whole phrases, each unbreakable", () => {
    const lines = [...badge.matchAll(/class="wm-os-feed-label-line" style="([^"]*)">([^<]*)</g)];
    expect(lines.map((m) => m[2])).toEqual(["SESSION CLOSED —", "LAST VERIFIED"]);
    for (const m of lines) expect(m[1]).toContain("white-space:nowrap");
  });

  it("keeps the pip beside ONE words group, so a wrap cannot orphan it", () => {
    expect(badge).toMatch(/class="wm-os-feed-words"[^>]*style="[^"]*flex-wrap:wrap/);
  });

  it("still announces the whole reading as one sentence, never a shortened one", () => {
    expect(html).toContain('aria-label="SESSION CLOSED — LAST VERIFIED · historical bars"');
    expect(html).toContain('title="SESSION CLOSED — LAST VERIFIED · historical bars"');
    expect(badge).toContain(">historical bars<");
  });
});
