import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LearningGenomeInspector } from "../LearningGenomeInspector";
import type { LearningGenome } from "@/lib/learningGenome/selectLearningGenome";
import type { DrillPrescription } from "@/lib/learningGenome/prescribeDrill";
import type { MisreadMap } from "@/lib/learningGenome/selectMisreadMap";
import type { GenomeTrend } from "@/lib/learningGenome/genomeTrend";

/**
 * ENTER MUST CHANGE WHAT THE TRADER IS LOOKING AT, NOT JUST THE BOX SIZE.
 *
 * This panel is the sixth WORKSPACE tenant, and it is the only one that
 * already owned a depth control before the grammar reached it: its body runs
 * through `<SemanticZoom>`, so `unabridged` here means STARTING DEPTH rather
 * than a cap. That distinction is the whole reason this test exists — a prop
 * that merely renamed itself and changed nothing would satisfy the Sentinel's
 * source scan (`unabridged={unabridged}` IS forwarded) and still leave ENTER
 * as a resize.
 *
 * So the assertions are on RENDERED OUTPUT: does the docked stage open on the
 * four-dimension scorecard, and does ENTER open on the whole diagnostic?
 *
 * Nothing here is hidden either way. `<SemanticZoom>` renders a tablist naming
 * every level it was handed, which the last case pins — otherwise "docked" and
 * "silently truncated" would be indistinguishable, and this repo has paid for
 * that confusion three times already.
 */

const genome = {
  perception: { score: 0.8, sample_size: 10, label: "p" },
  reasoning: { score: 0.6, sample_size: 10, label: "r" },
  process: { score: 0.4, sample_size: 10, label: "pr" },
  transfer: { score: 0.2, sample_size: 10, label: "t" },
  strongest: "PERCEPTION",
  weakest: "TRANSFER",
  headlineWeakness: "Setup recognition is not the bottleneck.",
} as unknown as LearningGenome;

const drill = {
  stage: "PRACTICE",
  dimension: "TRANSFER",
  drill: "DRILL_BODY_MARKER",
  why: "because",
} as unknown as DrillPrescription;

const misread = {
  counts: {
    MISSED_SETUP: 3,
    BROKE_PROCESS: 1,
    POOR_MANAGEMENT: 0,
    FULL_STOP_LOSS: 0,
    UNRESOLVED_PROCESS: 0,
    CLEAN: 0,
  },
  sample_size: 4,
  dominant: "MISSED_SETUP",
} as unknown as MisreadMap;

const trend = {
  perception: { direction: "STABLE" },
  reasoning: { direction: "STABLE" },
  process: { direction: "DEGRADING" },
  transfer: { direction: "IMPROVING" },
} as unknown as GenomeTrend;

const render = (unabridged?: boolean) =>
  renderToStaticMarkup(
    <LearningGenomeInspector
      genome={genome}
      drill={drill}
      misread={misread}
      trend={trend}
      {...(unabridged === undefined ? {} : { unabridged })}
    />,
  );

describe("LearningGenomeInspector opens at the depth it was asked for", () => {
  it("DOCKED: opens on the four-dimension scorecard, not the whole diagnostic", () => {
    const html = render(false);
    expect(html, "the scorecard is the docked read and must be present").toContain("Perception");
    expect(
      html,
      "the docked equipment opened straight onto the drill — there is nothing left for ENTER to reveal",
    ).not.toContain("DRILL_BODY_MARKER");
    expect(html).not.toContain("Misread Map");
  });

  it("ENTER: opens on the whole diagnostic — drill and misread map included", () => {
    const html = render(true);
    expect(html).toContain("Perception");
    expect(html, "ENTER did not reach the drill — it is only a resize").toContain(
      "DRILL_BODY_MARKER",
    );
    expect(html).toContain("Misread Map");
  });

  it("DEFAULT IS UNCHANGED BEHAVIOUR: no prop renders exactly as unabridged", () => {
    // L3 is what has always shipped, and this panel has two pre-existing
    // mounts (`/command-deck`, `/journal`). The rule for a new prop is that
    // every existing mount moves by nothing.
    expect(render(undefined)).toBe(render(true));
  });

  it("docked is a STARTING DEPTH, not a silent truncation", () => {
    // The zoom control names every level in both stages, so the trader can
    // always see that more exists and reach it. If this ever stopped being
    // true, `unabridged={false}` would become the fourth instance of the
    // silent-cap defect rather than a cure for it.
    const docked = render(false);
    expect(docked).toContain('role="tablist"');
    expect(docked).toContain('aria-label="Zoom level"');
  });
});
