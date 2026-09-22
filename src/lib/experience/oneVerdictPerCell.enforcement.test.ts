/**
 * ONE WORD, TWO MOUTHS — source-level Sentinel.
 *
 * ── The defect this stands over ──────────────────────────────────────────────
 *
 * MEASURED on the serving Cloudflare Worker, 2026-09-22, /charts?symbol=BTC&tf=5m,
 * one 1440x900 desktop viewport. The decision rail's DECISION cell read,
 * verbatim, top to bottom:
 *
 *     Decision
 *     NOT BORN
 *     No decision born yet — permission has not crossed.
 *     WAIT · 6 blockers · 2 cleared        <- CanvasSummaryPill, nested INSIDE
 *
 * and 45px directly below, at the identical x (1216), the NOW · STATE cell
 * printed `WAIT` again at 24px. `verbatimRepeat: true`.
 *
 * These were never two engines that happened to agree. `selectDecisionWhyNot`
 * takes `const verdict = oneStory.decision.value`, and DecisionSpineBand's NOW
 * cell renders `oneStory.decision.value`. ONE value from ONE compiler, painted
 * twice, the second painting nested under a label whose own answer on the line
 * above is a DIFFERENT word. Wall Law 5: the current experience must feel calm.
 *
 * ── Why a SOURCE Sentinel and not only behaviour tests ───────────────────────
 *
 * The behaviour tests in DecisionSpineBand.test.tsx and CanvasSummaryPill.test.tsx
 * prove the suppression WORKS. They cannot prove it stays HONEST, because the
 * dishonest version also passes them: a caller that hard-codes
 * `verdictOwnedBySurface={true}` while the surface prints no headline would
 * silently delete the verdict from the product entirely. The law is not "the
 * pill hides the word" — the law is:
 *
 *   THE ONLY SURFACE ALLOWED TO SAY "I OWN THE VERDICT" IS THE ONE THAT PRINTS
 *   IT, AND IT MUST SAY SO FROM THE SAME EXPRESSION IT PRINTED IT FROM.
 *
 * That is a shape law about where a value is produced. It is enforceable here
 * and nowhere else.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

/** Comments are prose; prose must not be able to satisfy a code law. */
function codeOnly(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const BAND = "src/components/experience/DecisionSpineBand.tsx";
const DASHBOARD = "src/components/chart/ChartsDashboard.tsx";

describe("one verdict per cell — the headline owner is the only one who may claim it", () => {
  it("the band computes the claim once, from the same condition that draws the headline", () => {
    const code = codeOnly(read(BAND));
    // The single named projection. Both the headline and the attachment read it.
    expect(code, "DecisionSpineBand must name the claim once").toMatch(
      /const surfaceOwnsVerdict = Boolean\(rail && nowDecision\)/,
    );
    // The headline is gated on that const — not on a re-spelled `rail && nowDecision`,
    // which is how the two would drift back apart.
    expect(code, "the NOW · STATE headline must be drawn under the same const").toMatch(
      /\{surfaceOwnsVerdict && nowDecision \?[\s\S]{0,120}?data-testid="spine-now-state"/,
    );
    // …and that same const is what is handed down.
    expect(code, "the attachment must be told the value this render computed").toMatch(
      /props\.canvasSummary\(\{\s*verdictOwnedBySurface:\s*surfaceOwnsVerdict\s*\}\)/,
    );
  });

  it("the attachment is a function, so the claim cannot be frozen into a node by a caller", () => {
    const code = codeOnly(read(BAND));
    expect(code, "canvasSummary must be a render prop taking the claim").toMatch(
      /readonly canvasSummary\?:\s*\(ctx:\s*\{\s*readonly verdictOwnedBySurface:\s*boolean;?\s*\}\)\s*=>/,
    );
  });

  it("no room asserts the claim — every writer of the prop only forwards it", () => {
    const code = codeOnly(read(DASHBOARD));
    // The literal forms are the whole attack surface: a caller deciding for
    // itself that some other component prints the verdict.
    expect(code, "a room may not declare that a surface it does not render prints the verdict")
      .not.toMatch(/verdictOwnedBySurface=\{?\s*(true|false)\s*\}?/);
    // What it MAY do is pass through the band's own answer, unmodified.
    expect(code).toMatch(/verdictOwnedBySurface=\{verdictOwnedBySurface\}/);
    expect(code).toMatch(/canvasSummary:\s*\(\{\s*verdictOwnedBySurface\s*\}/);
  });

  it("the pill keeps the verdict for anyone who cannot see the headline", () => {
    const code = codeOnly(read("src/components/experience/CanvasSummaryPill.tsx"));
    // SUPPRESSED INK, NOT SUPPRESSED TRUTH. If the glyphs go and nothing takes
    // their place in the accessible name, the duplicate was removed for sighted
    // traders by taking the fact away from everyone else.
    expect(code).toMatch(/const spokenVerdict = verdictOwnedBySurface \? ` — \$\{vm\.verdict\}` : ""/);
    const labels = code.match(/aria-label=\{`[^`]*`\}/g) ?? [];
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label, `every accessible name must carry the verdict: ${label}`).toContain("${spokenVerdict}");
    }
  });
});
