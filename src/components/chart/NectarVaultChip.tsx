"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getKnownSessionSymbols,
  subscribeSessionSymbolStore,
} from "@/lib/marketData/sessionSymbolStore";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { selectEvidenceDeltaChip } from "@/lib/marketData/selectEvidenceDeltaChip";

/**
 * NectarVaultChip — visible, calm confirmation that WM is holding each
 * symbol's per-tab tape stats independently.
 *
 * Founder problem this solves (2026-08-14): "i have a grip of data that
 * needs to be saved i dont want it to go anywhere and im trying to switch
 * to tsla also but i cant now because i may loose data if i refresh".
 *
 * Renders under the main WM Nectar chip only when ≥2 symbols have been
 * observed this tab session. Each symbol pill shows its own delta / trade
 * count. Clicking a pill does NOT hijack the chart (out of scope for this
 * pass) — the pill is proof-of-safety, not a switcher.
 *
 * Persistence: reads directly from sessionSymbolStore, which is
 * localStorage-backed for the summary tier per the Founder Authority
 * Nectar Persistence doc. Raw tape is NOT stored.
 */
export function NectarVaultChip({ activeSymbol }: { activeSymbol: string }) {
  // SSR-safe mount gate — same class of hydration mismatch (React #418)
  // the HeaderVaultPill fix addressed. sessionSymbolStore hydrates from
  // localStorage on the client; SSR sees 0 symbols and returns null,
  // client sees observed symbols and renders the chip → tree shape
  // diverges. Gate on `mounted` so both SSR and initial client paint
  // agree (null), then swap in real content after mount.
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => subscribeSessionSymbolStore(() => setTick(t => t + 1)), []);
  const { setActiveSymbol } = useActiveSymbol();

  if (!mounted) return null;

  const symbols = getKnownSessionSymbols()
    .filter(s => s.slot.stats.tradeCount > 0)
    .sort((a, b) => b.slot.stats.tradeCount - a.slot.stats.tradeCount);

  // Was gated to ≥2 symbols. Founder §14 wants immediate visible proof of
  // retention — show the Vault the moment WM has observed any real trade,
  // even for a single symbol. Still hidden when nothing has been observed
  // so it never adds noise to an empty session.
  if (symbols.length === 0) return null;

  // `fmt` lived here and formatted the delta with K/M abbreviation. It is
  // GONE, not moved: selectEvidenceDeltaChip owns the delta's rendering now,
  // and a second formatter for the same number would agree with the owner only
  // until someone edited one of them.
  const nowMs = Date.now();
  const fmtMemoryAge = (startedAtSec: number): string => {
    const seconds = Math.max(0, Math.floor(nowMs / 1000 - startedAtSec));
    if (seconds < 60) return `${seconds}s observed`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m observed`;
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    if (hours < 24) return remMin ? `${hours}h ${remMin}m observed` : `${hours}h observed`;
    const days = Math.floor(hours / 24);
    return `${days}d observed`;
  };

  return (
    <details
      className="wm-nectar-vault-chip"
      style={{
        position: "absolute", top: 8, right: 8, zIndex: 57,
        pointerEvents: "auto", color: "#8B92AC", fontSize: 9.5,
        fontWeight: 700, fontVariantNumeric: "tabular-nums",
      }}
    >
      <summary
        aria-label={`Market Evidence. ${symbols.length} symbol ${symbols.length === 1 ? "summary" : "summaries"} retained in this browser. Open details.`}
        title="Open retained browser summaries"
        style={{
          minHeight: 32, padding: "0 10px", borderRadius: 8, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6, listStyle: "none",
          background: "rgba(11,14,26,0.88)", border: "1px solid rgba(139,146,172,0.18)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.24)", whiteSpace: "nowrap",
        }}
      >
        <span aria-hidden="true" style={{ color: "#00C076" }}>●</span>
        {/*
          THE NOUN IS PART OF THE COUNT.

          Measured live on /charts, NQ1! 15m, 2026-09-17, ONE viewport carrying
          THREE evidence counts at once:

              this chip     :  Evidence saved · 4
              DECISION rail :  0/8 dimensions resolved
              NEXT cell     :  the first of 9 unpaid evidence nodes

          Only one of those three is scoped to what it counts by the eye. This
          chip already holds the honest sentence — "4 symbol summaries retained
          in this browser" — but it lives in `aria-label` and `title`, so the
          scope reaches a screen reader and a hover and not a trader glancing
          at the chart. A bare 4 beside an 8 and a 9 invites the reading that
          four of the nine nodes are paid, which is not what this counts and
          not something WM knows.

          The cure is the same one `formatSpinePrice` applies one panel over:
          the qualifier travels WITH the reading. Different nouns cannot be
          mistaken for one another; bare integers can.
        */}
        <span>Evidence saved</span>
        <span style={{ color: "#62697d" }}>
          · {symbols.length} {symbols.length === 1 ? "symbol" : "symbols"}
        </span>
      </summary>
      <div
        role="group"
        aria-label="Retained Market Evidence summaries"
        style={{
          position: "absolute", top: 38, right: 0, width: 260, maxWidth: "calc(100vw - 24px)",
          padding: 10, borderRadius: 10, background: "rgba(8,10,18,0.98)",
          border: "1px solid rgba(139,146,172,0.20)", boxShadow: "0 10px 28px rgba(0,0,0,0.48)",
          display: "flex", flexWrap: "wrap", gap: 6,
        }}
      >
        {/*
          ONE SYMBOL WAS WEARING THREE FACES AND ANSWERING TO ONE NAME.

          MEASURED LIVE 2026-09-19 on https://wealthymindsetspro.com/charts, in
          this popover, at 1920:

              6 bubbles in the group, aria-pressed="true" on TWO of them
              both spoke the identical name "Switch chart to BTC. …"
              and they disagreed: one Δ read +428.84, the other +0.0159

          `localStorage['wm:session-symbol-store:v1']` says why. The store keys
          its slots `symbol::tapeSource` and currently holds twelve, three of
          them BTC — `BTC::coinbase`, `BTC::binance`, `BTC::unavailable`.
          `getKnownSessionSymbols()` splits that key and RETURNS `tapeSource`
          (sessionSymbolStore.ts:262-273). This map destructured `{ symbol, slot }`
          and threw the other half away.

          Everything broken here follows from that one discarded word:
            · `key={symbol}` collided — React was reconciling three rows under
              one identity;
            · `symbol === activeSymbol` lit EVERY BTC row, because the comparison
              was made against half of a two-part identity;
            · two buttons carried the same accessible name while showing
              different numbers, which is a §0 CANONICAL MARKET violation — one
              symbol, two disagreeing readings, no way to tell which is which;
            · and `tapeSource: "unavailable"` — a DEGRADED provenance, a number
              WM could not source — was presented with the same authority as a
              Coinbase record.

          The repair is to stop discarding the word. Each reading now carries the
          tape it came from, by eye and by ear, and the degraded one says so.
        */}
        {symbols.slice(0, 6).map(({ symbol, tapeSource, slot }) => {
          /*
            WHY `aria-current` AND NOT `aria-pressed`.

            `onClick` is `if (!isActive) setActiveSymbol(symbol)` — pressing an
            already-active row does NOTHING. `aria-pressed` promises a reversal
            this control cannot perform, the same unkeepable promise ruled on
            twice today (the seven-mode bar, the nine-button timeframe strip).

            WHY THE "EXACTLY ONE CURRENT" LAW FROM THOSE TWO DOES NOT TRANSFER.

            Those were single-select sets: one row selected, all others not, so a
            second `aria-current="true"` would have been a defect. This set is
            NOT keyed the same way the chart is. Rows are identified by
            `symbol::tapeSource`; the chart owns only the symbol half. So when
            three BTC records exist and the chart is on BTC, all three are
            genuinely current — the chart really is showing that symbol, from a
            tape this control does not choose. Collapsing that to one would be a
            fabricated tie-break: WM would be inventing an answer to "which tape
            is the chart on?" that it does not have.

            Do not "fix" the multiple-current case. It is the honest shape until
            the chart's own identity carries a tape source too.
          */
          const isActive = symbol === activeSymbol;
          /* The provenance word, spoken. "unavailable" is not a venue — it is
             the store's marker for a reading whose tape WM could not name, so it
             is said as the absence it is rather than dressed up as a source. */
          const sourceSpoken =
            tapeSource === "unavailable" ? "tape source unavailable" : `via ${tapeSource}`;
          /* MEASURED LIVE 2026-09-17 in this very popover: "AAPL  -0.01" was
             painted red and "META  +0.01" green, in the slot a trader reads as
             "change today, in dollars". It is neither. It is net aggressive
             VOLUME, and AAPL's came from five observed trades.

             selectEvidenceDeltaChip owns both halves of the repair: the `Δ`
             now travels WITH the reading (the law this file's own docblock
             states thirty-five lines above), and the direction colour is
             withheld whenever buy and sell volume agree to within the declared
             imbalance convention. The number is never withheld — only the
             verdict about its direction. */
          const deltaChip = selectEvidenceDeltaChip(slot.stats, symbol);
          const dColor =
            deltaChip.direction === 1 ? "#00C076"
            : deltaChip.direction === -1 ? "#FF4D6A"
            : "#8B92AC";
          return (
            <button
              key={`${symbol}::${tapeSource}`}
              type="button"
              onClick={() => { if (!isActive) setActiveSymbol(symbol); }}
              aria-label={
                isActive
                  ? `${symbol}, ${sourceSpoken}. Already charted. ${deltaChip.spoken}`
                  : `Switch chart to ${symbol}, ${sourceSpoken}. ${deltaChip.spoken}`
              }
              aria-current={isActive ? "true" : undefined}
              style={{
                minHeight: 44, minWidth: 44, padding: "4px 8px", borderRadius: 8,
                background: isActive ? "rgba(240,180,41,0.10)" : "rgba(255,255,255,0.025)",
                border: isActive ? "1px solid rgba(240,180,41,0.30)" : "1px solid rgba(139,146,172,0.14)",
                color: isActive ? "#D8DCEA" : "#8B92AC", cursor: isActive ? "default" : "pointer",
                font: "inherit", display: "inline-flex", alignItems: "center", gap: 5,
              }}
              title={`${isActive ? "Currently active" : "Click to switch chart"} — ${symbol} ${sourceSpoken}. ${deltaChip.title} Big ${slot.stats.bigTradeCount}. ${slot.horizon ? fmtMemoryAge(slot.horizon.startedAtSec) : "no horizon yet"}.`}
            >
              <span style={{ fontWeight: 850 }}>{symbol}</span>
              {/* The provenance, by eye. Two BTC rows showing different numbers
                  must be distinguishable without hovering. Dimmed because it is
                  the reading's address, not the reading — except when the tape
                  is unavailable, where the absence is the point and is marked
                  with a dash rather than a venue name. */}
              <span
                data-evidence-tape-source={tapeSource}
                style={{
                  fontWeight: 700, fontSize: 8.5, letterSpacing: 0.2,
                  color: tapeSource === "unavailable" ? "#62697d" : "#8B92AC",
                  opacity: tapeSource === "unavailable" ? 0.75 : 1,
                }}
              >
                {tapeSource === "unavailable" ? "—" : tapeSource}
              </span>
              <span data-evidence-delta-kind={deltaChip.kind} style={{ color: dColor }}>
                {deltaChip.text}
              </span>
            </button>
          );
        })}
        <Link
          href="/nectar"
          aria-label="Open Market Evidence"
          title="Open Market Evidence"
          style={{
            minHeight: 44, padding: "0 9px", borderRadius: 8, display: "inline-flex", alignItems: "center",
            border: "1px solid rgba(240,180,41,0.22)", color: "#F0B429", textDecoration: "none",
          }}
        >
          View all →
        </Link>
      </div>
    </details>
  );
}
