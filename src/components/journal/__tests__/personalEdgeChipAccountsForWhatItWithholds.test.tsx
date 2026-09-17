import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PersonalEdgeChip from "../PersonalEdgeChip";
import type { PersonalEdgeVM } from "@/lib/traderMemory/viewModels/selectPersonalEdge";

/**
 * A CAP THAT IS NOT ACCOUNTED FOR IS A CLAIM THE TRADER CANNOT AUDIT.
 *
 * `selectPersonalEdge` returns up to `topN` buckets per side (default 3). This
 * chip rendered `topStrengths[0]` and `topWatch[0]` and said nothing at all
 * about the rest. "Here is your worst context" and "here is the worst of
 * three, and there are two more you are not seeing" are materially different
 * sentences, and only the first was being shown.
 *
 * This is a BEHAVIOURAL test rather than a source scan, because the defect was
 * never visible in the shape of the code — `slice(0, 1)` looks like a layout
 * decision. It is only wrong in the rendered output, so that is where it is
 * pinned.
 *
 * The rule proven here is the same one `MirrorPanel` and `DecisionChainPanel`
 * carry: docked ACCOUNTS for the remainder, ENTER uncaps it, and the default
 * leaves every pre-existing mount exactly as the trader last saw it.
 */

function bucket(label: string, avgRealizedR: number, sampleCount: number) {
  return { label, avgRealizedR, sampleCount, winRate: 0.5, processAdherence: 3 };
}

function vmWith(strengths: number, watches: number): PersonalEdgeVM {
  return {
    resolution: "RESOLVED",
    ownerId: "owner-1",
    evaluatedAt: 0,
    totalDecisions: 30,
    reviewedCount: 30,
    closedCount: 30,
    overallWinRate: 0.5,
    overallAvgR: 0.4,
    overallProcessAdherence: 3,
    topStrengths: Array.from({ length: strengths }, (_, i) => bucket(`S${i}`, 1 + i, 6)),
    topWatch: Array.from({ length: watches }, (_, i) => bucket(`W${i}`, -1 - i, 6)),
    sampleThreshold: 5,
    headline: "headline",
  } as unknown as PersonalEdgeVM;
}

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("PersonalEdgeChip accounts for the contexts it does not show", () => {
  it("DOCKED: shows one per side and NAMES the number withheld", () => {
    const html = render(<PersonalEdgeChip vm={vmWith(3, 3)} />);
    expect(html).toContain("S0");
    expect(html).toContain("W0");
    // The four it withheld are not rendered…
    expect(html).not.toContain("S1");
    expect(html).not.toContain("W2");
    // …and it says so, with the count, rather than dropping them in silence.
    expect(html).toContain("4 more contexts not shown here");
    expect(html).toContain('data-personal-edge-buckets-withheld="4"');
  });

  it("ENTER: uncaps, and then there is nothing left to account for", () => {
    const html = render(<PersonalEdgeChip vm={vmWith(3, 3)} unabridged />);
    for (const label of ["S0", "S1", "S2", "W0", "W1", "W2"]) {
      expect(html, `${label} is missing from the uncapped chip`).toContain(label);
    }
    expect(
      html,
      "the uncapped chip still claims to be withholding something — the cap did not lift",
    ).not.toContain("data-personal-edge-buckets-withheld");
  });

  it("the accounting chip does not appear when nothing is actually withheld", () => {
    // Otherwise "0 more contexts" would be its own small lie.
    const html = render(<PersonalEdgeChip vm={vmWith(1, 1)} />);
    expect(html).toContain("S0");
    expect(html).toContain("W0");
    expect(html).not.toContain("data-personal-edge-buckets-withheld");
    expect(html).not.toContain("not shown here");
  });

  it("singular is singular — one withheld context does not read '1 contexts'", () => {
    const html = render(<PersonalEdgeChip vm={vmWith(2, 1)} />);
    expect(html).toContain("1 more context not shown here");
  });

  it("DEFAULT IS UNCHANGED BEHAVIOUR: no prop renders exactly as unabridged={false}", () => {
    // The whole rule for this prop is that existing mounts move by nothing.
    // `/command-deck` and `/journal` both mount it without the prop.
    const vm = vmWith(3, 2);
    expect(render(<PersonalEdgeChip vm={vm} />)).toBe(
      render(<PersonalEdgeChip vm={vm} unabridged={false} />),
    );
  });

  it("still renders NOTHING when there is genuinely no record", () => {
    // The ungating of the cap must not turn an empty edge into a visible frame.
    const empty = { ...vmWith(0, 0), resolution: "UNKNOWN", totalDecisions: 0 } as PersonalEdgeVM;
    expect(render(<PersonalEdgeChip vm={empty} />)).toBe("");
  });
});
