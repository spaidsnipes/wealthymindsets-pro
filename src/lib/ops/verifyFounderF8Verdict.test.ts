/**
 * The Ticket T verifier's verdict cannot be regressed by shared-chunk noise.
 *
 * ── Why this test exists ────────────────────────────────────────────────────
 *
 * scripts/verify-founder-f8.mjs used to fail Ticket T RED because it grep'd
 * the union of all /_next/static/chunks for the July class names — and those
 * names still live legitimately in the shared bundle, because /charts (and
 * every other route) still uses MainLayout. So the probe reported RED even
 * when the Founder route rendered a pristine sanctuary.
 *
 * That is the silent-failure shape this repo exists to abolish. A CI hook
 * watching the verifier would either be ignored (noise) or would block a
 * legitimate deploy (worse). The 2026-09-13 fix moves the G12 decision to
 * a ROUTE-SCOPED STATIC HTML probe on /founder-room-sample — a page that
 * is server-rendered static, contains only the sanctuary, and has no
 * MainLayout in it. If the shell atom deploys, that page's HTML carries
 * the sanctuary strings; if the shell regresses, the HTML carries the
 * July strings. Either is unambiguous, and neither depends on what OTHER
 * routes happen to bundle.
 *
 * This test pins the discipline: the verifier must contain a
 * STATIC_SHELL_TARGET, must probe /founder-room-sample, and must NOT let
 * shared-chunk positive hits on the July class names count as RED.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SCRIPT = () => readFileSync(resolve(__dirname, "../../../scripts/verify-founder-f8.mjs"), "utf8");

describe("verify-founder-f8 keeps the route-scoped verdict honest", () => {
  it("probes /founder-room-sample as the G12 authority (not the shared bundle)", () => {
    const src = SCRIPT();
    // The static shell URL is a named constant, not an inline template, so
    // a rename here fails the test before it silently regresses on CI.
    expect(src).toContain("STATIC_SHELL_TARGET");
    expect(src).toContain("/founder-room-sample");
  });

  it("does not let shared-chunk July hits set the exit code", () => {
    // The bundle-union block that used to fail Ticket T now writes a
    // YELLOW informational chip and DOES NOT touch anyRed. If a future
    // refactor re-enables `anyRed = true` inside that block, this test
    // fails and forces a conversation about it.
    const src = SCRIPT();
    // Locate the specific block that iterates ABSENT_FROM_FOUNDER_BRANCH
    // BEFORE the static shell probe.
    const bundleAbsenceIdx = src.indexOf("Absence in the compiled bundle is NOT a Ticket T signal");
    const staticShellIdx = src.indexOf("STATIC SHELL PROBE");
    expect(bundleAbsenceIdx, "bundle-absence disclaimer missing").toBeGreaterThan(0);
    expect(staticShellIdx, "static shell probe missing").toBeGreaterThan(bundleAbsenceIdx);
    const bundleBlock = src.slice(bundleAbsenceIdx, staticShellIdx);
    // The block must not flip anyRed. The route-scoped probe below is
    // what does — and that we WANT.
    expect(bundleBlock).not.toContain("anyRed = true");
  });

  it("still fails RED if the sanctuary vanishes from the static shell HTML", () => {
    // The static-shell block must set anyRed on any missing sanctuary
    // marker. If someone weakens it to informational-only, a shell
    // regression stops being visible.
    const src = SCRIPT();
    const staticShellIdx = src.indexOf("STATIC SHELL PROBE");
    const finalVerdictIdx = src.indexOf("TICKET T LIVE = RED");
    const shellBlock = src.slice(staticShellIdx, finalVerdictIdx);
    expect(shellBlock, "static shell block does not check PRESENT_IN_BUNDLE")
      .toContain("PRESENT_IN_BUNDLE");
    expect(shellBlock, "sanctuary absence must trip anyRed").toContain("anyRed = true");
  });

  it("still fails RED if the July shell smuggles back into the static preview HTML", () => {
    const src = SCRIPT();
    const staticShellIdx = src.indexOf("STATIC SHELL PROBE");
    const finalVerdictIdx = src.indexOf("TICKET T LIVE = RED");
    const shellBlock = src.slice(staticShellIdx, finalVerdictIdx);
    expect(shellBlock, "static shell block does not check ABSENT_FROM_FOUNDER_BRANCH")
      .toContain("ABSENT_FROM_FOUNDER_BRANCH");
  });
});
