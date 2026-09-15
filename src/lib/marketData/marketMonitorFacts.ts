/**
 * marketMonitorFacts — the "Live market monitor" block on /ai-bot.
 *
 * Same chain as pnlStatsFacts / tradeRowFacts / scannerMetricFacts. This page
 * is titled "Market Intelligence" and subtitled "Observed market data only ·
 * no generated signals", which raises the bar rather than lowering it: a page
 * that advertises observation owes the reader an account of what it did NOT
 * observe.
 *
 * ── DEFECT ONE: ONE BOOLEAN, FOUR VOCABULARIES, ONE SCREEN ───────────────
 *
 * A single `connected` gated four renderings within forty lines:
 *
 *     header badge : "Real data unavailable"
 *     price        : "—"                       ← 3xl, font-black
 *     Connection   : "Unavailable"
 *     Latency      : "—"
 *
 * Two words and two glyphs for ONE fact, and the two glyphs are the ones that
 * explain nothing. The largest number on the page — the headline of a monitor —
 * was a dash with no title and no aria-label.
 *
 * ── DEFECT TWO: THREE REFUSALS WEARING ONE `false` ───────────────────────
 *
 *     const connected =
 *       market.connected && price > 0 && market.source !== "unavailable";
 *
 * One `&&` chain hiding three different situations:
 *
 *   1. TRANSPORT_DOWN      — WM's socket is not up. WM cannot hear anything.
 *   2. PROVIDER_DISOWNED   — the socket is up and the PROVIDER has said it has
 *                            nothing for this symbol. Waiting will not fix it.
 *   3. AWAITING_FIRST_PRINT— the socket is up, the provider is live, and no
 *                            trade has priced this symbol YET. This one
 *                            resolves itself on the next tick.
 *
 * Only (3) is a matter of patience, and the old rendering gave the trader no
 * way to tell it from (1). A dash cannot be acted on; these can.
 *
 * ── DEFECT THREE: `price > 0` IS NOT `isFinite` ──────────────────────────
 *
 * `price` arrives from the socket hook untyped by any runtime check.
 * `NaN > 0` is false, so a corrupt tick fell into the same bucket as a healthy
 * socket that has simply not printed yet — accidentally safe, and still a lie
 * about WHICH thing happened. A non-numeric price is a fault in the FEED, not
 * an absence of trading, and it is named separately here.
 *
 * `dp` (decimal places) was also derived from the same unvalidated `price`
 * OUTSIDE the guard. That derivation now happens only where the price is known
 * to be finite.
 *
 * ── WHAT IS DELIBERATELY *NOT* CLAIMED ───────────────────────────────────
 *
 * Nothing here reports a last-known price when the link is down. A stale
 * figure under a heading that says "Live market monitor" is worse than the
 * dash it replaces — the dash at least admits it knows nothing.
 *
 * The trade tape and the price feed are DIFFERENT feeds on this hook, so the
 * absence of one is not evidence about the other and the tape's sentence says
 * so out loud.
 *
 * PURE — no clock, no I/O, no React.
 */

export type MonitorLinkState =
  /** A finite, positive price from a provider that owns it. */
  | "OBSERVED"
  /** WM's socket is not up. WM cannot hear anything at all. */
  | "TRANSPORT_DOWN"
  /** The socket is up; the provider says it has nothing for this symbol. */
  | "PROVIDER_DISOWNED"
  /** The feed delivered a value that is not a usable price. A FEED fault. */
  | "PRICE_NOT_NUMERIC"
  /** Everything is up and no trade has priced this symbol yet. */
  | "AWAITING_FIRST_PRINT";

export interface MonitorFact {
  /** What the cell says. Never a bare glyph. */
  readonly text: string;
  readonly state: MonitorLinkState;
  /** True only when this cell is a reading. Drives colour and size. */
  readonly measured: boolean;
  /** Carried on both `title` and `aria-label`. */
  readonly reason: string;
}

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * THE FIX FOR DEFECTS TWO AND THREE — the `&&` chain becomes a named state.
 *
 * Order is deliberate and is asserted by the Sentinel: the most fundamental
 * failure wins, because a socket that is down cannot also be "waiting for a
 * print". Reporting patience while the transport is dead is the worse lie.
 */
