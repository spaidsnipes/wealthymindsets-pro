/**
 * THE INSPECTED BAR'S CANDLE READINGS — Garden 19 §28 (Inspect depth).
 *
 * Effort → Response, the Delta Keel and the Session Bands draw ACROSS the
 * candles with no numbers on the glass. A trader who taps one bar must find,
 * in Inspect, the numbers the canvas withholds — read by the SAME pure
 * owners the glass reads (`readEffortResponseField`, `readKeels`,
 * `sessionsAt`), never a second classifier. One row per reading, each with
 * its evidence class (FULL / PARTIAL / SILENT) and why.
 *
 * Effort → Response on the glass is ranked over the CAMERA's bars; Inspect
 * has no camera, so it ranks the bar over the trailing window that ends at it
 * (up to 100 finished bars) and SAYS so — the Response Matrix card's
 * precedent. A switched-off reading is not printed (it is not on the glass).
 */
import { atrSeries, effortResponseWords, readEffortResponseField, type FieldBar } from "@/lib/chart/effortResponseField";
import { FAIL_MIN_RATIO, readKeels } from "@/lib/chart/barDeltaKeel";
import { SESSION_BAND_LABEL, sessionsAt } from "@/lib/chart/sessionBands";
import type { EvidenceClass } from "@/lib/chart/inspectEvidence";

export const ER_INSPECT_WINDOW = 100;

export interface CandleReadingRow {
  readonly id: "EFFORT_RESPONSE" | "DELTA_KEEL" | "SESSION";
  readonly label: string;
  readonly klass: EvidenceClass;
  /** The reading in words + the numbers the canvas withholds. */
  readonly value: string;
  /** What was measured and from where. */
  readonly basis: string;
}

export interface BarCandleReadingsInput {
  readonly bars: readonly FieldBar[];
  /** The inspected bar's open, epoch seconds. */
  readonly barTime: number | null;
  /** True when the inspected bar is still forming (no reading grades it). */
  readonly forming: boolean;
  readonly effortOn: boolean;
  readonly keelOn: boolean;
  readonly sessionOn: boolean;
  /** volumeTruthFor(symbol).real and its silence sentence. */
  readonly volumeReal: boolean;
  readonly volumeSilenceWhy?: string | null;
  /** Spot FX / spot metals: no signed evidence exists (hasNoCentralVolume). */
  readonly noCentralVolume: boolean;
  /** The bar's signed totals: its ladder row (tape) first, else the provider's bar sides. */
  readonly tapeTotals: { readonly buy: number; readonly sell: number } | null;
  readonly providerSides: { readonly buy: number; readonly sell: number } | null;
}

export function selectBarCandleReadings(i: BarCandleReadingsInput): CandleReadingRow[] {
  const out: CandleReadingRow[] = [];
  if (i.barTime == null) return out;
  const idx = i.bars.findIndex(b => b.time === i.barTime);

  if (i.effortOn) {
    if (i.forming) {
      out.push({ id: "EFFORT_RESPONSE", label: "Effort → Response", klass: "SILENT", value: "The bar is still forming — it has not finished responding.", basis: "Drawn on finished bars only." });
    } else if (idx < 0) {
      out.push({ id: "EFFORT_RESPONSE", label: "Effort → Response", klass: "SILENT", value: "This bar is not in the loaded set.", basis: "readEffortResponseField" });
    } else {
      const from = Math.max(0, idx - (ER_INSPECT_WINDOW - 1));
      const f = readEffortResponseField(i.bars, from, idx, { volumeReal: i.volumeReal, volumeSilenceWhy: i.volumeSilenceWhy ?? null, formingTime: null });
      const me = f.state === "DRAWN" ? f.bars.find(b => b.time === i.barTime) : undefined;
      if (f.state === "SILENT") {
        out.push({ id: "EFFORT_RESPONSE", label: "Effort → Response", klass: "SILENT", value: f.why, basis: "readEffortResponseField" });
      } else if (!me) {
        out.push({ id: "EFFORT_RESPONSE", label: "Effort → Response", klass: "SILENT", value: "No volume or no ATR on this bar yet — not weighed.", basis: "readEffortResponseField" });
      } else {
        out.push({
          id: "EFFORT_RESPONSE", label: "Effort → Response", klass: "FULL",
          value: `${me.cell} · ${effortResponseWords(me)}`,
          basis: `traded volume and |close − open| ÷ ATR(14), ranked over the ${f.bars.length} finished bars ending at this one (the glass ranks over the bars in view)`,
        });
      }
    }
  }

  if (i.keelOn) {
    const label = "Delta keel";
    if (i.noCentralVolume) {
      out.push({ id: "DELTA_KEEL", label, klass: "SILENT", value: "No signed evidence exists on this market (no central tape) — no keel.", basis: "barDeltaKeel" });
    } else if (i.forming) {
      out.push({ id: "DELTA_KEEL", label, klass: "SILENT", value: "The bar is still forming — keels are drawn on finished bars.", basis: "barDeltaKeel" });
    } else {
      const ev = i.tapeTotals && i.tapeTotals.buy + i.tapeTotals.sell > 0 ? { ...i.tapeTotals, basis: "TAPE" as const }
        : i.providerSides && i.providerSides.buy + i.providerSides.sell > 0 ? { ...i.providerSides, basis: "SIDES" as const } : null;
      const bar = idx >= 0 ? i.bars[idx] : null;
      if (!ev || !bar) {
        out.push({ id: "DELTA_KEEL", label, klass: "SILENT", value: "No signed prints and no provider bar sides for this bar — no keel (never guessed from candle colour).", basis: "barDeltaKeel" });
      } else {
        const atr = atrSeries(i.bars)[idx];
        const k = readKeels([{ time: bar.time, open: bar.open, close: bar.close, atr, buy: ev.buy, sell: ev.sell, basis: ev.basis }])[0];
        const tot = ev.buy + ev.sell;
        const ratio = (ev.buy - ev.sell) / tot;
        const nums = `bought ${ev.buy.toLocaleString("en-US")} · sold ${ev.sell.toLocaleString("en-US")} · ratio ${ratio >= 0 ? "+" : "−"}${Math.abs(ratio).toFixed(2)}`;
        const value = !k
          ? `Balanced — no side won by 5% or more · ${nums}`
          : `${k.ratio > 0 ? "BUYERS" : "SELLERS"} won${k.failed ? ` — and FAILED TO DISPLACE (hollow keel: |ratio| ≥ ${FAIL_MIN_RATIO} but the bar did not move their way)` : ""} · ${nums}`;
        out.push({
          id: "DELTA_KEEL", label, klass: ev.basis === "TAPE" ? "FULL" : "PARTIAL",
          value,
          basis: ev.basis === "TAPE" ? "captured signed prints for this bar (the ladder row the DELTA line reads)" : "the provider's own bid / ask volume per bar — sides as the provider reports them, not this room's tape",
        });
      }
    }
  }

  if (i.sessionOn) {
    const ids = sessionsAt(i.barTime);
    out.push({
      id: "SESSION", label: "Session", klass: "FULL",
      value: ids.length === 0 ? "Outside Asia, London and New York business hours" : ids.map(s => SESSION_BAND_LABEL[s]).join(" + ") + (ids.length > 1 ? " (overlap)" : ""),
      basis: "the clock alone (sessionBands) — no volume needed",
    });
  }
  return out;
}
