"use client";

/**
 * THE ONE TICKET'S FAMILY ROW (Founder P0, 2026-10-10) — six instrument
 * families at the top of TRADE, each with its REAL capability word
 * (instrumentCapability.familyVerdict), and the contract picker each family
 * routes to. Picking a contract switches the CHART to it, so the ticket below
 * trades what the trader sees: one ticket, one Decision, one risk calc, one
 * Journal capture. The options families open the chain from here (expiration ·
 * strike · call / put · live Greeks) — the same Decision is carried in.
 *
 * Nothing in this file sends, previews or reaches any broker route. The forex
 * and option calculators are calculators: they say so.
 */

import React, { useEffect, useMemo, useState } from "react";

import { instrumentEconomics } from "@/lib/marketData/contractEconomics";
import { futuresRootOf } from "@/lib/marketData/symbolAssetClass";
import {
  chartFamily, CRYPTO_PICKS, FAMILY_LABEL, FAMILY_STATE_WORD, FUTURES_PAIRS, FX_PICKS, STOCK_PICKS, TRADE_FAMILIES,
  type FamilyState, type FamilyVerdict, type TradeFamily,
} from "@/lib/execution/instrumentCapability";
import type { FutureContract } from "@/lib/broker/tastytradeFuturesChain";
import { FX_LOT_UNITS, fxPair, fxPipSize, instrumentRisk, RISK_ESTIMATE_CAVEAT, type FxLot, type RiskAnswer } from "@/lib/execution/instrumentRisk";

const GOLD = "#C9A55C";
const INK = "#ede6d3";
const MUTED = "#8a8271";
const LINE = "rgba(139,106,41,0.35)";
const GREEN = "#7fd1a8";
const RED = "#e0786b";
const MONO: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

const STATE_COLOR: Readonly<Record<FamilyState, string>> = { EXECUTABLE: GREEN, PAPER_ONLY: GOLD, NOT_CONNECTED: MUTED, CHART_ONLY: RED };

const chip = (on: boolean): React.CSSProperties => ({
  minHeight: 30, padding: "0 8px", borderRadius: 6, border: `1px solid ${on ? GOLD : LINE}`, background: on ? `${GOLD}22` : "transparent",
  color: on ? GOLD : INK, fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
});
const field: React.CSSProperties = { width: "100%", background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: 4, borderRadius: 4, ...MONO };

export function TradeFamilySelector({ family, verdicts, onPick }: {
  readonly family: TradeFamily;
  readonly verdicts: readonly FamilyVerdict[];
  readonly onPick: (f: TradeFamily) => void;
}) {
  const v = verdicts.find(x => x.family === family)!;
  return (
    <div data-testid="trade-family" data-family={family} data-family-state={v.state} style={{ padding: "8px 12px", borderBottom: `1px solid ${LINE}`, display: "grid", gap: 6 }}>
      <div role="radiogroup" aria-label="Instrument family" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4 }}>
        {TRADE_FAMILIES.map(f => {
          const fv = verdicts.find(x => x.family === f)!;
          const on = f === family;
          return (
            <button key={f} type="button" role="radio" aria-checked={on} data-testid={`trade-family-${f.toLowerCase()}`} data-state={fv.state}
              onClick={() => onPick(f)}
              style={{ display: "grid", gap: 1, textAlign: "left", padding: "4px 6px", minHeight: 38, minWidth: 0, borderRadius: 6, cursor: "pointer",
                border: `1px solid ${on ? GOLD : LINE}`, background: on ? `${GOLD}1f` : "transparent", color: on ? GOLD : INK }}>
              <span style={{ fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{FAMILY_LABEL[f]}</span>
              <span style={{ fontSize: 9, letterSpacing: 0.8, fontWeight: 700, color: STATE_COLOR[fv.state] }}>{FAMILY_STATE_WORD[fv.state]}</span>
            </button>
          );
        })}
      </div>
      <p data-testid="trade-family-reason" style={{ margin: 0, fontSize: 11, color: v.state === "EXECUTABLE" ? INK : GOLD }}>
        <strong style={{ color: STATE_COLOR[v.state], letterSpacing: 0.8 }}>{FAMILY_STATE_WORD[v.state]}</strong> · {v.reason}
      </p>
      <details data-testid="trade-family-rails" style={{ fontSize: 10.5, color: MUTED }}>
        <summary style={{ cursor: "pointer" }}>Every rail for {FAMILY_LABEL[family].toLowerCase()}</summary>
        {v.cells.map(c => (
          <p key={c.rail} style={{ margin: "2px 0" }}><strong style={{ color: STATE_COLOR[c.state] }}>{c.rail} · {FAMILY_STATE_WORD[c.state]}</strong> — {c.reason}</p>
        ))}
      </details>
    </div>
  );
}

