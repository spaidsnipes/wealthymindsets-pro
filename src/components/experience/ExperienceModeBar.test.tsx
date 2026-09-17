/**
 * ExperienceModeBar — the seven-mode strip that ships live on the Founder
 * route and had no test standing over its own laws.
 *
 * The strip is one of the layers named in the 2026-09-13 Founder audit: a
 * peer navigation carrying PREP · OBSERVE · WAIT · EXECUTE · MANAGE · REVIEW ·
 * LEARN across the top of /command-deck. The audit's diagnosis is not that
 * the strip is WRONG — it is that it currently competes with MARKET for the
 * first viewport. That is a composition problem, not a component defect.
 *
 * This file gates the component's OWN honesty: the seven modes must render in
 * canon order; the ONE active mode must be marked so the trader can see
 * "which job am I on"; the button carries aria-pressed so the state is
 * announced not just coloured (§H19 dead vocabulary); a click commits
 * IMMEDIATELY through the shared bus (user intent bypasses hysteresis, per
 * the header); and the bar is findable by its aria-label so a Founder audit
 * can name it in code.
 *
 * The bar is stateful (it consumes a bus), so this test file uses
 * renderToStaticMarkup for the initial state and a direct bus assertion for
 * the click law — the bus is a pure module by design and can be checked
 * without a DOM.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExperienceModeBar } from "./ExperienceModeBar";
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

function render(bus: DecisionContextBus): string {
  return renderToStaticMarkup(<ExperienceModeBar bus={bus} />);
}

describe("ExperienceModeBar — every canon mode is present, in canon order", () => {
  it("renders all seven human operating states", () => {
    const html = render(new DecisionContextBus());
    for (const mode of EXPERIENCE_MODES) {
      expect(html).toContain(`>${mode}<`);
    }
  });

  it("renders them in the exact PREP → LEARN order the canon names", () => {
    // The canon list is PREP · OBSERVE · WAIT · EXECUTE · MANAGE · REVIEW ·
    // LEARN. A shuffled bar would read the same on a badge test but tell the
    // trader a different story about the arc of a session.
    const html = render(new DecisionContextBus());
    const positions = EXPERIENCE_MODES.map((m) => html.indexOf(`>${m}<`));
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it("gives each mode a human hint so the acronym is not the whole story", () => {
    // The strip is legible to a founder, not a stranger, if the acronyms
    // carry their meaning. Removing the hints would keep the buttons but
    // strip the vocabulary — that is dead vocabulary in §H19 terms.
    const html = render(new DecisionContextBus());
    expect(html).toContain("Study what you and the market did");

    /*
      RE-PINNED TO THE MEANING, NOT TO THE SPELLING.
      ----------------------------------------------
      This used to name two caption strings verbatim, and both were the
      component's OWN private copies of captions `shellLayout` also owns. The
      copies had already drifted — this file said "Have a thesis", the masthead
      said "Hold the thesis" — and a spelling-pin is exactly what lets that
      happen: it proves a literal is present, never that it AGREES with the
      surface the trader reads it beside.

      So the assertion is now behavioural: every mode's hint must be the SAME
      sentence the shell paints for that mode. Re-introducing a private table
      fails here the moment it says anything different, which is the only
      version of this rule that can catch the drift it was written after.
    */
    for (const mode of EXPERIENCE_MODES) {
      expect(html, `${mode}'s hint is not the shell's caption for ${mode}`)
        .toContain(shellEmphasis(mode).job.replace(/\.$/, ""));
    }
  });

  /**
   * THE CAPTION MAY NOT ASSERT AN EXPOSURE WM CANNOT SEE.
   *
   * OBSERVE is the mode the shell lands in before the human has declared
   * anything, and its caption is painted in the masthead of every route. It
   * read "Watch the market with no position." — a positive claim about the
   * trader's book, made by a surface that observes no book.
   *
   * `inferJobMode` was repaired for this exact sentence and `MANAGE` is the
   * control: that mode is only ever reached on an observed `AT_RISK` position,
   * so naming the open position there is backed by the evidence that selected
   * the mode. Pinned from both sides — the claim must be gone from OBSERVE,
   * and the caption must still say what the job IS.
   */
  it("the default mode's caption does not assert a flatness WM never observed", () => {
    expect(shellEmphasis("OBSERVE").job).not.toMatch(/with no position/i);
    expect(shellEmphasis("OBSERVE").job).toMatch(/watch the market/i);
    expect(shellEmphasis("MANAGE").job).toMatch(/open position/i);
  });
});

