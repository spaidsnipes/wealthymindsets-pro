/**
 * SENTINEL — A READING THAT DEFERS TO THE BANNER MUST BE NAMED BY THE BANNER.
 *
 * ── THE DEFECT THIS MAKES EXTINCT ────────────────────────────────────────────
 *
 * `selectMissingTapeBanner` exists because five panels in the Smart Money
 * drawer each wrote their own paragraph about the same absent aggressor tape.
 * Five true sentences, one broken-looking product. The banner replaced them
 * with a single declaration plus a list of the readings it blocks, and each
 * of those panels was given `absenceDeclaredAbove` so it could fall silent.
 *
 * That left a JOINT, and the joint drifted. On 2026-09-17, live on NQ1! with
 * the banner shipped and working, Absorption Anatomy — a sixth reading that
 * needs exactly the same missing input — was absent from the banner's list
 * AND had never been handed the flag. So it went on rendering, a few hundred
 * pixels beneath a banner that had just said the sides are not carried:
 *
 *     AGGRESSIVE BUYS 0 · AGGRESSIVE SELLS 0 · IMBALANCE 0% "neither side"
 *     VERDICT  UNMEASURED
 *
 * Nothing failed. Every test was green, `selectMissingTapeBanner` was fully
 * covered, and the panel's own tests passed — because the banner's unit tests
 * pass their OWN fixture list, never the call site's, so no test in the repo
 * had an opinion about which readings the drawer actually declares.
 *
 * ── WHY A SOURCE SENTINEL AND NOT A RENDER TEST ──────────────────────────────
 *
 * A render test proves the panel behaves correctly WHEN GIVEN the flag. It
 * cannot notice that the seventh panel was never given it, because a panel
 * that was never wired is a panel that never appears in a test. The failure
 * mode here is an OMISSION at a wiring site, and only a check that reads the
 * wiring site can see an omission.
 *
 * ── WHAT IT ASSERTS, AND WHAT IT REFUSES TO ──────────────────────────────────
 *
 * Both directions of the joint, against one table:
 *
 *   forward   every panel handed `absenceDeclaredAbove` is named in
 *             `blockedReadings` — you cannot silence a reading the trader is
 *             never told is silenced;
 *   reverse   every reading named in `blockedReadings` is either a panel that
 *             takes the flag or an inline reading listed here with a reason —
 *             you cannot list a reading the drawer does not actually defer.
 *
 * It does NOT judge whether a given reading OUGHT to be blocked. That is a
 * market-truth question this file has no standing to answer. It only holds
 * the declaration and the deferral to each other, which is the precise thing
 * that came apart.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PANEL = join(process.cwd(), "src/components/smart-money/SmartMoneyPanel.tsx");

/**
 * Comments carry example strings — the very sentences these panels render —
 * so a naive substring scan would find the wiring in a paragraph explaining
 * why the wiring is needed, and pass on a file where it had been deleted.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Readings the banner lists that have no `absenceDeclaredAbove` prop to take,
 * each with the reason it is exempt. Adding a line here is cheap; writing the
 * reason is the point, because a reading that cannot justify its exemption is
 * usually a reading that was listed and then never actually silenced.
 */
const INLINE_READINGS: Record<string, string> = {
  "Delta domination":
    "Rendered inline in this file, not as a child component. It keeps its own " +
    "sentence deliberately — see the comment at its card — and is gated in place.",
  "Tape pressure":
    "Rendered inline in this file as part of the flow strip; it has no child " +
    "component boundary to pass a prop across.",
  "Delta bubbles by level":
    "Rendered inline. Its deferral is the ternary on `missingTape !== null` " +
    "shipped in b3ebd43e, in the same words, without a prop.",
};

/** Panel component → the exact string it must appear as in `blockedReadings`. */
const PANEL_READINGS: Record<string, string> = {
  ValueCandlePanel: "Value candle · center of gravity",
  AbsorptionAnatomyPanel: "Absorption anatomy · effort vs response",
  DeltaDivergencePanel: "Delta divergence",
  StackedImbalancePanel: "Stacked imbalance · defended levels",
};

function source(): string {
  return stripComments(readFileSync(PANEL, "utf8"));
}

/** The `blockedReadings` array literal exactly as the drawer passes it. */
function declaredReadings(src: string): string[] {
  const m = src.match(/blockedReadings:\s*\[([\s\S]*?)\]/);
  if (!m) throw new Error("SmartMoneyPanel no longer passes a blockedReadings array");
  return [...m[1]!.matchAll(/"([^"]+)"/g)].map((x) => x[1]!);
}

describe("SENTINEL — the banner's list and the panels' silence cannot drift apart", () => {
  it("every panel that takes the deferral flag is named in the banner's list", () => {
    const src = source();
    const declared = declaredReadings(src);

    for (const [component, reading] of Object.entries(PANEL_READINGS)) {
      // The component is wired with the flag...
      const block = src.match(new RegExp(`<${component}[\\s\\S]{0,600}?/>`));
      expect(block, `${component} is no longer rendered in SmartMoneyPanel`).not.toBeNull();
      expect(
        block![0],
        `${component} must defer off the banner's PRESENCE, not a re-derived boolean`,
      ).toContain("absenceDeclaredAbove={missingTape !== null}");

      // ...and the trader is told that it is.
      expect(
        declared,
        `${component} falls silent but "${reading}" is not in blockedReadings — ` +
          "the trader sees a blank reading nothing has accounted for",
      ).toContain(reading);
    }
  });

  it("every reading the banner lists is actually deferred somewhere", () => {
    const src = source();
    const declared = declaredReadings(src);
    const byPanel = new Set(Object.values(PANEL_READINGS));

    for (const reading of declared) {
      if (byPanel.has(reading)) continue;
      expect(
        Object.keys(INLINE_READINGS),
        `The banner claims "${reading}" is blocked, but no panel takes the flag ` +
          "for it and it has no entry in INLINE_READINGS explaining why. A listed " +
          "reading that still prints is the contradiction this banner exists to end.",
      ).toContain(reading);
    }
  });

  it("the absorption panel — the sixth reading — is wired, not merely listed", () => {
    // Pinned on its own because this is the one that was live-observed
    // printing AGGRESSIVE BUYS 0 under a banner that said otherwise, and a
    // table entry is easy to add without the wiring that makes it true.
    const src = source();
    expect(declaredReadings(src)).toContain("Absorption anatomy · effort vs response");
    expect(src).toMatch(
      /<AbsorptionAnatomyPanel[\s\S]{0,600}?absenceDeclaredAbove=\{missingTape !== null\}/,
    );
  });
});