function RiskLines({ answer, testId }: { readonly answer: RiskAnswer; readonly testId: string }) {
  if (answer.status === "REFUSED") return <p data-testid={testId} data-risk="refused" style={{ margin: 0, color: GOLD, fontSize: 11 }}>$ risk withheld — {answer.reason}</p>;
  return (
    <div data-testid={testId} data-risk="priced" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 8px", fontSize: 11, ...MONO }}>
      <span style={{ color: MUTED }}>Risk at stop</span><span style={{ color: answer.riskUsd != null ? RED : MUTED }}>{answer.riskUsd != null ? `−$${answer.riskUsd.toFixed(2)}` : "set a stop"}</span>
      <span style={{ color: MUTED }}>Reward at target</span><span style={{ color: answer.rewardUsd != null ? GREEN : MUTED }}>{answer.rewardUsd != null ? `+$${answer.rewardUsd.toFixed(2)}${answer.riskUsd ? ` · ${(answer.rewardUsd / answer.riskUsd).toFixed(2)}R` : ""}` : "—"}</span>
      <span style={{ color: MUTED, gridColumn: "1 / -1" }}>{answer.basis} · {answer.caveat}</span>
    </div>
  );
}

const num = (s: string): number | null => { const n = Number(s); return s.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null; };

/** Spot-forex pip calculator. No broker sends spot FX in WM — it says so. */
function FxCalculator({ chartSymbol, price, onChoose, executable }: {
  readonly chartSymbol: string; readonly price: number | null; readonly onChoose: (s: string) => void; readonly executable: boolean;
}) {
  const onChart = chartFamily(chartSymbol) === "FX" ? chartSymbol : null;
  const [pair, setPair] = useState(onChart ?? "EUR/USD");
  useEffect(() => { if (onChart) setPair(onChart); }, [onChart]);
  const [lot, setLot] = useState<FxLot>("MINI");
  const [lots, setLots] = useState("1");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [rate, setRate] = useState("");
  const pairIsChart = onChart != null && fxPair(onChart)?.base === fxPair(pair)?.base && fxPair(onChart)?.quote === fxPair(pair)?.quote;
  useEffect(() => { if (pairIsChart && price != null && entry === "") setEntry(String(price)); }, [pairIsChart, price]); // eslint-disable-line react-hooks/exhaustive-deps
  const p = fxPair(pair);
  const cross = p != null && p.base !== "USD" && p.quote !== "USD";
  const units = (num(lots) ?? 0) * FX_LOT_UNITS[lot];
  const answer = instrumentRisk({ family: "FX", symbol: pair, qty: units, entry: num(entry), stop: num(stop), target: num(target), quoteToUsd: num(rate) });
  return (
    <div data-testid="trade-fx-calculator" style={{ display: "grid", gap: 6 }}>
      {!executable ? (
        <p data-testid="trade-fx-truth" style={{ margin: 0, color: GOLD, fontWeight: 600 }}>
          PIP CALCULATOR · no broker connected — nothing can be sent.
        </p>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {FX_PICKS.map(s => <button key={s} type="button" aria-pressed={s === pair} onClick={() => { setPair(s); setEntry(""); }} style={chip(s === pair)}>{s}</button>)}
      </div>
      {!pairIsChart ? <button type="button" data-testid="trade-fx-chart" onClick={() => onChoose(pair)} style={{ ...chip(false), justifySelf: "start" }}>Chart {pair} →</button> : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, color: MUTED, fontSize: 11 }}>
        <label>Lot size
          <select aria-label="Lot size" value={lot} onChange={e => setLot(e.target.value as FxLot)} style={field}>
            <option value="STANDARD">Standard · 100,000</option><option value="MINI">Mini · 10,000</option><option value="MICRO">Micro · 1,000</option>
          </select>
        </label>
        <label>Lots<input aria-label="Lots" inputMode="decimal" value={lots} onChange={e => setLots(e.target.value)} style={field} /></label>
        <label>Entry<input aria-label="FX entry" inputMode="decimal" value={entry} onChange={e => setEntry(e.target.value)} style={field} /></label>
        <label>Stop<input aria-label="FX stop" inputMode="decimal" value={stop} onChange={e => setStop(e.target.value)} style={field} /></label>
        <label>Target<input aria-label="FX target" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} style={field} /></label>
        {cross && p ? <label>{p.quote}→USD rate<input aria-label="Quote to USD rate" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} style={field} /></label> : null}
      </div>
      <p style={{ margin: 0, color: MUTED, fontSize: 10.5, ...MONO }}>pip {fxPipSize(pair) ?? "—"}{p?.quote === "JPY" ? " (yen-quoted)" : ""} · {units.toLocaleString("en-US")} units · USD account</p>
      <RiskLines answer={answer} testId="trade-fx-risk" />
    </div>
  );
}

