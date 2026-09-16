import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const prompt = fs.readFileSync(
  path.join(process.cwd(), "src/components/pwa/InstallPrompt.tsx"),
  "utf8",
);

describe("PWA install prompt truth and accessibility", () => {
  it("describes an installable shortcut without promising unavailable capabilities", () => {
    expect(prompt).toContain("same WM Pro web app");
    expect(prompt).toContain("depend on your connection and enabled services");
    expect(prompt).toContain("Home screen shortcut");
    expect(prompt).not.toContain("full native experience");
    expect(prompt).not.toContain("no browser needed");
    expect(prompt).not.toContain("Install Now — It&apos;s Free");
    expect(prompt).not.toContain("offline charts");
    expect(prompt).not.toContain("Push alerts");
    expect(prompt).not.toContain("Zero latency");
    expect(prompt).not.toContain("Real-time data");
  });

  it("keeps the nonmodal prompt named, contained, and touch reachable", () => {
    expect(prompt).toContain('role="region"');
    expect(prompt).toContain('aria-live="polite"');
    expect(prompt).toContain('aria-labelledby="wm-install-prompt-title"');
    expect(prompt).toContain('aria-describedby="wm-install-prompt-description"');
    expect(prompt).toContain('aria-label="Dismiss install prompt"');
    // RE-ANCHORED 2026-09-08. This rule pinned the literal string
    // `w-[calc(100%-2rem)] max-w-sm` and called the result "touch reachable".
    // It was green at 375px while the dismiss button sat ENTIRELY off screen
    // (measured: card left 188, right 531, viewport 375), because the sibling
    // `-translate-x-1/2` that did the centering was silently discarded by
    // Framer. A class name cannot witness geometry.
    //
    // What is actually required is that the card be bounded by the VIEWPORT
    // without depending on a transform. Insets do that; a width plus a
    // transform does not. Real geometry is asserted by measurement, and the
    // transform-ownership rule lives in design/motionTransformOwnership.
    expect(prompt).toMatch(/inset-x-\d/);
    expect(prompt).toContain("max-w-sm");
    expect(prompt).not.toMatch(/className="[^"]*-translate-x-/);
    expect(prompt).toContain("min-h-11 min-w-11");
    expect(prompt).toContain("inline-flex min-h-11");
  });

  /**
   * ── Why a palette rule lives in the TRUTH guard ──────────────────────────
   *
   * This card floats at z-[200] over the market room. Until 2026-09-16 it wore
   * a teal/blue family (#00D4AA, #4FA3E0) that belongs to no owner in the
   * current visual canon, a full rounded box, and a coloured halo
   * (`drop-shadow(0 8px 32px rgba(0,212,170,0.25))`) — louder than every truth
   * pixel beneath it. A shortcut offer out-shouting an UNKNOWN market read is
   * not merely off-palette; it is a claim about what matters on the screen.
   *
   * ATMOSPHERE MUST NEVER OUTRUN TRUTH, so the rule is asserted against the
   * off-canon HEX VALUES rather than against a class name — a class can be
   * renamed, but reviving the colour requires writing the colour.
   */
  it("wears the sanctuary hairline grammar, not a card-museum box", () => {
    // The two off-canon accent families, in any casing or alpha suffix.
    expect(prompt).not.toMatch(/#00D4AA/i);
    expect(prompt).not.toMatch(/#4FA3E0/i);
    expect(prompt).not.toMatch(/rgba\(0,\s*212,\s*170/i);
    // No halo. A glow around a shortcut offer competes with the chart it covers.
    expect(prompt).not.toContain("drop-shadow");
    // Hairline, not full box: the panel declares edges, never a closed border.
    expect(prompt).toContain("borderLeft:");
    expect(prompt).not.toMatch(/\brounded-2xl\b/);
    // Brass is the canon accent family this surface may use.
    expect(prompt).toMatch(/rgba\(201,\s*165,\s*92/);
    // Motion stays a short tween. A spring here was the loudest thing on a
    // screen whose market state is routinely UNKNOWN.
    expect(prompt).not.toContain('type: "spring"');
  });

  it("preserves the native install event and dismissal owner", () => {
    expect(prompt).toContain('window.addEventListener("beforeinstallprompt", handler)');
    expect(prompt).toContain("deferredPrompt.prompt()");
    expect(prompt).toContain('localStorage.setItem("wm-install-dismissed", "true")');
    expect(prompt).toContain("Add to Home Screen");
  });
});
