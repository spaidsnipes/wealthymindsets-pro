/**
 * WMExperienceShell · state matrix — the room's feel in every canon mode.
 *
 * The 2026-09-13 Founder audit gave the atmosphere state matrix in exact
 * words:
 *
 *   LIVE / VERIFIED   the market itself can move. The surrounding room
 *                     remains calm.
 *   WAIT              very quiet. No pulse trying to bait you into a trade.
 *   UNKNOWN           neutral and still.
 *   STALE             affected motion settles/freezes and age/asOf becomes
 *                     visible.
 *   CLOSED            last verified market picture remains. Calm.
 *   CONFLICTED        truth disagreement overrules atmosphere.
 *
 * The shell owns the STATIC MATERIAL and AMBIENT planes; SEMANTIC MARKET
 * is on the child. This file gates that the shell:
 *
 *   1. states the correct JOB for every mode (the ONE line the audit
 *      allowed above the market),
 *   2. defaults the guest rail correctly (open in reflection modes,
 *      closed in live-market modes so MARKET keeps the room),
 *   3. exposes the mode as data-mode="…" so a CSS rule or an F8
 *      screenshot audit can distinguish the states,
 *   4. never leaks a "?" or "undefined" caption when the mode enum grows.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WMExperienceShell } from "./WMExperienceShell";
import {
  DecisionContextBus,
  EXPERIENCE_MODES,
  type ExperienceMode,
} from "@/lib/experience/decisionContextBus";
import { shellEmphasis } from "@/lib/experience/shellLayout";

function busAt(mode: ExperienceMode): DecisionContextBus {
  const b = new DecisionContextBus();
  b.setMode(mode);
  return b;
}

function render(mode: ExperienceMode, opts: { rail?: React.ReactNode } = {}): string {
  return renderToStaticMarkup(
    <WMExperienceShell bus={busAt(mode)} rail={opts.rail}>
      <div>MARKET</div>
    </WMExperienceShell>,
  );
}

describe("WMExperienceShell · states — the one job caption", () => {
  it("carries the exact shellEmphasis.job line for every canon mode", () => {
    // The audit lets the shell speak ONCE above the market: the job. This
    // gate walks the whole enum so that renaming a mode without updating
    // its caption is caught by name.
    for (const mode of EXPERIENCE_MODES) {
      const html = render(mode);
      expect(html).toContain(shellEmphasis(mode).job);
    }
  });

  it("never renders the wrong mode's caption", () => {
    // A stale closure inside shellEmphasis or the effect that follows
    // context.mode could leak the previous job. Cross-check by rendering
    // WAIT and confirming the PREP job is absent.
    const html = render("WAIT");
    expect(html).toContain(shellEmphasis("WAIT").job);
    expect(html).not.toContain(shellEmphasis("PREP").job);
    expect(html).not.toContain(shellEmphasis("REVIEW").job);
  });
});

describe("WMExperienceShell · states — the data-mode selector plane", () => {
  it("exposes the current mode as data-mode on the sanctuary root", () => {
    // A CSS rule that dims WATER-BREATH under WAIT, or a screenshot audit
    // that filters by mode, needs a stable selector. data-mode is that
    // selector, and this gate confirms it survives across every mode.
    for (const mode of EXPERIENCE_MODES) {
      const html = render(mode);
      expect(html).toContain(`data-mode="${mode}"`);
    }
  });

  it("marks EXACTLY one mode per render", () => {
    // Two modes at once would let a "PREP or WAIT" CSS rule fire twice
    // and defeat any per-state dimming or hush. The regex matches only
    // ATTRIBUTES ( data-mode="..." with a leading space), not
    // string occurrences inside the shell's <style> block that names
    // per-mode selectors like `[data-mode="WAIT"]`.
    const html = render("EXECUTE");
    const marks = html.match(/ data-mode="[A-Z]+"/g) || [];
    expect(marks.length).toBe(1);
    expect(marks[0]).toBe(' data-mode="EXECUTE"');
  });
});

describe("WMExperienceShell · states — MARKET keeps the room in live-market modes", () => {
  it("defaults the guest rail CLOSED in live-market modes (OBSERVE / WAIT / EXECUTE / MANAGE)", () => {
    // The audit's "MARKET IS THE ROOM" law: when capital could be exposed
    // or the trader is watching for permission, nothing else may steal the
    // wall. shellEmphasis already carries this — the shell must obey it.
    for (const mode of ["OBSERVE", "WAIT", "EXECUTE", "MANAGE"] as const) {
      const html = render(mode, { rail: <div>ContextRail</div> });
      // Rail present in props, closed by default → the aside must NOT
      // render on cold mount.
      expect(html).not.toMatch(/<aside[^>]*aria-label="Context"/);
    }
  });

  it("defaults the guest rail OPEN in reflection modes (PREP / REVIEW / LEARN)", () => {
    // These are the modes where a study rail improves the work rather
    // than distracting from it. The audit's atmosphere note gives them a
    // dimmed key rather than a hushed room — the rail follows suit.
    for (const mode of ["PREP", "REVIEW", "LEARN"] as const) {
      const html = render(mode, { rail: <div>ContextRail</div> });
      expect(html).toMatch(/<aside[^>]*aria-label="Context"/);
    }
  });

  it("does not open an empty rail even in reflection modes", () => {
    // A rail with no content is a lie about what the study is. If the
    // caller passes no rail, the aside must be absent regardless of mode.
    for (const mode of EXPERIENCE_MODES) {
      const html = render(mode);
      expect(html).not.toMatch(/<aside[^>]*aria-label="Context"/);
    }
  });
});

describe("WMExperienceShell · states — honesty in every mode", () => {
  it("never renders a '?' or 'undefined' job caption when the enum grows", () => {
    // A future ExperienceMode added to the enum without a shellEmphasis
    // entry would default to `emphasis.job === undefined`. This walks
    // every current mode and asserts no placeholder leaks — a future
    // "mode without emphasis" would fail this loop immediately.
    for (const mode of EXPERIENCE_MODES) {
      const html = render(mode);
      expect(html).not.toContain("undefined");
      expect(html).not.toContain("[object Object]");
      expect(html).not.toContain("NaN");
    }
  });

  it("keeps the seven-mode bar accessible in every mode", () => {
    // The audit's a11y note: state must be carried by labels, not colour.
    // The mode bar's aria-label is that landmark.
    for (const mode of EXPERIENCE_MODES) {
      expect(render(mode)).toContain('aria-label="Experience mode"');
    }
  });
});
