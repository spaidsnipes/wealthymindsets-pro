"use client";

/**
 * TRADE — Garden 18 §LXVII–§LXXX. ONE verb, context-aware, floating over the
 * market (never a drawer, never a modal that hides price).
 *
 * The panel reads WHAT is on the chart and offers the right ticket:
 *   FUTURE   the actual contract (MNQ1! → tastytrade's active month, /MNQH7 →
 *            that month), contracts 1·2·3·5, limit seeded from the live touch,
 *            tick nudges, point and tick value from the contract's economics.
 *   STOCK    shares on tastytrade, same grammar.
 *   OPTION / FUTURES OPTION  → the Options family (chain, shortlist, ticket).
 *   CRYPTO   spot, the exact pair (BTC → BTC/USD) at tastytrade, sized in coin
 *            units; tastytrade's dry run says whether the account may trade it.
 *            If the quote stream does not answer, the limit seeds from the
 *            chart's last price and the touch reads "—".
 *   FX       "NO CONNECTED SPOT-FX EXECUTION RAIL" — never a silent 6E swap.
 *
 * Execution is the existing firewall: tastytrade's dry run first, then the
 * armed Send LIVE (`TastytradeLiveOrder`) — the human presses it, nothing else.
 * Protection is real and stated: after the entry, a broker-native Stop and a
 * target Limit (both GTC, both closing) can each be armed and sent; they are
 * NOT linked (no OCO yet), and the panel says so.
 */

import { openSettings } from "@/components/layout/shellPanels";
import { tastytradeEntryFields, type TastytradeEntryType } from "@/lib/broker/tastytradeEntryFields";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSymbolOwnedState } from "@/lib/marketData/useSymbolOwnedState";

import { TastytradeLiveOrder, type TastytradeIntent } from "@/components/chart/TastytradeLiveOrder";
import { tastyFrontMonthFor } from "@/lib/broker/tastyFrontMonth";
import { isOwnerRefusal, plainBrokerAnswer, TASTYTRADE_NOT_AVAILABLE } from "@/lib/broker/ownerRefusal";
import { useTastyQuotes } from "@/lib/broker/tastyQuoteStream";
import { instrumentEconomics } from "@/lib/marketData/contractEconomics";
import { useGuardrails } from "@/lib/execution/useGuardrails";
import { canonicalAssetClass, cryptoBaseTicker } from "@/lib/marketData/canonicalIdentity";
import { continueOrMint, type DecisionIdentity } from "@/lib/traderMemory/decisionIdentity";
import { thisDeviceId } from "@/lib/traderMemory/deviceIdentity";
import { useBrokerAudience } from "@/lib/broker/useBrokerAudience";

/** guest audit 2026-10-04: quote-stream states in plain words (the enum stays in data-state). */
const STREAM_WORDS: Readonly<Record<string, string>> = {
  IDLE: "quotes idle", CONNECTING: "connecting", DEGRADED: "reconnecting",
  NOT_OWNER: "live quotes not on your account", NOT_CONNECTED: "quotes not connected",
};
const GOLD = "#C9A55C";
const INK = "#ede6d3";
const MUTED = "#8a8271";
const LINE = "rgba(139,106,41,0.35)";
const GREEN = "#7fd1a8";
const RED = "#e0786b";
const MONO: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

type Kind = "FUTURE" | "STOCK" | "OPTION" | "CRYPTO" | "FX";

function kindOf(symbol: string): Kind {
  const c = canonicalAssetClass(symbol);
  return c === "futures" ? "FUTURE" : c === "crypto" ? "CRYPTO" : c === "forex" ? "FX" : c === "options" ? "OPTION" : "STOCK";
}

/** The tick's own decimal places (0.25 → 2, 0.01 → 2, 0.5 → 1, 1 → 0). */
export const decimals = (tick: number | null): number => {
  if (tick == null || !(tick > 0)) return 2;
  const t = String(Number(tick.toPrecision(8)));
  const e = /e-(\d+)$/.exec(t);
  if (e) return Math.min(8, Number(e[1]));
  return t.includes(".") ? Math.min(8, t.split(".")[1]!.length) : 0;
};

