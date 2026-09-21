/**
 * THE RELAY'S HONEST ACCOUNT OF ITS OWN CONNECTION.
 *
 * Cloudflare evicts a Durable Object holding an OUTBOUND WebSocket after about
 * fifteen minutes, and hibernation does not apply to outbound connections —
 * it is supported only when a DO acts as a WebSocket *server*. So the relay
 * that holds tastytrade's DXLink socket WILL be torn down and rebuilt on
 * roughly a fifteen-minute cadence, forever, on this host. That is measured,
 * not feared: docs/operations/EVIDENCE_2026-09-21_STREAMING_HOST_FEASIBILITY.md.
 *
 * ── WHY A "GENERATION" AND NOT A RECONNECT COUNTER ──────────────────────────
 *
 * A counter would let the relay say "we reconnected 4 times." That is trivia.
 * What a trader needs is a different sentence: *which bars did we actually
 * watch end to end, and which did we join halfway through.* Those are facts
 * about a SPAN of observation, so a span is the thing this module models.
 *
 * One generation = one unbroken stretch of upstream connection. Bars are
 * aggregated WITHIN a generation, never across one, because a bar assembled
 * from two sides of a gap is not an observation — it is two observations
 * stapled together and presented as one.
 *
 * ── THE REFUSAL AT THE CENTRE OF THIS FILE ──────────────────────────────────
 *
 * `gapMs` is the length of the hole between two generations, and this module
 * will not guess what happened inside it. It does not backfill, does not
 * interpolate, does not carry the last price forward across the seam. The
 * market kept trading and WM Pro was not watching; the honest report of that
 * is a stated gap, not a smooth line.
 *
 * This module opens no socket, reads no secret, and imports only the bar
 * artery — so every claim it makes is testable on a laptop with no credentials.
 */

import { aggregateCandles, type AggregateWindow, type DxlinkCandleResult, type ObservedTrade } from "./dxlinkProtocol";

/** Why a generation ended. Named, because the four are not the same event. */
export const GENERATION_END_REASONS = {
  /** Cloudflare's ~15-minute outbound-socket eviction. Expected, not a fault. */
  HOST_EVICTION: "HOST_EVICTION",
  /** The upstream closed or errored. tastytrade's end, or the network's. */
  UPSTREAM_CLOSED: "UPSTREAM_CLOSED",
  /** WM Pro closed it on purpose — last viewer left, or symbols changed. */
  RELAY_CLOSED: "RELAY_CLOSED",
  /** Still open. Not an ending; the absence of one. */
  OPEN: "OPEN",
} as const;

export type GenerationEndReason =
  (typeof GENERATION_END_REASONS)[keyof typeof GENERATION_END_REASONS];

export interface RelayGeneration {
  /** 1-based. The first connection of a relay's life is generation 1. */
  readonly generation: number;
  /** When upstream became usable — AFTER auth, not when the socket opened.
   *  A socket that is connected but unauthorised has observed nothing. */
  readonly observingSinceMs: number;
  /** When observation stopped. Absent while still connected. */
  readonly observingUntilMs?: number;
  readonly endReason: GenerationEndReason;
  /** Milliseconds between the PREVIOUS generation ending and this one starting.
   *  0 for the first generation — there was no hole before it, and reporting
   *  one would invent a gap out of the relay's own birth. */
  readonly gapBeforeMs: number;
}

/**
 * The relay's whole connection history, as a value.
 *
 * Deliberately a plain readonly array rather than a class with a mutating
 * `push`: the Durable Object storing this needs to serialise it across an
 * eviction it cannot predict, and a value survives that trip where object
 * identity does not.
 */
export interface RelayHistory {
  readonly generations: readonly RelayGeneration[];
}

export const EMPTY_RELAY_HISTORY: RelayHistory = { generations: [] };

/** The generation currently observing, if any. */
export function currentGeneration(history: RelayHistory): RelayGeneration | null {
  const last = history.generations[history.generations.length - 1];
  if (!last) return null;
  return last.endReason === GENERATION_END_REASONS.OPEN ? last : null;
}

/**
 * Open a new generation at `atMs`.
 *
 * REFUSES to open one while another is still open. Two concurrent generations
 * would mean two upstream sockets on one entitlement, and — worse — bars
 * aggregated against whichever window was consulted last. The relay may hold
 * exactly one upstream connection, and this is where that is enforced rather
 * than assumed.
 */