describe("ExperienceModeBar — exactly one mode is active, and it is announced", () => {
  it("marks the current mode with aria-pressed=true", () => {
    const html = render(busAt("WAIT"));
    // Screen-readers cannot see gold; aria-pressed must carry the truth
    // regardless of color. This gates §H19: state is a claim, not a
    // decoration.
    const at = html.indexOf(">WAIT<");
    const tag = html.slice(html.lastIndexOf("<button", at), at);
    expect(tag).toContain('aria-pressed="true"');
  });

  it("marks every other mode as NOT pressed — never two active at once", () => {
    const html = render(busAt("WAIT"));
    const pressed = (html.match(/aria-pressed="true"/g) || []).length;
    expect(pressed).toBe(1);
    const notPressed = (html.match(/aria-pressed="false"/g) || []).length;
    expect(notPressed).toBe(EXPERIENCE_MODES.length - 1);
  });

  it("keeps aria-pressed correct across every canon mode", () => {
    // Renaming a mode elsewhere without touching the bar would drift the
    // aria mapping. This walks the whole enum so a rename is caught.
    for (const mode of EXPERIENCE_MODES) {
      const html = render(busAt(mode));
      const at = html.indexOf(`>${mode}<`);
      const tag = html.slice(html.lastIndexOf("<button", at), at);
      expect(tag).toContain('aria-pressed="true"');
    }
  });
});

describe("ExperienceModeBar — user intent commits immediately to the shared bus", () => {
  it("switches the bus on click with source=user (bypasses hysteresis)", () => {
    // The header calls this out by name: user intent commits IMMEDIATELY,
    // bypassing hysteresis. A "propose" that waits for confirmation would
    // be a different vocabulary and the trader would be one click behind
    // the market.
    // The bus's default committed mode is OBSERVE ("watch the market with
    // no position") — a session with no user intent yet must not tell the
    // trader they are in PREP or WAIT, which would be an unwitnessed claim.
    const bus = new DecisionContextBus();
    expect(bus.getContext().mode).toBe("OBSERVE");
    expect(bus.getContext().source).toBe("default");
    bus.setMode("MANAGE");
    expect(bus.getContext().mode).toBe("MANAGE");
    expect(bus.getContext().source).toBe("user");
  });

  it("does not re-emit or clobber when the click matches the active mode", () => {
    // A no-op click on the already-active mode must not spuriously change
    // `since` — otherwise every hover-like re-render would relabel the
    // moment the trader entered this mode.
    const bus = new DecisionContextBus();
    bus.setMode("EXECUTE");
    const before = bus.getContext();
    bus.setMode("EXECUTE");
    const after = bus.getContext();
    expect(after.since).toBe(before.since);
  });
});

describe("ExperienceModeBar — it is a landmark, and it projects only", () => {
  it("is findable by name", () => {
    // The strip is one of the layers a Founder audit calls out in the
    // silhouette. Naming it lets that audit refer to it in code rather than
    // by pixels.
    const html = render(new DecisionContextBus());
    expect(html).toContain('aria-label="Experience mode"');
  });

  it("renders no placeholder leakage in any mode", () => {
    for (const mode of EXPERIENCE_MODES) {
      const html = render(busAt(mode));
      expect(html).not.toContain("[object Object]");
      expect(html).not.toContain("undefined");
      expect(html).not.toContain("NaN");
    }
  });
});
