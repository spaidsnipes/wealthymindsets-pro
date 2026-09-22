/**
 * THE OWL WITH TWO CLOCKS — A COMPANION CAMERA MAY NOT WEAR A LIVE BADGE.
 *
 * ── THE DEFECT, MEASURED ON PRODUCTION ─────────────────────────────────────
 *
 * wealthymindsetspro.com/charts, BTC on a live Coinbase socket. Bar Replay
 * engaged from WORKSPACE. Sampled from the real DOM before and after the
 * click:
 *
 *   before   masthead  "LIVE — CERTIFIED QUOTE · certified realtime ·
 *                       asOf 02:25:50 ET"
 *            replay controls: none
 *   after    masthead  "LIVE — CERTIFIED QUOTE · certified realtime ·
 *                       asOf 02:25:54 ET"
 *            replay controls: bar-replay-controls ON SCREEN
 *
 *   BOTH_CLOCKS_AT_ONCE: true
 *
 * The Companion Camera Law is one sentence: "Backtest historical replay and
 * LIVE/LAST context must be impossible to confuse." A room showing replay
 * controls while certifying a realtime quote with a ticking wall clock is the
 * exact state that sentence forbids.
 *
 * ── WHY NOTHING WAS "WRONG" ────────────────────────────────────────────────
 *
 * Every input the badge graded was TRUE. The socket really was delivering
 * certified realtime prints; `source`, `quotePresent`, `connected` and
 * `lastObservedAtMs` were all accurate. The observation simply was not about
 * what was on the glass. That is why no amount of better grading could have
 * caught it, and why the cure is a PRECONDITION rather than another rung on
 * the ladder: `replayEngaged` is asked before the ladder starts, so LIVE is
 * unreachable while a companion camera drives the room rather than merely
 * outranked.
 *
 * ── WHAT THIS SENTINEL PINS ────────────────────────────────────────────────
 *
 * A MEANING, in three places, because the lie was on the glass twice:
 *
 *   1. THE COMPILER   no evidence, however perfect, reaches a LIVE reading or
 *                     a wall clock while replay is engaged.
 *   2. THE ROOM       /charts hands `replayActive` up. Without this the
 *                     compiler is correct and never hears about the camera.
 *   3. THE CHIP       MainChart's own data-truth strip READS `replayActive`.
 *                     It accepted that prop and ignored it for the whole life
 *                     of bar replay — a declaration, a default, and no use —
 *                     which is how a second contradicting clock ended up an
 *                     inch below the first. A prop that goes unread again is
 *                     this bug returning.
 *
 * NEVER DELETE THIS SENTINEL, and never weaken it to "the masthead is fine".
 * Both chips are on the same glass at the same time; correcting one of two
 * contradicting readings does not make a room impossible to confuse.
 */
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CANONICAL_FIDELITY_LABELS } from "@/lib/marketData/canonicalFidelityLabels";
import { compileFeedStanding, type FeedObservation } from "./osChrome";

const NOW = 1_800_000_000_000;

/**
 * The strongest evidence a room can possibly hand up: a certifiable provider,
 * a fresh quote, a live socket, an open session, and drawn bars.
 *
 * Built deliberately at FULL strength. A weak fixture would pass this file for
 * the wrong reason — it would fail to reach LIVE on its own merits, and the
 * replay precondition would never be the thing under test.
 */
const PERFECT_LIVE_EVIDENCE: FeedObservation = {
  source: "polygon",
  quotePresent: true,
  lastObservedAtMs: NOW - 1_000,
  connected: true,
  sessionOpen: true,
  barsPresent: true,
  replayEngaged: false,
};

