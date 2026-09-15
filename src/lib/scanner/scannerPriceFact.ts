import type { ScannerQuoteQuality } from "../scannerQuoteTruth";

/**
 * scannerPriceFact — the price column on /scanner.
 *
 * ── THE DEFECT: THE PRICE INHERITED THE FRESHEST CLOTHES ON ITS ROW ──────
 *
 * Every other metric in a /scanner row went through an owner — `volumeMetricFact`,
 * `volRatioMetricFact`, `rsiMetricFact`, `changePctMetricFact` — and each one
 * carries a `title` and an `aria-label` explaining what it is and what WM does
 * not know about it. The PRICE, the largest number on the row and the only one
 * a trader would act on, went through none of them:
 *
 *     <div className="px-2 text-xs font-mono font-bold text-wm-text">
 *       ${r.price.toLocaleString("en-US",{minimumFractionDigits:2})}
 *     </div>
 *
 * No title. No aria-label. And — the part that makes it a truth defect rather
 * than an accessibility gap — `text-wm-text` UNCONDITIONALLY. Full strength.
 * The same colour and the same weight on every row in the table.
 *
 * Two cells to its left sits a badge that renders `STALE` in red, or
 * `UNAVAILABLE`, computed by `scannerQuoteTruth` from the very same evidence.
 * The scan assembles the number this way:
 *
 *     const realPrice = q?.price ?? old?.price;
 *
 * So on a STALE row the figure is a CARRIED-FORWARD value from an earlier scan
 * round that the latest refresh failed to renew — and it was painted in exactly
 * the same white as a freshly observed one. On an UNAVAILABLE row the badge
 * states there is no timestamped quote evidence at all, while the cell beside
 * it printed a confident dollar figure.
 *
 *     A CARRIED-FORWARD PRICE MAY NOT WEAR A FRESH ONE'S CLOTHES.
 *
 * This is the identical law to `chartHeaderPriceFact`'s "A BAR CLOSE MAY NEVER
 * WEAR A LIVE QUOTE'S CLOTHES", found on a third surface. COLOUR IS A CLAIM,
 * and here the colour claimed a freshness the row's own badge denied.
 *
 * ── WHAT IS DELIBERATELY *NOT* CLAIMED ───────────────────────────────────
 *
 *   - Nothing here calls any of these prices real-time. Even `DELAYED` — the
 *     BEST state this column has — only means the consolidated quote was
 *     observed this round. WM does not know how far it lags the tape.
 *   - Nothing hides a stale price or drops the row. The trader keeps the last
 *     figure WM actually saw; it is simply no longer dressed as a new one.
 *   - Nothing invents a price. A row that reaches this function without a
 *     usable positive number says so rather than printing `$NaN` or `$0.00` —
 *     a zero here would be read as a real quote, not as an absence.
 *
 * PURE — no clock, no I/O, no React.
 */

/** The ONLY thing the price cell's colour and weight may be derived from. */
export type ScannerPriceTone = "OBSERVED" | "CARRIED" | "UNEVIDENCED" | "NONE";

export interface ScannerPriceFact {
  /** Already formatted, `$` included. Never `$NaN`, never a bare glyph. */
  readonly text: string;
  /** True when WM is showing a figure it actually holds. */
  readonly measured: boolean;
  readonly tone: ScannerPriceTone;
  readonly reason: string;
}

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function scannerPriceFact(
  price: unknown,
  quality: ScannerQuoteQuality,
  symbol: string,
): ScannerPriceFact {
  if (!finite(price) || price <= 0) {
    return {
      text: "No price",
      measured: false,
      tone: "NONE",
      reason: `WM holds no usable price for ${symbol} on this scan. It is named rather than printed as $0.00 — a zero in this column would be read as a quote of zero, which is a measurement, not an absence.`,
    };
  }

  if (quality === "STALE") {
    return {
      text: money(price),
      measured: true,
      tone: "CARRIED",
      reason: `${money(price)} is the price WM last observed for ${symbol}. THE LATEST REFRESH DID NOT RETURN THIS SYMBOL, so this figure is CARRIED FORWARD from an earlier round and WM cannot say what the price is now. It is dimmed rather than removed: the last figure WM genuinely saw is worth more to the trader than a blank, but it may not wear the same colour as a freshly observed one.`,
    };
  }

  if (quality === "UNAVAILABLE") {
    return {
      text: money(price),
      measured: true,
      tone: "UNEVIDENCED",
      reason: `${money(price)} is the figure in WM's hand for ${symbol}, but NO TIMESTAMPED QUOTE EVIDENCE accompanies it, so WM cannot say when it was struck or whether it was ever refreshed. The badge on this row says the same thing in one word. WM prints the number because withholding it would hide what it holds, and marks it because an untimestamped price is not a current one.`,
    };
  }

  return {
    text: money(price),
    measured: true,
    tone: "OBSERVED",
    reason: `Consolidated quote for ${symbol} observed on this scan round. WM does NOT claim this is real-time — the badge beside it reads DELAYED for exactly that reason, and WM cannot measure how far behind the live tape it sits. This is the freshest state this column has, not a live price.`,
  };
}
