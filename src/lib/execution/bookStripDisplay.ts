import type { BrokerBookStrip } from "./brokerReadbackStore";

/*
  WHAT THE CHART'S POSITION STRIP PRINTS — pure.

  Founder order §6 (2026-10-09): positions and working orders were visible only
  inside the trade ticket. The strip puts the broker's own readback beside the
  TRADE door, from the SAME store the ticket reads (brokerReadbackStore — one
  poll). This file only decides the words; it reads nothing.

  Rules:
   · A state with nothing to show returns null and the strip is not mounted:
     no contract for this symbol, or a strip that is not enabled.
   · UNPROTECTED is a truth word. It is its own part, flagged `truth`, so the
     component can refuse to shrink or truncate it at any width.
   · A stale readback says STALE and its as-of time, always — a position last
     read ten minutes ago must not look current.
   · A SAMPLE (proof scene) book says SAMPLE first.
   · `compact` (phone) drops the average price and the as-of time of a fresh
     read; it never drops protection, the working count, or STALE.
*/

export interface BookStripPart {
  readonly text: string;
  readonly tone: "STATE" | "RISK" | "SAFE" | "MUTED" | "WARN";
  /** Never shrunk, never truncated. */
  readonly truth?: boolean;
  /**
   * Detail a short glass may drop by CSS (the average price, a fresh as-of):
   * the same parts `compact` leaves out. Never set on a truth word.
   */
  readonly detail?: boolean;
}

export interface BookStripDisplay {
  readonly parts: readonly BookStripPart[];
  /** The whole reading in one sentence, for the control's accessible name. */
  readonly spoken: string;
}

export function bookStripDisplay(
  strip: BrokerBookStrip,
  opts: { readonly compact: boolean; readonly sample: boolean; readonly clock: (ms: number) => string },
): BookStripDisplay | null {
  if (strip.state === "NO_CONTRACT") return null;
  const parts: BookStripPart[] = [];
  if (opts.sample) parts.push({ text: "SAMPLE", tone: "WARN", truth: true });

  if (strip.state === "RESOLVING" || strip.state === "NOT_READ") {
    parts.push({ text: strip.state === "RESOLVING" ? "Naming the contract…" : "Position not read yet", tone: "MUTED" });
    return { parts, spoken: `${opts.sample ? "Sample book. " : ""}${parts[parts.length - 1].text}.` };
  }

  const working = `${strip.working} working`;
  if (strip.state === "FLAT") {
    parts.push({ text: "FLAT", tone: "STATE" });
    parts.push({ text: working, tone: strip.working > 0 ? "STATE" : "MUTED" });
  } else {
    parts.push({ text: `${strip.state} ${strip.quantity ?? "?"}`, tone: "STATE" });
    if (!opts.compact && strip.averagePrice != null) parts.push({ text: `@ ${strip.averagePrice}`, tone: "STATE", detail: true });
    if (strip.protection === "UNPROTECTED") parts.push({ text: "UNPROTECTED", tone: "RISK", truth: true });
    else if (strip.protection === "PROTECTED") parts.push({ text: "PROTECTED", tone: "SAFE" });
    parts.push({ text: working, tone: strip.working > 0 ? "STATE" : "MUTED" });
  }

  const asOf = strip.asOfMs != null ? opts.clock(strip.asOfMs) : null;
  if (strip.freshness === "STALE") {
    parts.push({ text: `STALE · as of ${asOf ?? "—"}`, tone: "WARN", truth: true });
  } else if (!opts.compact && asOf) {
    parts.push({ text: `as of ${asOf}`, tone: "MUTED", detail: true });
  }

  const contract = strip.contract ? ` on ${strip.contract}` : "";
  const spoken = `${opts.sample ? "Sample book, not your account. " : ""}Position${contract}: ${parts.filter(p => p.text !== "SAMPLE").map(p => p.text).join(", ")}.`;
  return { parts, spoken };
}
