import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(__dirname, "../app/command-deck/page.tsx"), "utf8");
const dlar = readFileSync(resolve(__dirname, "../components/command-deck/DLARStrip.tsx"), "utf8");
const realms = readFileSync(resolve(__dirname, "../components/brand/RealmGateway.tsx"), "utf8");

describe("Command Deck header responsive contract", () => {
  /**
   * Founder audit 2026-09-13 — G12 hardened. Every assertion in this file
   * was written when the deck rendered its OWN sub-header (Charts / Command
   * Deck / Why? / Growth / Journal) and its OWN ExperienceModeBar inside
   * the sanctuary — three horizontal navigation stripes above MARKET.
   *
   * The sanctuary shell (WMExperienceShell) already owns brand identity,
   * the seven-mode bar, and the one-line job caption. Duplicating any of
   * them on the deck reads as July. The deck's only top-of-scene
   * contribution is the italic question and the read-only suggestion
   * chip. This describe block now fences the ABSENCE of every July stripe.
   */
  it("does not re-render the shell's brand identity as a Command Deck header", () => {
    // The shell owns the wordmark and the Command Deck route label doesn't
    // need to shout its own name — the mode bar already says OBSERVE / WAIT
    // / EXECUTE etc. Any local <h1>Command Deck</h1> is a July echo.
    expect(page).not.toContain('import WmWordmark from "@/components/brand/WmWordmark"');
    expect(page).not.toContain('subtitle="COMMAND CENTER"');
    expect(page).not.toMatch(/>\s*Command Deck\s*<\/h1>/);
    expect(page).not.toContain('className="wm-cd-header-identity"');
  });

  it("has no wm-cd-header stripe, no wm-cd-header-actions, no wm-cd-header-action buttons", () => {
    // The nav actions (Why? / Growth / Journal / Back-to-Charts) are all
    // reachable from INSIDE the composed scene (WHY inspector, WHY panel,
    // Growth link on profile, Journal link on LEARN affordance). A sub-nav
    // stripe on the deck's own body is exactly the "card → card → card"
    // silhouette the Founder brief was written to abolish.
    expect(page).not.toContain('className="wm-cd-header"');
    expect(page).not.toContain('className="wm-cd-header-actions"');
    expect(page).not.toContain('className="wm-cd-header-action"');
  });

  it("does not mount a second ExperienceModeBar", () => {
    // The shell already renders the bar. A second one on the deck was
    // producing two identical seven-mode strips one above the other,
    // which the founder-video audit flagged as "new information inside
    // old composition."
    expect(page).not.toContain("<ExperienceModeBar");
    expect(page).not.toContain('from "@/components/experience/ExperienceModeBar"');
  });

  it("does not re-render the shell's one-line job caption inside the deck", () => {
    // WMExperienceShell renders shellEmphasis(mode).job once, in ivory,
    // beneath the mode bar. The deck must not print the same string again
    // beside its own italic question.
    expect(page).not.toContain("{experienceEmphasis.job}");
  });

  it("lets dense evidence and realm grids reflow without phone overflow", () => {
    expect(dlar).toContain('gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))"');
    expect(realms).toContain('gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))"');
    expect(dlar).toContain("minWidth: 0");
    expect(realms).toContain("minWidth: 0");
  });
});
