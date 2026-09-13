/**
 * The sanctuary reads CALM when the session is CLOSED.
 *
 * Founder brief (2026-09-13): "CLOSED: last verified market picture remains.
 * Calm. No fake candle activity." Ambient WATER-BREATH is not market truth,
 * but reading BUSY behind a closed tape is exactly the pretend-alive shape
 * the brief was written to abolish. This suite pins:
 *   1. the shell exposes a data-session attribute on .wm-sanctuary
 *   2. the CSS carries a rule that slows the animation to WAIT tempo when
 *      data-session="CLOSED"
 *   3. the prop wins over the context, so a caller can override
 *   4. UNKNOWN never implies CLOSED — silence is not a closure
 *   5. the deck publishes CLOSED via SanctuarySessionProvider
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { WMExperienceShell } from "./WMExperienceShell";
import { SanctuarySessionProvider } from "@/lib/experience/sanctuarySessionContext";

const SHELL_SRC = () => readFileSync(resolve(__dirname, "WMExperienceShell.tsx"), "utf8");
const DECK_SRC = () => readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");

describe("WMExperienceShell reads the sanctuary session signal", () => {
  it("stamps data-session on the sanctuary root", () => {
    const html = renderToStaticMarkup(
      <WMExperienceShell session="CLOSED"><div /></WMExperienceShell>,
    );
    expect(html).toContain('data-session="CLOSED"');
  });

  it("defaults to UNKNOWN when neither prop nor context are supplied", () => {
    // Silence must never read as CLOSED. That would let the room go calm
    // just because a caller forgot to pass a session, which reads as a
    // truthful closure to a trader.
    const html = renderToStaticMarkup(
      <WMExperienceShell><div /></WMExperienceShell>,
    );
    // The sanctuary root's attribute is unambiguous — the CSS selector
    // string `[data-session="CLOSED"]` inside the inline stylesheet also
    // contains that substring, so we anchor on the root's own class+attr
    // rather than a bare needle. UNKNOWN is stamped on the root; CLOSED
    // as an ATTRIBUTE VALUE is not.
    expect(html).toContain('class="wm-sanctuary " data-mode="OBSERVE" data-session="UNKNOWN"');
    expect(html).not.toMatch(/wm-sanctuary [^>]*?data-session="CLOSED"/);
  });

  it("the prop wins over the context — explicit callers can override", () => {
    // Founder-room-preview / tests want to force a specific tempo without
    // wrapping the whole tree.
    const html = renderToStaticMarkup(
      <SanctuarySessionProvider value="OPEN">
        <WMExperienceShell session="CLOSED"><div /></WMExperienceShell>
      </SanctuarySessionProvider>,
    );
    expect(html).toContain('data-session="CLOSED"');
  });

  it("context wins when the prop is UNKNOWN — the deck publishes upward", () => {
    // Real production wire: MainLayout does NOT know the session, so it
    // does not pass the prop. The deck page publishes via the Provider.
    // If the shell ignored context, the deck's signal would never reach
    // the sanctuary and the founder brief would go unfulfilled.
    const html = renderToStaticMarkup(
      <SanctuarySessionProvider value="CLOSED">
        <WMExperienceShell><div /></WMExperienceShell>
      </SanctuarySessionProvider>,
    );
    expect(html).toContain('data-session="CLOSED"');
  });
});

describe("WATER-BREATH tempo has a CLOSED calm-rule", () => {
  it("the shell's inline CSS carries a data-session='CLOSED' selector", () => {
    // The atmosphere layer is written as inline CSS in the shell. The
    // selector text is the only durable proof that the CLOSED tempo rule
    // exists — a snapshot test would move under refactor.
    const src = SHELL_SRC();
    expect(src).toContain('.wm-sanctuary[data-session="CLOSED"] > .wm-water-breath');
    // WAIT-tempo — the 52s cycle already applied to trader-WAIT — is the
    // Founder brief's chosen calm speed for the room-behind-closed-tape.
    // Aligning them is deliberate, not an accident, and this test pins it.
    const closedRuleIdx = src.indexOf('data-session="CLOSED"');
    const following = src.slice(closedRuleIdx, closedRuleIdx + 400);
    expect(following).toContain("animation-duration: 52s");
    expect(following).toContain("opacity: 0.55");
  });
});

describe("the deck publishes its session upward to the sanctuary", () => {
  it("wraps its return in SanctuarySessionProvider", () => {
    const src = DECK_SRC();
    expect(src).toContain('import { SanctuarySessionProvider');
    expect(src).toContain("<SanctuarySessionProvider value={sanctuarySession}>");
    expect(src).toContain("</SanctuarySessionProvider>");
  });

  it("derives the signal from sessionTruth.token — the same session owner the strip reads", () => {
    // A second computation of "is the session closed" is exactly the shape
    // that put "session RTH" on Saturday. The signal is derived from
    // sessionTruth.token so it agrees with the strip by construction.
    const src = DECK_SRC();
    expect(src).toContain("sessionTruth.token === \"CLOSED\" ? \"CLOSED\"");
    expect(src).toContain("sessionTruth.token === \"UNKNOWN\" ? \"UNKNOWN\"");
    expect(src).toContain('                                       "OPEN"');
  });
});
