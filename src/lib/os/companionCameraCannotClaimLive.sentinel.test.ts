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
  it("/charts publishes replayEngaged from the same state its replay controls render from", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    // One boolean, one owner. If the publication ever derives the flag from
    // anything other than `replayActive`, the controls on the glass and the
    // masthead above them can drift apart again.
    expect(src).toContain("replayEngaged: replayActive");
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

  it("/charts hands the band the SAME boolean it hands the masthead", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    // Two publications, one owner. Counted so a future refactor that introduces
    // a second, separately-derived replay flag fails here rather than shipping
    // a masthead and a spine that can disagree about which camera is running.
    const published = src.match(/replayEngaged: replayActive/g) ?? [];
    expect(published.length).toBe(2); // OS standing + decisionSpineProps
  });

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