export function classifyMonitorLink(input: {
  transportConnected: boolean;
  price: unknown;
  source: string | null | undefined;
}): MonitorLinkState {
  if (!input.transportConnected) return "TRANSPORT_DOWN";
  if (!input.source || input.source === "unavailable") return "PROVIDER_DISOWNED";
  if (input.price != null && !finite(input.price)) return "PRICE_NOT_NUMERIC";
  if (!finite(input.price) || input.price <= 0) return "AWAITING_FIRST_PRINT";
  return "OBSERVED";
}

/**
 * The refusal sentence for a state, in the SAME vocabulary every cell uses.
 *
 * A TOTAL switch with no `default`: a sixth MonitorLinkState cannot be added
 * without giving it a sentence, because the function would stop compiling.
 * That is the point — a new state must not be able to inherit someone else's
 * explanation by falling through.
 */
export function monitorLinkReason(state: MonitorLinkState, symbol: string): string {
  switch (state) {
    case "OBSERVED":
      return `WM's market socket is up and a provider is reporting trades in ${symbol}.`;
    case "TRANSPORT_DOWN":
      return `WM's market socket is not connected, so WM is not receiving anything for ${symbol} from any provider. This is WM's link being down, not a statement about whether ${symbol} is trading — WM has no way to know that right now.`;
    case "PROVIDER_DISOWNED":
      return `WM's socket is up, but the data provider has disowned ${symbol} — it is reporting that it has no feed for this instrument. Waiting will not resolve this on its own the way an unprinted symbol would; the provider has already answered.`;
    case "PRICE_NOT_NUMERIC":
      return `The feed delivered a value for ${symbol} that is not a usable price. This is a fault in the data arriving, not an absence of trading, and WM is naming it as such rather than formatting it or treating it as a quiet zero.`;
    case "AWAITING_FIRST_PRINT":
      return `WM's socket is up and the provider is live, but no trade has priced ${symbol} yet in this session. This is the one refusal here that resolves itself: the next print fills it in. WM will not show a last-known price under a live monitor.`;
  }
}

/** The headline number. Was `"—"` at 3xl font-black with no tooltip. */
export function monitorPriceFact(
  state: MonitorLinkState,
  price: unknown,
  symbol: string,
): MonitorFact {
  if (state === "OBSERVED" && finite(price)) {
    // Decimal places are derived HERE, where the price is known to be finite —
    // the old `dp` read the same unvalidated number outside the guard.
    const dp = price >= 100 ? 2 : price >= 1 ? 4 : 6;
    return {
      text: price.toFixed(dp),
      state,
      measured: true,
      reason: `Last observed trade price for ${symbol}. ${monitorLinkReason(state, symbol)} WM is repeating what the provider reported; it is not modelling or smoothing it.`,
    };
  }
  return {
    text: "No live price",
    state,
    measured: false,
    reason: monitorLinkReason(state, symbol),
  };
}

/** Was `connected ? \`${market.latency} ms\` : "—"` beside a tile saying "Unavailable". */
export function monitorLatencyFact(
  state: MonitorLinkState,
  latencyMs: unknown,
  symbol: string,
): MonitorFact {
  if (state === "OBSERVED" && finite(latencyMs) && latencyMs >= 0) {
    return {
      text: `${Math.round(latencyMs)} ms`,
      state,
      measured: true,
      reason: `Round-trip latency WM measured on its own socket while receiving ${symbol}. This describes WM's link to the provider, not the provider's distance from the exchange, so it is a floor on delay and not the whole of it.`,
    };
  }
  if (state === "OBSERVED") {
    return {
      text: "Not measured",
      state,
      measured: false,
      reason: `The socket is up and ${symbol} is printing, but WM has not recorded a usable round-trip latency for this link yet. WM will not print a zero here: zero milliseconds would be a claim of an instantaneous link.`,
    };
  }
  return {
    text: "No link to measure",
    state,
    measured: false,
    reason: `Latency describes a working socket, and there is not one to measure. ${monitorLinkReason(state, symbol)}`,
  };
}

/** The Connection tile — the one cell that already used words. Now it uses the SAME words. */
export function monitorConnectionFact(
  state: MonitorLinkState,
  source: string | null | undefined,
  symbol: string,
): MonitorFact {
  if (state === "OBSERVED") {
    return {
      text: `Observed · ${source}`,
      state,
      measured: true,
      reason: monitorLinkReason(state, symbol),
    };
  }
  const label: Record<Exclude<MonitorLinkState, "OBSERVED">, string> = {
    TRANSPORT_DOWN: "Socket down",
    PROVIDER_DISOWNED: "Provider has no feed",
    PRICE_NOT_NUMERIC: "Feed fault",
    AWAITING_FIRST_PRINT: "Awaiting first print",
  };
  return {
    text: label[state],
    state,
    measured: false,
    reason: monitorLinkReason(state, symbol),
  };
}