export function TradePanel({ symbol, price, bornDecision, onIdentity, onOpenOptions, onOpenPaper, onClose }: {
  readonly symbol: string;
  readonly price: number | null;
  readonly bornDecision: DecisionIdentity | null;
  readonly onIdentity: (identity: DecisionIdentity) => void;
  readonly onOpenOptions: () => void;
  readonly onOpenPaper: () => void;
  readonly onClose: () => void;
}) {
  const kind = kindOf(symbol);
  // The broker rails behind this ticket are the OWNER's. A guest saw the full
  // live ticket and the arm switch, then refusals after pressing; they get one
  // sentence and Paper instead (garden pass 2026-10-05). null = still asking.
  const audience = useBrokerAudience();
  // §LXXX: the trader's master switch, visible before any order is built.
  const liveArmed = useGuardrails().liveArmed;
  // Garden 18 §4: the contract belongs to the symbol it was named for — the
  // first frame after a switch used to quote the PREVIOUS symbol's contract.
  const contractKey = `${symbol.toUpperCase()}|${kind}`;
  const [contract, setContract] = useSymbolOwnedState<{ symbol: string; streamer: string } | null>(contractKey, null);
  const [contractWhy, setContractWhy] = useSymbolOwnedState<string | null>(contractKey, null);

  // The actual contract — never a continuous symbol routed blind (§LXX).
  useEffect(() => {
    let live = true;
    setContract(null); setContractWhy(null);
    if (kind === "FUTURE") {
      tastyFrontMonthFor(symbol).then(c => {
        if (!live) return;
        if (c) setContract(c); else setContractWhy("tastytrade did not name a tradable contract for this future (not connected, or no listed month).");
      });
    } else if (kind === "STOCK") {
      setContract({ symbol: symbol.toUpperCase(), streamer: symbol.toUpperCase() });
    } else if (kind === "CRYPTO") {
      // §LXXII: the exact expression — spot, priced in USD, at tastytrade.
      const base = cryptoBaseTicker(symbol);
      if (base) setContract({ symbol: `${base}/USD`, streamer: `${base}/USD:CXTALP` });
      else setContractWhy("This coin has no USD pair WM can name exactly.");
    }
    return () => { live = false; };
  }, [symbol, kind, setContract, setContractWhy]);

  const snap = useTastyQuotes(contract ? [contract.streamer] : []);
  const q = contract ? snap.quotes.get(contract.streamer) : undefined;
  const econ = useMemo(() => instrumentEconomics(contract?.symbol ?? symbol, price), [contract?.symbol, symbol, price]);
  const tick = econ.status === "PRICED" ? econ.tickSize : null;
  const pointValue = econ.status === "PRICED" ? econ.pointValue : null;
  const dp = decimals(tick);

  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [closing, setClosing] = useState(false);
  const [qty, setQty] = useState(1);
  // Crypto sizes in coin units; reset when the instrument kind changes.
  useEffect(() => { setQty(kind === "CRYPTO" ? 0.001 : 1); }, [kind]);
  const [entryType, setEntryType] = useState<TastytradeEntryType>("Limit");
  const [entryTrigger, setEntryTrigger] = useState("");
  useEffect(() => { setEntryTrigger(""); }, [symbol]);
  const effectiveEntryType = kind === "FUTURE" || kind === "STOCK" ? entryType : "Limit";
  const [limit, setLimit] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Seed the limit from the touch you would trade against, once per contract + side.
  const seeded = useRef("");
  useEffect(() => {
    const key = `${contract?.symbol}|${side}`;
    const touch = side === "BUY" ? q?.ask : q?.bid;
    if (contract && touch != null && seeded.current !== key) { seeded.current = key; setLimit(touch.toFixed(dp)); }
  }, [contract, side, q?.ask, q?.bid, dp]);

  const limitNum = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : null;
  const triggerNum = Number.isFinite(Number(entryTrigger)) && Number(entryTrigger) > 0 ? Number(entryTrigger) : null;
  const entryFields = tastytradeEntryFields(effectiveEntryType, limitNum, triggerNum);
  const referenceEntry = effectiveEntryType === "Limit" || effectiveEntryType === "Stop Limit" ? limitNum : null;
  const nudge = (dir: 1 | -1) => { if (limitNum == null || tick == null) return; setLimit((Math.round((limitNum + dir * tick) / tick) * tick).toFixed(dp)); };
  const setTo = (v: number | null | undefined) => { if (v == null) return; setLimit((tick ? Math.round(v / tick) * tick : v).toFixed(dp)); };

  const action: TastytradeIntent["action"] = side === "BUY" ? (closing ? "Buy to Close" : "Buy to Open") : (closing ? "Sell to Close" : "Sell to Open");
  const instrumentType: TastytradeIntent["instrumentType"] | null = kind === "FUTURE" ? "Future" : kind === "STOCK" ? "Equity" : kind === "CRYPTO" ? "Cryptocurrency" : null;
  const fractional = kind === "CRYPTO";

  // Risk on the ticket (§LXXVII): $ at the stop, $ at the target, R.
  const stopNum = Number(stop) > 0 ? Number(stop) : null;
  const targetNum = Number(target) > 0 ? Number(target) : null;
  const perUnit = pointValue ?? 1;
  const riskUsd = referenceEntry != null && stopNum != null ? Math.abs(referenceEntry - stopNum) * perUnit * qty : null;
  const rewardUsd = referenceEntry != null && targetNum != null ? Math.abs(targetNum - referenceEntry) * perUnit * qty : null;
  const stopWrongSide = referenceEntry != null && stopNum != null && (side === "BUY" ? stopNum >= referenceEntry : stopNum <= referenceEntry);
  const notional = referenceEntry != null ? referenceEntry * perUnit * qty : null;

  const decisionRef = useRef<string | null>(null);
  useEffect(() => { decisionRef.current = bornDecision?.decisionId ?? null; }, [bornDecision]);
  function ensureDecision(): string | null {
    if (decisionRef.current) return decisionRef.current;
    const born = continueOrMint(bornDecision, { cause: "EXPLICIT_INTENT", deviceId: bornDecision?.bornOnDeviceId ?? thisDeviceId(), nowMs: Date.now(), nonce: crypto.randomUUID() });
    if (!born.ok) { setAnswer(born.reason); return null; }
    if (!bornDecision) onIdentity(born.identity);
    decisionRef.current = born.identity.decisionId;
    return born.identity.decisionId;
  }

  async function dryRun() {
    if (!contract || !instrumentType || !entryFields || busy) return;
    setBusy(true);
    try {
      const decisionId = ensureDecision();
      if (!decisionId) return;
      const r = await fetch("/api/broker/tastytrade/order-dry-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instrumentType, symbol: contract.symbol, action, qty, ...entryFields, decisionId }),
      });
      const j = await r.json().catch(() => null);
      if (j?.state === "DRY_RUN_OK") {
        const bp = j.result?.["buying-power-effect"];
        const fee = j.result?.["fee-calculation"];
        setAnswer(`tastytrade accepted the dry run${bp?.["change-in-buying-power"] ? ` · buying power ${bp["change-in-buying-power-effect"] === "Debit" ? "−" : "+"}${bp["change-in-buying-power"]}` : ""}${fee?.["total-fees"] ? ` · fees ${fee["total-fees"]}` : ""} — nothing was placed.`);
      } else if (isOwnerRefusal(j, r.status)) {
        // guest audit 2026-10-04: the owner gate's 403 is "not on your account", not "HTTP 403".
        setAnswer(TASTYTRADE_NOT_AVAILABLE);
      } else {
        const why = j?.reason ?? j?.error;
        setAnswer(`${j?.state ? plainBrokerAnswer(j.state) : `The dry run did not go through (${r.status}).`}${why ? ` · ${why}` : ""}`);
      }
    } catch {
      setAnswer("The dry run did not return.");
    } finally {
      setBusy(false);
    }
  }

  const btn = (on: boolean, color = GOLD): React.CSSProperties => ({
    minHeight: 30, padding: "0 10px", borderRadius: 6, border: `1px solid ${on ? color : LINE}`,
    background: on ? `${color}22` : "transparent", color: on ? color : INK, fontSize: 12, fontWeight: 600, cursor: "pointer",
  });
  const sizes = kind === "STOCK" ? [1, 10, 50, 100] : kind === "CRYPTO" ? [0.001, 0.01, 0.1, 1] : [1, 2, 3, 5];
  // Crypto seeds its limit from the chart's last price when no quote has been heard.
  useEffect(() => { if (kind === "CRYPTO" && !limit && price != null && price > 0) setLimit(price.toFixed(2)); }, [kind, price, limit]);

  return (
    <section
      data-testid="trade-panel"
      aria-label={`Trade ${symbol}`}
      style={{
        // §XIV: a market instrument never covers the forming candle, the live
        // price or a stop/target on price — all at the chart's right edge
        // (serving MNQ 1m, 2026-10-01: the panel at right:24 hid the forming
        // bar). It stands at the chart's lower LEFT, over settled history.
        position: "fixed", left: 24, bottom: 64, zIndex: 60, width: "min(400px, calc(100vw - 24px))", maxHeight: "72vh", overflowY: "auto",
        background: "#0d0b08", border: `1px solid ${LINE}`, borderRadius: 12, boxShadow: "0 18px 48px rgba(0,0,0,0.6)", color: INK, fontSize: 12,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${LINE}` }}>
        <strong style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 15, letterSpacing: 1 }}>TRADE</strong>
        <span data-testid="trade-kind" style={{ fontSize: 10, letterSpacing: 1.2, color: GOLD, border: `1px solid ${LINE}`, borderRadius: 4, padding: "1px 6px" }}>{kind === "FUTURE" ? "FUTURE" : kind}</span>
        <span style={{ fontWeight: 600 }}>{contract?.symbol ?? symbol}</span>
        {kind === "FUTURE" && contract && contract.symbol !== symbol.toUpperCase() ? <span style={{ color: MUTED }}>· {symbol} → this contract</span> : null}
        {audience === "OWNER" && <button type="button" data-testid="trade-live-arm" onClick={() => openSettings("execution")}
          title={liveArmed ? "Live orders can be armed — open Settings › Execution" : "Live trading is disarmed — open Settings › Execution; nothing can be sent until it is armed there"}
          style={{ fontSize: 9.5, letterSpacing: 1.1, fontWeight: 700, borderRadius: 4, padding: "2px 6px", border: `1px solid ${liveArmed ? RED : LINE}`, color: liveArmed ? RED : MUTED, background: "none", cursor: "pointer" }}>
          {liveArmed ? "LIVE ARMED" : "LIVE DISARMED"}
        </button>}
        <button type="button" aria-label="Close trade panel" onClick={onClose} style={{ marginLeft: "auto", color: MUTED, fontSize: 16, background: "none", border: "none", cursor: "pointer" }}>×</button>
      </header>

      {audience !== "OWNER" ? (
        <div data-testid="trade-guest" style={{ padding: 12 }}>
          <p style={{ color: MUTED }}>
            {audience === null ? "Checking which broker rails are open on your account…" : "Live broker orders aren't available on your account. Practise this exact trade in Paper — same chart, same levels, no money at risk."}
          </p>
          {audience === "GUEST" && <button type="button" onClick={onOpenPaper} style={{ ...btn(true), marginTop: 8 }}>Open Paper</button>}
        </div>
      ) : kind === "FX" ? (
        <p data-testid="trade-fx-truth" style={{ padding: 12, color: GOLD }}>
          NO CONNECTED SPOT-FX EXECUTION RAIL. Neither tastytrade nor Webull offers spot FX here, and WM never swaps in a currency future (6E) on its own. The chart, levels and risk still work.
        </p>
      ) : kind === "OPTION" ? (
        <div style={{ padding: 12 }}>
          <p style={{ color: MUTED }}>Options trade from the Options family — chain, shortlist and ticket with live quotes.</p>
          <button type="button" onClick={onOpenOptions} style={{ ...btn(true), marginTop: 8 }}>Open Options</button>
        </div>
      ) : (
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          {/* Live touch */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, ...MONO }}>
            <span style={{ color: MUTED }}>bid</span><strong>{q?.bid != null ? q.bid.toFixed(dp) : "—"}</strong>
            <span style={{ color: MUTED }}>ask</span><strong>{q?.ask != null ? q.ask.toFixed(dp) : "—"}</strong>
            <span data-state={snap.stream} style={{ marginLeft: "auto", color: snap.stream === "LIVE" ? GREEN : GOLD }}>● {snap.stream === "LIVE" ? "LIVE · tastytrade" : STREAM_WORDS[snap.stream] ?? snap.stream.replace(/_/g, " ").toLowerCase()}</span>
          </div>
          {contractWhy ? <p style={{ color: GOLD }}>{contractWhy}</p> : null}

          {/* Side + open/close */}
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" data-testid="trade-buy" aria-pressed={side === "BUY"} onClick={() => setSide("BUY")} style={{ ...btn(side === "BUY", GREEN), flex: 1, minHeight: 36, fontSize: 13 }}>BUY</button>
            <button type="button" data-testid="trade-sell" aria-pressed={side === "SELL"} onClick={() => setSide("SELL")} style={{ ...btn(side === "SELL", RED), flex: 1, minHeight: 36, fontSize: 13 }}>SELL</button>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: MUTED }}>
            <input type="checkbox" checked={closing} onChange={e => setClosing(e.target.checked)} /> This closes a position I hold ({action})
          </label>

          {/* Size */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: MUTED, width: 64 }}>{kind === "FUTURE" ? "Contracts" : kind === "CRYPTO" ? (contract?.symbol.split("/")[0] ?? "Coins") : "Shares"}</span>
            {sizes.map(n => <button key={n} type="button" data-testid={`trade-size-${n}`} aria-pressed={qty === n} onClick={() => setQty(n)} style={btn(qty === n)}>{n}</button>)}
            <input type="number" min={fractional ? 0.00000001 : 1} step={fractional ? "any" : 1} value={qty} aria-label="Quantity"
              onChange={e => { const v = Number(e.target.value); setQty(fractional ? (v > 0 ? v : 0.001) : Math.max(1, Math.floor(v || 1))); }}
              style={{ width: 64, background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: 4, borderRadius: 4, ...MONO }} />
          </div>

          {(kind === "FUTURE" || kind === "STOCK") ? <label style={{ color: MUTED }}>Entry order type
            <select aria-label="Entry order type" value={entryType} onChange={e => { setEntryType(e.target.value as TastytradeEntryType); setAnswer(null); }} style={{ marginLeft: 8, background: "#0b0a08", color: INK }}>
              {(["Market", "Limit", "Stop", "Stop Limit"] as const).map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </label> : null}
          {effectiveEntryType === "Market" ? <p style={{ color: MUTED }}>Market entry: fill price and entry risk are unknown until execution.</p> : null}
          {(effectiveEntryType === "Stop" || effectiveEntryType === "Stop Limit") ? <label style={{ color: MUTED }}>Entry stop trigger
            <input aria-label="Entry stop trigger" inputMode="decimal" value={entryTrigger} onChange={e => setEntryTrigger(e.target.value)} style={{ marginLeft: 8, width: 110, background: "#0b0a08", color: INK }} />
            {effectiveEntryType === "Stop" ? " · fill price is not guaranteed" : " · activates the limit order"}
          </label> : null}
          {(effectiveEntryType === "Limit" || effectiveEntryType === "Stop Limit") ? <>
          {/* Limit */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ color: MUTED, width: 64 }}>Limit</span>
            <button type="button" aria-label="One tick lower" onClick={() => nudge(-1)} style={btn(false)}>−</button>
            <input inputMode="decimal" value={limit} aria-label="Limit price" onChange={e => setLimit(e.target.value)}
              style={{ width: 110, background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: 4, borderRadius: 4, ...MONO }} />
            <button type="button" aria-label="One tick higher" onClick={() => nudge(1)} style={btn(false)}>+</button>
            <button type="button" onClick={() => setTo(q?.bid)} style={btn(false)}>BID</button>
            <button type="button" onClick={() => setTo(q?.bid != null && q?.ask != null ? (q.bid + q.ask) / 2 : null)} style={btn(false)}>MID</button>
            <button type="button" onClick={() => setTo(q?.ask)} style={btn(false)}>ASK</button>
          </div>

          </> : null}

          {/* Risk on the ticket */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <label style={{ color: MUTED }}>Stop / invalidation
              <input inputMode="decimal" value={stop} aria-label="Stop price" onChange={e => setStop(e.target.value)}
                style={{ width: "100%", background: "#0b0a08", border: `1px solid ${stopWrongSide ? RED : LINE}`, color: INK, padding: 4, borderRadius: 4, ...MONO }} />
            </label>
            <label style={{ color: MUTED }}>Target
              <input inputMode="decimal" value={target} aria-label="Target price" onChange={e => setTarget(e.target.value)}
                style={{ width: "100%", background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: 4, borderRadius: 4, ...MONO }} />
            </label>
          </div>
          <div data-testid="trade-economics" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, ...MONO }}>
            {kind === "FUTURE" ? <><span style={{ color: MUTED }}>Point value</span><span>{pointValue != null ? `$${pointValue}/pt · tick ${tick} = $${econ.status === "PRICED" ? econ.tickValue : "—"}` : "not on file"}</span></> : null}
            <span style={{ color: MUTED }}>{kind === "FUTURE" ? "Notional" : "Cost"}</span><span>{notional != null ? `$${notional.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}</span>
            <span style={{ color: MUTED }}>Planned risk at stop</span><span style={{ color: riskUsd != null ? RED : MUTED }}>{stopWrongSide ? "stop is on the wrong side" : riskUsd != null ? `−$${riskUsd.toFixed(2)}` : referenceEntry == null ? "entry fill unknown" : "set a stop"}</span>
            <span style={{ color: MUTED }}>Reward at target</span><span style={{ color: rewardUsd != null ? GREEN : MUTED }}>{rewardUsd != null ? `+$${rewardUsd.toFixed(2)}${riskUsd ? ` · ${(rewardUsd / riskUsd).toFixed(2)}R` : ""}` : "—"}</span>
          </div>
          <p data-testid="trade-protection" style={{ color: MUTED, fontSize: 11 }}>
            Protection is sent separately below, once you hold the position: a <strong style={{ color: GOLD }}>broker-native stop</strong> (a resting Stop at tastytrade, GTC) and a target (a resting Limit, GTC). They are <strong style={{ color: GOLD }}>not linked</strong> (no OCO yet) — if one fills, cancel the other.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" data-testid="trade-dry-run" disabled={!contract || !entryFields || busy} onClick={() => void dryRun()} style={{ ...btn(true), opacity: !contract || !entryFields ? 0.5 : 1 }}>
              {busy ? "Asking tastytrade…" : "Dry run on tastytrade"}
            </button>
            <span style={{ color: MUTED, fontSize: 11 }}>Validates against your real account; places nothing.</span>
          </div>
          {answer ? <p role="status" style={{ color: /accepted/.test(answer) ? GREEN : GOLD }}>{answer}</p> : null}

          <TastytradeLiveOrder
            intent={contract && instrumentType ? { instrumentType, symbol: contract.symbol, action, qty, orderType: effectiveEntryType, limitPx: effectiveEntryType === "Limit" || effectiveEntryType === "Stop Limit" ? limitNum : null, stopPx: effectiveEntryType === "Stop" || effectiveEntryType === "Stop Limit" ? triggerNum : null, describe: `${qty} ${contract.symbol}` } : null}
            ensureDecision={ensureDecision}
          />

          {/* §LXXVIII — PROTECTION, broker-native, each armed and pressed by the human. */}
          {kind !== "CRYPTO" && contract && instrumentType ? (
            <details data-testid="trade-protect" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "6px 8px" }}>
              <summary style={{ cursor: "pointer", color: GOLD, fontWeight: 600 }}>Protect the position — stop & target at the broker</summary>
              <p style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>
                These CLOSE {qty} {contract.symbol} {side === "BUY" ? "long" : "short"}. Send them after the entry fills.
              </p>
              {stopNum != null && !stopWrongSide ? (
                <TastytradeLiveOrder
                  intent={{ instrumentType, symbol: contract.symbol, action: side === "BUY" ? "Sell to Close" : "Buy to Close", qty, limitPx: null, orderType: "Stop", stopPx: stopNum, tif: "GTC", describe: `${qty} ${contract.symbol} protective stop` }}
                  ensureDecision={ensureDecision}
                />
              ) : <p style={{ color: GOLD, fontSize: 11 }}>{stopWrongSide ? "The stop is on the wrong side of the entry." : "Type a stop above to send it as a resting Stop."}</p>}
              {targetNum != null ? (
                <TastytradeLiveOrder
                  intent={{ instrumentType, symbol: contract.symbol, action: side === "BUY" ? "Sell to Close" : "Buy to Close", qty, limitPx: targetNum, tif: "GTC", describe: `${qty} ${contract.symbol} target` }}
                  ensureDecision={ensureDecision}
                />
              ) : <p style={{ color: MUTED, fontSize: 11 }}>Type a target above to send it as a resting Limit.</p>}
            </details>
          ) : null}
        </div>
      )}

      <footer style={{ padding: "8px 12px", borderTop: `1px solid ${LINE}`, display: "flex", gap: 10 }}>
        {kind === "STOCK" || kind === "FUTURE" ? (
          <button type="button" data-testid="trade-express-option" onClick={onOpenOptions} style={{ background: "none", border: "none", color: GOLD, fontSize: 11, cursor: "pointer" }}>
            Express it with an option →
          </button>
        ) : null}
        <button type="button" onClick={onOpenPaper} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, textDecoration: "underline", cursor: "pointer" }}>Alpaca paper account</button>
      </footer>
    </section>
  );
}