const read = (rel: string): string =>
  fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("the compiler: LIVE is unreachable while a companion camera drives the room", () => {
  it("reaches LIVE — CERTIFIED QUOTE on this evidence when nothing is replaying", () => {
    // THE PREMISE OF EVERY ASSERTION BELOW. If this ever stops holding, the
    // rest of this file is vacuously green and proves nothing.
    const live = compileFeedStanding(PERFECT_LIVE_EVIDENCE, NOW);
    expect(live.label).toBe(CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE);
    expect(live.tone).toBe("LIVE");
  });

  it("refuses the LIVE label on exactly that evidence once replay is engaged", () => {
    const replayed = compileFeedStanding(
      { ...PERFECT_LIVE_EVIDENCE, replayEngaged: true },
      NOW,
    );
    expect(replayed.label).not.toBe(CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE);
    expect(replayed.tone).not.toBe("LIVE");
  });

  it("names the camera on the glass, so the reading cannot be mistaken for a live one", () => {
    const replayed = compileFeedStanding(
      { ...PERFECT_LIVE_EVIDENCE, replayEngaged: true },
      NOW,
    );
    // The canon's own word for what the camera is showing — not a new one.
    expect(replayed.label).toBe(CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED);
    // The fact the masthead was missing entirely.
    expect(replayed.detail).toContain("replay");
  });

  it("prints NO wall clock while replaying — the sharpest half of the original lie", () => {
    // `asOf 02:25:54 ET` ticking beside a bar from last Tuesday reads as a
    // fact rather than a claim. A label can be questioned; a clock cannot.
    const replayed = compileFeedStanding(
      { ...PERFECT_LIVE_EVIDENCE, replayEngaged: true },
      NOW,
    );
    expect(replayed.observedAtMs).toBeNull();
  });

  it("withholds the bars certification when replay is engaged over an empty chart", () => {
    // HISTORICAL BARS VERIFIED is still a CERTIFICATION. It may only be spoken
    // when bars were actually observed.
    const empty = compileFeedStanding(
      { ...PERFECT_LIVE_EVIDENCE, replayEngaged: true, barsPresent: false },
      NOW,
    );
    expect(empty.label).toBe("FEED UNKNOWN");
    expect(empty.established).toBe(false);
    expect(empty.observedAtMs).toBeNull();
  });

  it("cannot be talked into LIVE by ANY combination of the other fields", () => {
    // The precondition is exhaustive, not a special case. Every representable
    // shape of the surrounding evidence is enumerated and none of them reaches
    // a LIVE reading or a wall clock while the camera is on history.
    const bool = [true, false] as const;
    const tri = [true, false, null] as const;
    let checked = 0;
    for (const quotePresent of bool)
      for (const barsPresent of bool)
        for (const connected of tri)
          for (const sessionOpen of tri)
            for (const source of ["polygon", "coinbase", null] as const)
              for (const lastObservedAtMs of [NOW - 1_000, NOW - 10 * 60_000, null] as const) {
                const standing = compileFeedStanding(
                  {
                    source,
                    quotePresent,
                    lastObservedAtMs,
                    connected,
                    sessionOpen,
                    barsPresent,
                    replayEngaged: true,
                  },
                  NOW,
                );
                expect(standing.label).not.toBe(
                  CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
                );
                expect(standing.tone).not.toBe("LIVE");
                expect(standing.observedAtMs).toBeNull();
                checked += 1;
              }
    // Pinned so a future refactor that silently collapses the matrix — and
    // therefore stops testing anything — fails instead of passing quietly.
    expect(checked).toBe(2 * 2 * 3 * 3 * 3 * 3);
  });
});