/**
 * The Price feed tile — WHICH provider the quote above came from.
 *
 * This is its own owner rather than a reshaped copy of monitorConnectionFact,
 * because an inline `{...fact, text: something}` beside an owner is a second
 * source of truth: the day the connection sentence changes, the reshaped copy
 * silently stops agreeing with it.
 */
export function monitorSourceFact(
  state: MonitorLinkState,
  source: string | null | undefined,
  symbol: string,
): MonitorFact {
  if (state === "OBSERVED" && typeof source === "string" && source.trim().length > 0) {
    return {
      text: source.toUpperCase(),
      state,
      measured: true,
      reason: `The ${symbol} quote above is coming from ${source}. WM names the provider rather than presenting the price as its own observation of the exchange.`,
    };
  }
  return {
    text: "No price provider",
    state,
    measured: false,
    reason: `No provider is currently supplying a ${symbol} quote to this monitor. ${monitorLinkReason(state, symbol)}`,
  };
}

/**
 * The session-change cell — FOUND BY USE, NOT BY READING.
 *
 * A live DOM read of the deployed /ai-bot showed two survivors inside the very
 * block this file rewrote. This is one of them:
 *
 *     {connected && tickerChange.displayable
 *       ? `${…}${tickerChange.changePct.toFixed(2)}%`
 *       : "Unavailable"}
 *
 * ONE word over TWO independent conditions:
 *
 *   - the monitor link is down, so no price is arriving at all; or
 *   - the link is fine, the symbol is printing, and WM has no REFERENCE CLOSE
 *     to measure today's move against.
 *
 * Those have different causes and different cures, and the second one is not a
 * failure of the price feed at all — it is a percentage missing its second
 * number. Rendering both as "Unavailable" left the word sitting one line under
 * "No live price", so the same screen described its one broken link in two
 * vocabularies again — the exact defect the rest of this file exists to fix.
 *
 * `state` here describes the LINK; `measured` describes THIS CELL. They can
 * legitimately disagree, the same way monitorLatencyFact's "Not measured" does.
 */
export function monitorChangeFact(
  state: MonitorLinkState,
  change: { displayable: boolean; changePct: unknown; direction: "up" | "down" | "flat" },
  symbol: string,
): MonitorFact {
  if (state !== "OBSERVED") {
    return {
      text: "No session change",
      state,
      measured: false,
      reason: `Session change is measured on the same link that carries the price, and that link is not delivering. ${monitorLinkReason(state, symbol)}`,
    };
  }
  if (!change.displayable || !finite(change.changePct)) {
    return {
      text: "No reference close",
      state,
      measured: false,
      reason: `WM's socket is up and ${symbol} is printing, but WM has not received a reference close to measure today's move against. This is a SEPARATE gap from the quoted price above, which is live: a percentage needs two numbers and WM has one. WM will not print 0.00% here — a zero with no reference close is not "flat", it is unknown.`,
    };
  }
  return {
    text: `${change.direction === "up" ? "+" : ""}${change.changePct.toFixed(2)}%`,
    state,
    measured: true,
    reason: `Session change for ${symbol} against the reference close WM received on this link. WM is repeating the provider's own reference, not choosing a session boundary of its own.`,
  };
}

/**
 * The trade tape is a SEPARATE feed from the price feed on this hook.
 * `market.tapeSource?.toUpperCase() ?? "Unavailable"` said the same word the
 * price feed said, which invited the reader to conclude one from the other.
 */
export function monitorTapeFact(
  tapeSource: string | null | undefined,
  symbol: string,
): MonitorFact {
  if (typeof tapeSource === "string" && tapeSource.trim().length > 0) {
    return {
      text: tapeSource.toUpperCase(),
      state: "OBSERVED",
      measured: true,
      reason: `Per-trade tape for ${symbol} is arriving from ${tapeSource}. The tape is a different feed from the quoted price above it, so the two can be healthy independently.`,
    };
  }
  return {
    text: "No tape subscribed",
    state: "PROVIDER_DISOWNED",
    measured: false,
    reason: `WM has no per-trade tape for ${symbol} on this connection. This is a SEPARATE feed from the quoted price, so it says nothing about whether the price above is live — and a missing tape is a gap in what WM subscribes to, not evidence that ${symbol} is not trading.`,
  };
}