export function beginGeneration(history: RelayHistory, atMs: number): RelayHistory {
  if (!Number.isFinite(atMs)) {
    throw new Error("a generation cannot begin at a non-finite time");
  }
  const open = currentGeneration(history);
  if (open) {
    throw new Error(
      `generation ${open.generation} is still open. The relay holds ONE upstream `
      + "socket; close the current generation before opening another.",
    );
  }
  const previous = history.generations[history.generations.length - 1];
  // No previous generation means no hole before this one. A relay's birth is
  // not a gap in coverage, and reporting it as one would manufacture a defect.
  const gapBeforeMs = previous?.observingUntilMs === undefined
    ? 0
    : Math.max(0, atMs - previous.observingUntilMs);

  return {
    generations: [
      ...history.generations,
      {
        generation: history.generations.length + 1,
        observingSinceMs: atMs,
        endReason: GENERATION_END_REASONS.OPEN,
        gapBeforeMs,
      },
    ],
  };
}

/**
 * Close the open generation.
 *
 * `OPEN` is rejected as an end reason. "This ended because it did not end" is
 * not a state, and allowing it would let a caller close a generation while
 * leaving `currentGeneration` still returning it — a relay that believes it is
 * both connected and disconnected.
 */
export function endGeneration(
  history: RelayHistory,
  atMs: number,
  endReason: GenerationEndReason,
): RelayHistory {
  if (endReason === GENERATION_END_REASONS.OPEN) {
    throw new Error("OPEN is not an ending. Name why observation stopped.");
  }
  const open = currentGeneration(history);
  if (!open) {
    throw new Error("no generation is open, so none can be ended.");
  }
  // Time cannot run backwards inside one generation. Clamping instead of
  // throwing, because the relay must keep serving through a clock skew rather
  // than crash on one — but never to a NEGATIVE span, which would make a
  // window look covered that was not.
  const until = Math.max(atMs, open.observingSinceMs);
  return {
    generations: [
      ...history.generations.slice(0, -1),
      { ...open, observingUntilMs: until, endReason },
    ],
  };
}

/** The window to hand `aggregateCandles` for the generation that is running. */
export function generationWindow(
  generation: RelayGeneration,
  receivedAt: number,
): AggregateWindow {
  return {
    observingSinceMs: generation.observingSinceMs,
    observingUntilMs: generation.observingUntilMs,
    receivedAt,
    // The generation number IS the truth epoch. A bar for 09:31:00 built on
    // generation 3 and a bar for the same instant rebuilt on generation 4 are
    // DIFFERENT FACTS — the second saw a different slice of the window — and
    // `mintBarId` folds truthEpoch into the id so the chart can hold both
    // rather than one silently overwriting the other between renders.
    truthEpoch: generation.generation,
  };
}

/**
 * Aggregate one generation's trades, using that generation's own window.
 *
 * The signature takes a generation rather than a window ON PURPOSE. Passing a
 * bare window is how a caller ends up aggregating generation 4's trades against
 * generation 3's span — which would stamp FULL coverage on bars nobody watched.
 */
export function aggregateGeneration(
  generation: RelayGeneration,
  trades: readonly ObservedTrade[],
  receivedAt: number,
  periodSeconds?: number,
): DxlinkCandleResult {
  return aggregateCandles(trades, generationWindow(generation, receivedAt), periodSeconds);
}

/**
 * What the relay is willing to SAY about its own coverage, in plain words.
 *
 * This is the sentence a surface prints. It exists as a pure function, beside
 * the state it describes, because the alternative — a component assembling this
 * sentence out of the fields — is how a UI ends up claiming a continuity the
 * data never had.
 */
export function describeCoverage(history: RelayHistory, nowMs: number): string {
  const gens = history.generations;
  if (gens.length === 0) {
    return "Not connected. WM Pro has observed no trades on this stream.";
  }
  const open = currentGeneration(history);
  const seams = gens.length - 1;
  const lostMs = gens.reduce((sum, g) => sum + g.gapBeforeMs, 0);

  if (!open) {
    const last = gens[gens.length - 1];
    return (
      `Not connected. Observation stopped ${seconds(nowMs - (last.observingUntilMs ?? nowMs))} ago `
      + `(${last.endReason}). Bars after that point were not watched and are not drawn.`
    );
  }

  const watched = seconds(nowMs - open.observingSinceMs);
  if (seams === 0) {
    return `Watching continuously for ${watched}. No gaps on this stream.`;
  }
  return (
    `Watching for ${watched} since the last reconnect. `
    + `${seams} ${seams === 1 ? "seam" : "seams"} so far, `
    + `${seconds(lostMs)} unwatched in total. `
    + "Bars spanning a seam are marked PARTIAL rather than drawn as whole."
  );
}

/** Whole seconds, floored, with a unit. Never a bare number a reader must guess. */
function seconds(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}
