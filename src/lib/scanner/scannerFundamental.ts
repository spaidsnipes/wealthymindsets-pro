/**
 * scannerFundamental — Mkt Cap and Float on the /scanner detail panel.
 *
 * ── DEFECT ONE: A GLYPH WAS STORED AS IF IT WERE A VALUE ─────────────────
 *
 * `fetchFmpProfiles` did not build a figure, it built a STRING, and when the
 * provider reported nothing that string was the glyph itself:
 *
 *     map.set(p.symbol, { mktcap: mc > 0 ? fmtB(mc) : "—", float: … });
 *
 * `buildResults` then tried to fall back to the previous scan:
 *
 *     float:  prf?.float  ?? old?.float  ?? "—",
 *     mktcap: prf?.mktcap ?? old?.mktcap ?? "—",
 *
 * AND THE FALLBACK COULD NEVER FIRE. `??` only steps past `null` and
 * `undefined`. `"—"` is a perfectly good string, so the glyph SATISFIED the
 * coalesce and SHADOWED a figure WM had genuinely measured moments earlier.
 * The refusal did not merely fail to inform — it DESTROYED KNOWN INFORMATION
 * on its way through. This is the `avgLoss … : 1` shape again (ff348dd), with
 * the sentinel now load-bearing in control flow rather than just printed.
 *
 * ── DEFECT TWO: THREE FACTS, ONE GLYPH ───────────────────────────────────
 *
 * `—` was simultaneously saying:
 *
 *   NOT_ASKED      WM never obtained a profile row for this symbol at all —
 *                  the request failed, or the provider omitted the symbol.
 *   NOT_REPORTED   WM has the row; the provider did not carry this figure.
 *   (and, silently, a stale-but-real number it had just thrown away.)
 *
 * These are different facts about WM's own knowledge and they now say so.
 *
 * ── WHAT IS DELIBERATELY *NOT* CLAIMED ───────────────────────────────────
 *
 * The provider writes `0` and writes nothing in the same situations, and WM
 * cannot tell the two apart from the payload. So a zero is NOT promoted to
 * "reported as zero" — it is reported as NOT_REPORTED, and the reason SAYS
 * that the provider does not distinguish them. Guessing which one it was
 * would be the original sin in a new costume.
 *
 * PURE — no clock, no I/O, no React.
 */

export type FundamentalState = "MEASURED" | "NOT_REPORTED" | "NOT_ASKED";

export interface FundamentalFigure {
  /** What the row says. Never a bare glyph. */
  readonly text: string;
  readonly state: FundamentalState;
  /** Carried on both `title` and `aria-label`. */
  readonly reason: string;
}

/** Coarse magnitude, unchanged in spirit from the original inline formatter. */
export function abbreviateMagnitude(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(0) + "M";
  return n.toLocaleString();
}

/**
 * WM HAS the provider's row for this symbol. The only question is whether the
 * row carried this figure.
 */
export function classifyReportedFundamental(
  raw: unknown,
  label: string,
  symbol: string,
): FundamentalFigure {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return {
      text: abbreviateMagnitude(raw),
      state: "MEASURED",
      reason: `${label} for ${symbol} as reported in the fundamentals profile WM retrieved. It is a provider figure, not a WM calculation, and it is not a live market observation.`,
    };
  }
  return {
    text: "Not reported",
    state: "NOT_REPORTED",
    reason: `WM retrieved the fundamentals profile for ${symbol}, and it did not carry a usable ${label.toLowerCase()}. The provider writes zero and writes nothing in the same situations, so WM will not claim this figure is zero — it will only say it was not reported.`,
  };
}

/** WM never obtained a profile row for this symbol. Not absent — unasked. */
export function unaskedFundamental(label: string, symbol: string): FundamentalFigure {
  return {
    text: "Not retrieved",
    state: "NOT_ASKED",
    reason: `WM holds no fundamentals profile for ${symbol} in this scan, so it has not yet learned the ${label.toLowerCase()} one way or the other. This is a gap in what WM asked for, not a statement about the company.`,
  };
}

/**
 * THE FIX FOR DEFECT ONE, stated as its own function so it cannot be written
 * back as a `??` chain.
 *
 * A figure WM actually measured — even on a previous scan — beats a refusal
 * from this one. Only a MEASURED value can displace another MEASURED value.
 */
export function preferKnownFundamental(
  fresh: FundamentalFigure,
  cached: FundamentalFigure | undefined,
): FundamentalFigure {
  if (fresh.state === "MEASURED") return fresh;
  if (cached && cached.state === "MEASURED") {
    return {
      text: cached.text,
      state: "MEASURED",
      reason: `${cached.reason} This value is carried over from an earlier scan in this session; the most recent profile fetch did not return it.`,
    };
  }
  return fresh;
}
