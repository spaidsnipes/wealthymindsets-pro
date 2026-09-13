/**
 * Founder Build Order §5 Step 5 — "INTENT BEFORE ORDER TYPE. Human purpose
 * first: GET ME IN NOW / WORK FOR A BETTER PRICE / …"
 *
 * A trader cannot state an intent without a decision. Before this fence, the
 * deck adopted a decision id only when one had been birthed on /charts —
 * meaning the room the Founder actually opens (`/command-deck`) could
 * render "No decision born yet" forever, no matter how many times permission
 * crossed on the SAME scene.
 *
 * Attaching the mint discipline to the deck is what makes Ticket T's
 * DECISION column real. This suite pins that the mint wire lives ON the
 * deck (not smuggled in from /charts), uses the same permissionBirth owner
 * every other route uses, and cleans up on symbol/owner change so a TSLA
 * identity cannot alias onto BTC.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DECK = () => readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");

describe("the deck births its own decision on permission crossing", () => {
  it("imports birthOnPermissionCrossing from the shared owner", () => {
    // The owner is the same one /charts uses. A second implementation would
    // be exactly the "two Decision stores" defect Founder §4 forbids.
    expect(DECK()).toContain('import { birthOnPermissionCrossing } from "@/lib/traderMemory/permissionBirth"');
    expect(DECK()).toContain('import { thisDeviceId } from "@/lib/traderMemory/deviceIdentity"');
  });

  it("reads permissionVerdict from the scene's own permission VM", () => {
    // Not a hand-rolled string. The verdict flows from the same
    // composeMarketCanvasVM output the panels below already consume, so
    // the same permission state that lights the RISK/WHY panels lights
    // the mint check — never a second computation.
    const src = DECK();
    expect(src).toContain("const permissionVerdict = permission?.verdict");
  });

  it("holds the previous verdict on a ref, not on state", () => {
    // A ref is the correct owner: a re-render must not re-fire the mint.
    // Regressing this to useState would mint on every render because
    // React would see prev change.
    const src = DECK();
    expect(src).toContain("const priorPermission = React.useRef");
  });

  it("mints and adopts on CROSSED_INTO_GRANTED, refuses everything else", () => {
    // The effect calls birthOnPermissionCrossing (which internally
    // classifies) and only proceeds if outcome.born is true. A refusal
    // sets the ABSENCE sentence — a blank id would mean "sort of has a
    // decision", the worst possible middle state.
    const src = DECK();
    expect(src).toMatch(/const outcome = birthOnPermissionCrossing\(/);
    expect(src).toContain("if (!outcome.born) return;");
    expect(src).toContain("setSceneDecisionAbsence(`Decision not minted:");
    expect(src).toContain("setSceneDecision((current) => adoptSceneDecision(current, candidate))");
  });

  it("clears the decision AND resets the prior ref when the room changes", () => {
    // A TSLA decision must not follow the trader to BTC. Both pieces of
    // state (sceneDecision AND priorPermission) reset together — if only
    // one clears, the next TSLA re-entry would either lose the id
    // silently or fail to mint a new one.
    const src = DECK();
    const cleanupIdx = src.indexOf("setSceneDecision(null);");
    expect(cleanupIdx).toBeGreaterThan(0);
    // The same effect that clears sceneDecision must clear the ref.
    const cleanupBlock = src.slice(cleanupIdx, cleanupIdx + 400);
    expect(cleanupBlock).toContain("priorPermission.current = null");
    expect(cleanupBlock).toContain('setSceneDecisionAbsence("No decision born yet on this scene');
  });

  it("the SpineBand reads decisionId from the born scene, absence from state", () => {
    // Hard-coding the absence string beside a live decisionId would let
    // the two disagree — "No decision born yet" beside `dec_abc123` is
    // exactly the CROSS_WIRED shape the Founder is fencing against.
    const src = DECK();
    const bandStart = src.indexOf("<DecisionSpineBand");
    const bandEnd = src.indexOf("/>", bandStart);
    const block = src.slice(bandStart, bandEnd);
    expect(block).toContain("decisionId={currentSceneDecision?.decisionId ?? null}");
    expect(block).toContain("decisionIdAbsence={sceneDecisionAbsence}");
  });
});