/** Premium-to-premium risk for one option line. The chain carries the contract, its Greeks and (futures options) its multiplier. */
function OptionRisk({ family }: { readonly family: "EQUITY_OPTION" | "FUTURE_OPTION" }) {
  const [qty, setQty] = useState("1");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const answer = instrumentRisk({ family, symbol: "", qty: num(qty) ?? 0, entry: num(entry), stop: num(stop), target: num(target), multiplier: null });
  return (
    <div data-testid="trade-option-risk" style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))", gap: 6, color: MUTED, fontSize: 11 }}>
        <label>Contracts<input aria-label="Option contracts" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} style={field} /></label>
        <label>Premium<input aria-label="Premium" inputMode="decimal" value={entry} onChange={e => setEntry(e.target.value)} style={field} /></label>
        <label>Stop<input aria-label="Premium stop" inputMode="decimal" value={stop} onChange={e => setStop(e.target.value)} style={field} /></label>
        <label>Target<input aria-label="Premium target" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} style={field} /></label>
      </div>
      <RiskLines answer={answer} testId="trade-option-risk-lines" />
      <p style={{ margin: 0, color: MUTED, fontSize: 10.5 }}>Greeks, the contract and the send live in the chain{family === "FUTURE_OPTION" ? "; each expiry carries its own multiplier there" : " (× 100 per contract)"}.</p>
    </div>
  );
}

/**
 * The family's contract picker, shown when the family is not the chart's own
 * stock / future / crypto ticket. Picks switch the chart (onChoose); the
 * options families open the chain (onOpenChain).
 */
export function FamilyContractPicker({ family, verdict, chartSymbol, price, onChoose, onOpenChain }: {
  readonly family: TradeFamily;
  readonly verdict: FamilyVerdict;
  readonly chartSymbol: string;
  readonly price: number | null;
  readonly onChoose: (symbol: string) => void;
  readonly onOpenChain: () => void;
}) {
  const chartFam = chartFamily(chartSymbol);
  const [typed, setTyped] = useState("");
  const tickWords = useMemo(() => (s: string) => {
    const e = instrumentEconomics(s, null);
    return e.status === "PRICED" && e.tickValue != null ? `$${e.tickValue.toFixed(2)}/tick` : "spec not on file";
  }, []);
  const pickRow = (syms: readonly string[]) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {syms.map(s => <button key={s} type="button" data-testid={`trade-family-pick-${s}`} onClick={() => onChoose(s)} style={chip(false)}>{s}</button>)}
    </div>
  );
  const typedRow = (placeholder: string) => (
    <form onSubmit={e => { e.preventDefault(); const s = typed.trim().toUpperCase(); if (s) onChoose(s); }} style={{ display: "flex", gap: 6 }}>
      <input aria-label="Symbol" placeholder={placeholder} value={typed} onChange={e => setTyped(e.target.value)} style={{ ...field, flex: 1 }} />
      <button type="submit" style={chip(true)}>Chart it</button>
    </form>
  );
  const futuresGrid = (
    <div data-testid="trade-futures-picker" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 4, alignItems: "center", fontSize: 11, ...MONO }}>
      {FUTURES_PAIRS.map(p => (
        <React.Fragment key={p.mini}>
          <span style={{ color: MUTED }}>{p.market}</span>
          <button type="button" data-testid={`trade-family-pick-${p.mini}`} onClick={() => onChoose(p.mini)} style={chip(chartSymbol.toUpperCase() === p.mini)}>{p.mini.replace("1!", "")} · {tickWords(p.mini)}</button>
          <button type="button" data-testid={`trade-family-pick-${p.micro}`} onClick={() => onChoose(p.micro)} style={chip(chartSymbol.toUpperCase() === p.micro)}>{p.micro.replace("1!", "")} · {tickWords(p.micro)}</button>
        </React.Fragment>
      ))}
    </div>
  );
  const sends = verdict.state === "EXECUTABLE" || verdict.state === "PAPER_ONLY";
  return (
    <div data-testid="trade-family-picker" data-family={family} style={{ padding: 12, display: "grid", gap: 8 }}>
      {family === "STOCK" ? <>
        <p style={{ margin: 0, color: MUTED }}>Pick a stock or ETF — the chart switches to it and this ticket trades it.</p>
        {pickRow(STOCK_PICKS)}{typedRow("Any US stock / ETF, e.g. AMD")}
      </> : family === "CRYPTO" ? <>
        <p style={{ margin: 0, color: MUTED }}>Pick a coin (USD product) — the chart switches to it and this ticket trades it, sized in coins.</p>
        {pickRow(CRYPTO_PICKS)}
      </> : family === "FUTURE" ? <>
        <p style={{ margin: 0, color: MUTED }}>Mini or micro — the same market at a tenth of the money. The ticket names tastytrade&apos;s active contract month once the chart switches.</p>
        {futuresGrid}
      </> : family === "FX" ? (
        <FxCalculator chartSymbol={chartSymbol} price={price} onChoose={onChoose} executable={verdict.state === "EXECUTABLE"} />
      ) : family === "EQUITY_OPTION" ? <>
        {chartFam === "STOCK" ? (
          <button type="button" data-testid="trade-open-chain" onClick={onOpenChain} style={{ ...chip(true), justifySelf: "stretch", minHeight: 34, whiteSpace: "normal", textAlign: "left", padding: "6px 10px" }}>
            Open the {chartSymbol.toUpperCase()} chain — expiration · strike · call / put →
          </button>
        ) : <>
          <p style={{ margin: 0, color: MUTED }}>Equity options are on a stock or ETF. Pick the underlying; then open its chain here.</p>
          {pickRow(STOCK_PICKS)}
        </>}
        <OptionRisk family="EQUITY_OPTION" />
      </> : <>
        {chartFam === "FUTURE" ? (
          <button type="button" data-testid="trade-open-chain" onClick={onOpenChain} style={{ ...chip(true), justifySelf: "stretch", minHeight: 34, whiteSpace: "normal", textAlign: "left", padding: "6px 10px" }}>
            Open the {chartSymbol.toUpperCase()} futures-option chain — expiration · strike · call / put →
          </button>
        ) : <>
          <p style={{ margin: 0, color: MUTED }}>Futures options sit on a future — not on a stock&apos;s chain. Pick the future; then open its chain here.</p>
          {futuresGrid}
        </>}
        <OptionRisk family="FUTURE_OPTION" />
      </>}
      {!sends && family !== "FX" ? <p data-testid="trade-family-nosend" style={{ margin: 0, color: GOLD, fontSize: 11 }}>{verdict.reason}</p> : null}
      <p style={{ margin: 0, color: MUTED, fontSize: 10 }}>Risk on this ticket is {RISK_ESTIMATE_CAVEAT}.</p>
    </div>
  );
}