describe("the wire: the room that HAS a companion camera hands it up", () => {
  /**
   * THE OWL FACING THE OTHER WAY — MEASURED ON PRODUCTION 2026-09-22.
   *
   * The first cure taught every fidelity surface to answer `replayActive`. That
   * is the wrong question. `replayActive` means "the replay panel is open";
   * the law is about which camera is DRIVING THE BARS, and today those differ:
   * bar replay is not wired, and the panel says so in its own words — "Not
   * wired to the chart yet … Nothing you see behind this panel is a replay."
   *
   * Canvas hashes sampled at t+1s / t+6s / t+11s after engaging replay showed
   * the price pane still repainting with a GROWING payload: a live socket
   * appending prints, not a camera walking history. Three surfaces were
   * certifying HISTORICAL BARS over live candles.
   *
   * "Impossible to confuse" is violated in BOTH directions. A cure that
   * installs the mirror image of a lie has not cured anything.
   */
  it("every fidelity surface answers 'is a camera driving', never 'is the panel open'", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    // THE OWNER MOVED, AND THE PIN MOVED WITH IT — STRICTLY STRONGER.
    //
    // It was declared inside ChartsDashboard for one commit. Then the equipment
    // REGISTRY needed the same answer, so that the WORKSPACE "Replay" entry can
    // disclose that it drives nothing BEFORE the trader presses it rather than
    // after — by which point an orange BAR REPLAY panel is already sitting
    // under a LIVE masthead, and "impossible to confuse" has been spent. A
    // registry with its own hardcoded `false` would have been a SECOND owner of
    // one fact: the two-headed horse rebuilt one file over.
    //
    // So this now pins three things where it used to pin one: the owner exists,
    // it is declared exactly once in the whole repo, and the room READS it
    // rather than shadowing it with a local of the same name.
    const registry = read("src/lib/workspace/roomEquipment.ts");
    expect(registry, "the single owner is not declared in the registry")
      .toContain("export const REPLAY_DRIVES_THE_CAMERA: boolean = false;");
    expect(
      src.match(/const REPLAY_DRIVES_THE_CAMERA/g) ?? [],
      "ChartsDashboard re-declares the owner locally — a local shadow is a second owner " +
        "that the registry's menu disclosure can silently drift away from",
    ).toHaveLength(0);
    expect(src, "ChartsDashboard no longer imports the single owner")
      .toContain('import { REPLAY_DRIVES_THE_CAMERA } from "@/lib/workspace/roomEquipment";');
    expect(src).toContain(
      "const cameraWalksHistory = replayActive && REPLAY_DRIVES_THE_CAMERA;",
    );
    // THE BUG ITSELF, spelled out. Not a style rule: `replayEngaged: replayActive`
    // is the exact line that put HISTORICAL BARS VERIFIED over live candles.
    expect(
      src.match(/replayEngaged: replayActive\b/g) ?? [],
      "a fidelity surface is answering the panel's open/closed state again",
    ).toHaveLength(0);
    // All three fidelity consumers on one owner: the OS masthead standing, the
    // decision spine, and MainChart's strip + live-tape overlays.
    expect(
      src.match(/replayEngaged: cameraWalksHistory/g) ?? [],
      "the masthead standing and the decision spine must read the same owner",
    ).toHaveLength(2);
    expect(src).toContain("replayActive={cameraWalksHistory}");
    // And the panel's own disclosure is fed from that owner rather than being a
    // second literal that can drift away from it.
    expect(src).toContain("chartFollowsCursor={REPLAY_DRIVES_THE_CAMERA}");
  });

  /**
   * THE CONFESSION MUST ARRIVE BEFORE THE PRESS.
   *
   * MEASURED on production 2026-09-22, deploy b1d8f2f0, AFTER the four clocks
   * were killed and the owner was corrected. Engaging Replay left three LIVE
   * readings on the glass — masthead `LIVE — CERTIFIED QUOTE` (1069,33), the
   * `● LIVE TAPE` chip (439,126) and the spine's `LIVE · asOf …` (1216,409) —
   * and every one of them was TRUE, because the bars really are live. Nothing
   * was lying. The state was still confusable: an orange BAR REPLAY panel under
   * a LIVE masthead, which the Companion Camera Law forbids by shape, not by
   * truth value.
   *
   * The remaining defect was never the labels. It is that WM Pro ships a Bar
   * Replay control which drives nothing — Wall Law 3, "the menu selects the
   * tool; the invention appears in the world", and the FORBIDDEN list's "menu
   * pretending to be an invention" verbatim.
   *
   * Until the real wire lands (frozen CanonicalBar ancestry; never a slice of
   * today's bars) the honest move is to disclose at the MENU, so the confusable
   * state is never entered unknowingly. The panel's own disclosure stays — it
   * is the second line of defence — but it is no longer the first.
   *
   * THIS IS A RATCHET, NOT A DECORATION. The disclosure is derived from the one
   * owner, so it cannot be deleted while replay is still unwired without either
   * flipping the owner (which the tests above and `barReplayDisclosure` then
   * demand MainChart actually back) or removing the branch, which fails here.
   */
  it("discloses the unwired camera at the MENU, one press before the trader can be confused", () => {
    const registry = read("src/lib/workspace/roomEquipment.ts");
    // Derived, never a second literal. A hardcoded sentence here would keep
    // confessing on the day the wire lands, which is the same defect wearing
    // the opposite sign.
    expect(registry, "the Replay entry's disclosure is not gated on the single owner")
      .toMatch(/\.\.\.\(REPLAY_DRIVES_THE_CAMERA\s*\n?\s*\?\s*null\s*\n?\s*:\s*\{\s*unbuilt:/);
    expect(registry, "the disclosure does not say what is actually untrue")
      .toContain("Not wired to the chart yet");
    // And it has to reach the glass. A registry field nothing renders is a
    // disclosure filed, not made.
    const os = read("src/components/os/WMOperatingSystem.tsx");
    expect(os, "the equipment rail never renders item.unbuilt").toContain("{item.unbuilt}");
    expect(os, "the disclosure is not machine-checkable on the rendered control")
      .toContain('data-equipment-unbuilt={item.unbuilt ? "true" : undefined}');
    // It must survive being held. The hint is swapped for "Open in this room"
    // once equipment is picked up, and the moment the panel is ON THE GLASS is
    // precisely when "this drives nothing" matters most.
    const hintSwap = os.indexOf('{open ? "Open in this room" : item.hint}');
    expect(hintSwap, "the hint swap moved; re-pin this").toBeGreaterThan(-1);
    const unbuiltAt = os.indexOf("{item.unbuilt ? (", hintSwap);
    expect(
      unbuiltAt,
      "the disclosure is inside the hint's open/closed ternary, so it disappears at " +
        "exactly the moment the trader is looking at the unwired panel",
    ).toBeGreaterThan(hintSwap);
  });

  /**
   * THE RESIDUE, MEASURED AFTER THE MASTHEAD WAS ALREADY CURED.
   *
   * Production, immediately after the compiler fix deployed. The masthead read
   * correctly — "HISTORICAL BARS VERIFIED · bar replay", no wall clock — and a
   * pulsing green "● LIVE TAPE" chip was still sitting over the replayed
   * candles at (439,126), with a "Collecting live executed trades…" banner
   * behind it on the same coordinates.
   *
   * That is this bug's third and fourth clock. Both overlays are pinned to the
   * PRICE PANE, and both describe the live tape — which keeps running while the
   * camera walks history, so neither may be made to say "no tape". What is
   * false is their SUBJECT: the counters accumulate against live bars while the
   * trader is looking at historical ones. Withheld, not falsified.
   */
  it("neither live-tape overlay may sit on the glass while the camera walks history", () => {
    const src = read("src/components/chart/MainChart.tsx");
    // Both gates, by their own anchors. Written as two assertions rather than a
    // count so a future edit that fixes one and drops the other still fails.
    expect(
      src,
      "the LIVE TAPE session chip is not gated on the camera",
    ).toContain("{footprintEnabled && !replayActive && hasRealAggressorTape(tapeSource ?? \"\") &&\n");
    expect(
      src,
      "the 'Collecting live executed trades…' banner is not gated on the camera",
    ).toContain("{footprintEnabled && !replayActive && hasRealAggressorTape(tapeSource ?? \"\") && !recentTicks");
  });

  it("the withheld tape counters are DISCLOSED, not silently dropped", () => {
    // Silence about a reading whose subject left the screen is honest. Silence
    // about the RECORDER would be a new lie in the opposite direction — the
    // trader would reasonably conclude collection stopped when replay began.
    const src = read("src/components/chart/MainChart.tsx");
    expect(src).toContain("Live tape collection continues in the background");
  });

  /**
   * THE FOURTH CLOCK, MEASURED AFTER THE FIRST THREE WERE ALREADY CURED.
   *
   * Production, with the masthead correctly reading "HISTORICAL BARS VERIFIED ·
   * bar replay" and both live-tape overlays correctly withheld, a leaf-element
   * sweep of the replayed DOM returned exactly one surviving live claim:
   *
   *   { text: "LIVE · asOf 06:43:40Z", testid: "spine-detail-drawer",
   *     box: { x: 1216, y: 409 } }
   *
   * Third owner, same single sentence of law. This is why the prop was made
   * REQUIRED rather than optional on DecisionSpineBandProps: an optional flag
   * defaults to false, and the next surface to grow a replay engine would
   * inherit the live claim in silence — which is exactly how this cell survived
   * three previous fixes to the same bug.
   */
  it("the decision spine's MARKET cell withholds the quality word AND the clock while replaying", () => {
    const src = read("src/components/experience/DecisionSpineBand.tsx");
    // REQUIRED, not optional. `readonly replayEngaged?:` would reintroduce the
    // silent default that let this clock survive.
    expect(src).toContain("readonly replayEngaged: boolean;");
    // Read, not merely declared — the exact failure mode MainChart shipped.
    expect(src).toContain("expression, replayEngaged } = props;");
    // Both withholdings in one expression, so no future edit can restore the
    // wall clock while leaving the label corrected.
    expect(src).toContain(
      "? `${CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED} · BAR REPLAY`",
    );
    expect(src).toContain(
      ": `${qualifyMarketQuality(market.quality, priceDisplay.provenance)} · ${asOfText(market.capturedAt)}`",
    );
  });

  // NOTE: the "both publications share one owner" assertion that stood here
  // named `replayActive` as that owner. It has been absorbed — and corrected —
  // into "every fidelity surface answers 'is a camera driving'" above, which
  // counts the same two publications against the owner that is actually true.
  // Two tests counting the same thing against different owners is how a room
  // ends up with a green suite and a contradiction on the glass.

  it("MainChart's data-truth strip READS replayActive — the prop may not go dead again", () => {
    const src = read("src/components/chart/MainChart.tsx");
    // Not a spelling check: this is the exact failure that shipped. The prop
    // was declared, defaulted, and never referenced anywhere in the body, so
    // the in-room chip kept pulsing LIVE through every replay.
    const uses = src.match(/replayActive/g) ?? [];
    expect(uses.length).toBeGreaterThan(2); // type decl + destructure + ≥1 real use
    expect(src).toContain("if (replayActive) {");
    // And when it does speak, it speaks the canon's vocabulary rather than a
    // dialect invented in a 9,000-line component.
    expect(src).toContain("CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED");
  });
});
