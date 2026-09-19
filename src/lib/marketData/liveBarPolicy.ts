/*
 * THE LIVE-BAR POLICY NO LONGER DECLARES ITS OWN `LiveBar` (2026-09-18).
 *
 * This is the most consequential of the six-field renames, because this module
 * is ON THE LIVE PATH: `useWebSocket` feeds every tick through
 * `applyTickToLiveBar` and stores what comes back. The hook had already dropped
 * its own copy of the shape; this removes the other half, so the producer and
 * the consumer now name one type instead of two.
 *
 * AND IT IS STILL ONLY A RENAME. This module implements a real rule — a late
 * event does not get to rewrite a bar (`LATE_EVENT_IGNORED`) — which is the
 * same instinct `truthEpoch` formalises, but it enforces that rule on a shape
 * that cannot record WHICH epoch it belongs to, WHICH symbol identity it is
 * for, or WHERE it came from. The policy is right and the type it operates on
 * cannot carry the policy's own reasoning. That is the M8 adoption half, and it
 * is not done here.
 */
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
export interface LiveBarTick {
  price: number;
  size: number;
  time: number;
}

export type LiveBarUpdate =
  | { status: "ACCEPTED"; bar: LegacyOhlcvTuple; lastEventAt: number }
  | { status: "LATE_EVENT_IGNORED"; bar: LegacyOhlcvTuple; lastEventAt: number };

/**
 * Applies an arrival to the forward-only render bar.
 *
 * This is not historical reconciliation. Events older than the last accepted
 * source time are preserved by the canonical ingress/audit path where
 * available, but they may not rewind the user-visible live bar or ticker.
 */
export function applyTickToLiveBar(
  current: LegacyOhlcvTuple | null,
  lastEventAt: number | null,
  tick: LiveBarTick,
  intervalSec: number,
): LiveBarUpdate {
  if (!Number.isFinite(tick.time) || tick.time <= 0 ||
      !Number.isFinite(tick.price) || tick.price <= 0 ||
      !Number.isFinite(tick.size) || tick.size < 0 ||
      !Number.isFinite(intervalSec) || intervalSec <= 0) {
    throw new Error("Live bar policy requires valid tick and interval inputs.");
  }

  if (current && lastEventAt != null && tick.time < lastEventAt) {
    return { status: "LATE_EVENT_IGNORED", bar: current, lastEventAt };
  }

  const barTime = Math.floor(tick.time / 1000 / intervalSec) * intervalSec;
  if (!current || barTime > current.time) {
    return {
      status: "ACCEPTED",
      bar: {
        time: barTime,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.size,
      },
      lastEventAt: tick.time,
    };
  }

  // A bar-bucket rollback is unsafe even when a legacy source did not expose
  // enough event timing to trip the monotonic timestamp check above.
  if (barTime < current.time) {
    return { status: "LATE_EVENT_IGNORED", bar: current, lastEventAt: lastEventAt ?? tick.time };
  }

  return {
    status: "ACCEPTED",
    bar: {
      ...current,
      high: Math.max(current.high, tick.price),
      low: Math.min(current.low, tick.price),
      close: tick.price,
      volume: current.volume + tick.size,
    },
    lastEventAt: tick.time,
  };
}
