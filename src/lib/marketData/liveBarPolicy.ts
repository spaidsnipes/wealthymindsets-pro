export interface LiveBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LiveBarTick {
  price: number;
  size: number;
  time: number;
}

export type LiveBarUpdate =
  | { status: "ACCEPTED"; bar: LiveBar; lastEventAt: number }
  | { status: "LATE_EVENT_IGNORED"; bar: LiveBar; lastEventAt: number };

/**
 * Applies an arrival to the forward-only render bar.
 *
 * This is not historical reconciliation. Events older than the last accepted
 * source time are preserved by the canonical ingress/audit path where
 * available, but they may not rewind the user-visible live bar or ticker.
 */
export function applyTickToLiveBar(
  current: LiveBar | null,
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
