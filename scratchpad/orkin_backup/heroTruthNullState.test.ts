import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/components/command-deck/HeroTruth.tsx"),
  "utf8",
);
const src = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * HeroTruth null-state Sentinel — LIVING-PIXEL LAW.
 *
 * With no sealed canonical snapshot the strip rendered
 * "coverage 0 channels · unknowns 0". Both are fabricated zeros, and the
 * second inverts the truth: "unknowns 0" is the most reassuring number on the
 * strip and it appeared exactly when NOTHING had been resolved. No state means
 * we know nothing — it does not mean nothing is unknown.
 *
 * ── 2026-09-05 amendment: this Sentinel had pinned the defect ──────────────
 *
 * This file used to assert, verbatim:
 *
 *     expect(src).toContain('state?.session ?? "unknown"');
 *
 * The INTENT was "the session field degrades to an explicit unknown" — a
 * statement about the null branch. What it actually froze was the SOURCE of
 * the value on the non-null branch, and that source was wrong:
 * `CanonicalMarketState.session` is the STORE KEY (canonicalMarketStateStore
 * builds its key from it), so `canonicalSession()` answers "RTH" for every
 * non-crypto instrument on every day of the week, by design. Production
 * therefore printed "session RTH" on Saturday 2026-09-05, a few nodes above
 * its own scene panel reading "SESSION CLOSED — LAST VERIFIED".
 *
 * A guard written about one property became a lock on the defect sitting next
 * to it, and would have failed the correct fix. The lesson, stated so the next
 * reader can apply it elsewhere: ASSERT THE BEHAVIOUR YOU CARE ABOUT, NOT AN
 * IMPLEMENTATION STRING THAT HAPPENS TO CONTAIN IT. The null-branch intent is
 * preserved below — now expressed against the field that legitimately owns the
 * answer — and the store key is BANNED outright.
 */
describe("HeroTruth null-state honesty", () => {
  /**
   * §22 / the methodology lesson proven three times in this repo: a BAN
   * assertion made against comment-stripped source is worthless if the
   * stripper is broken or neutered — every `not.toContain` then passes
   * vacuously. This file's stripper had no proof-test at all. It does now.
   */
  it("PROOF the comment-stripper leaves this file's real code intact", () => {
    expect(src.length).toBeGreaterThan(1500);
    expect(src).toContain("export function HeroTruth");
    expect(src).toContain("QUALITY_STYLES");
    // And it genuinely strips: the banned string below appears in HeroTruth's
    // prose (explaining why it is banned) but must not survive into `src`.
    expect(raw).toContain("`state.session`");
    expect(src).not.toContain("`state.session`");
  });

  it("does not zero-fill coverage or unknowns", () => {
    expect(src).not.toContain("state?.coverage.length ?? 0");
    expect(src).not.toContain("state?.unknowns.length ?? 0");
  });

  it("degrades to an explicit unknown, matching the session field", () => {
    expect(src).toContain('state ? state.unknowns.length : "unknown"');
    expect(src).toContain('sessionPresented?.value ?? "unknown"');
  });

  it("BANS rendering the store key as a human-facing session claim", () => {
    expect(src).not.toContain("state?.session");
    expect(src).not.toContain("state.session");
  });

  it("has no fallback from the owner's answer back to the store key", () => {
    expect(src).not.toMatch(/sessionPresented[^\n]*\?\?[^\n]*state[?.]*\.session/);
  });

  it("still renders real counts when state exists", () => {
    expect(src).toContain("${state.coverage.length} channel");
  });
});