/**
 * CONTRACT MONTH + SIZE for a futures ticket: tastytrade's own listed months (nearest first, with
 * their expiration dates) and the mini / micro sibling. A pick switches the chart to that contract.
 */
export function FuturesMonthRow({ chartSymbol, contract, months, why, loading, onChoose }: {
  readonly chartSymbol: string;
  readonly contract: string | null;
  readonly months: readonly FutureContract[];
  readonly why: string | null;
  readonly loading: boolean;
  readonly onChoose: (symbol: string) => void;
}) {
  const up = chartSymbol.toUpperCase();
  const root = futuresRootOf(contract ?? up) ?? futuresRootOf(up);
  const pair = root ? FUTURES_PAIRS.find(p => p.mini === `${root}1!` || p.micro === `${root}1!`) : undefined;
  const sibling = pair && root ? (pair.micro === `${root}1!` ? { word: "Mini", sym: pair.mini } : { word: "Micro", sym: pair.micro }) : null;
  const date = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "date not listed");
  return (
    <div data-testid="trade-futures-months" style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
        <span style={{ color: MUTED, fontSize: 11, marginRight: 2 }}>Contract month</span>
        {months.slice(0, 3).map(m => (
          <button key={m.symbol} type="button" data-testid={`trade-month-${m.symbol}`} aria-pressed={m.symbol === contract} onClick={() => onChoose(m.symbol)}
            title={`${m.symbol} expires ${date(m.expiration)}`} style={{ ...chip(m.symbol === contract), fontSize: 10.5, ...MONO }}>
            {m.symbol} · exp {date(m.expiration)}{m.activeMonth ? " · active" : ""}
          </button>
        ))}
        {sibling ? <button type="button" data-testid="trade-size-sibling" onClick={() => onChoose(sibling.sym)} style={{ ...chip(false), fontSize: 10.5 }}>{sibling.word}: {sibling.sym.replace("1!", "")} →</button> : null}
      </div>
      {loading ? <span style={{ color: MUTED, fontSize: 10.5 }}>Reading tastytrade&apos;s listed months…</span> : why ? <span style={{ color: GOLD, fontSize: 10.5 }}>{why}</span> : null}
    </div>
  );
}
