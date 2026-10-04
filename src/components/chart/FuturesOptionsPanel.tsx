"use client";

/**
 * FUTURES OPTIONS — Garden 18 §LII–§LXIV, a sidecar over the live chart.
 *
 * Modelled on the trader's own tastytrade futures-option trade screen (read
 * beside it, 2026-10-01): the parent future's live quote on top, an expiration
 * rail with DTE and IVx ± expected move, CALLS | STRIKE | PUTS with live
 * Greeks, the underlying's price line between strikes, click the BID to sell
 * or the ASK to buy, and a ticket with BID · MID · ASK, quantity taps, debit /
 * max loss / max profit / breakeven / Δ$ / Θ$ — in WM's own material, and with
 * what a broker screen does not carry: the decision on the chart, honest quote
 * states, the trader's guardrails, a dry run before money and an armed send.
 *
 * Every contract symbol is tastytrade's own (never assembled); every price is
 * the one DXLink stream; every $ figure uses the expiry's own multiplier
 * (notional-value ÷ display-factor). A missing value is named, never blank.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";

import { TastytradeLiveOrder } from "@/components/chart/TastytradeLiveOrder";

import { expectedMove, readFopTicket } from "@/lib/broker/fopTicket";
import { isOwnerRefusal } from "@/lib/broker/ownerRefusal";
import { readContractQuote, type ContractQuoteState } from "@/lib/broker/tastyContractQuote";
import { useTastyQuotes } from "@/lib/broker/tastyQuoteStream";
import { firstLiveExpiration, futuresProductFor, readEquityOptionChain, readFuturesOptionChain, snapToTick, strikesNear, tickFor, type FopExpiration, type FuturesOptionChain } from "@/lib/broker/tastytradeFuturesChain";
import { continueOrMint, type DecisionIdentity } from "@/lib/traderMemory/decisionIdentity";
import { thisDeviceId } from "@/lib/traderMemory/deviceIdentity";

// ── WM material ────────────────────────────────────────────────────────────
const GOLD = "#C9A55C";
const GOLD_SOFT = "rgba(201,165,92,.14)";
const INK = "#ede6d3";
const MUTED = "#8a8271";
const LINE = "rgba(201,165,92,.18)";
const GREEN = "#7fd1a8";
const RED = "#e0786b";
const PANEL = "linear-gradient(180deg, rgba(14,12,9,.985), rgba(8,7,5,.985))";
const MONO: React.CSSProperties = { fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' };

const px = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? "—" : n.toFixed(d));
const usd = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? "—" : `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const grp = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? "—" : n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));
const ageWords = (ms: number | null) => (ms == null ? "—" : ms < 1000 ? "<1s" : ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60_000)}m`);

type Columns = "DELTA_THETA" | "GAMMA_VEGA" | "IV_OI";
type Show = "CALLS" | "BOTH" | "PUTS";
type Side = "BUY" | "SELL";
type Effect = "OPEN" | "CLOSE";
interface Pick { symbol: string; streamer: string | null; strike: number; right: "CALL" | "PUT" }

const COLS: Record<Columns, readonly [string, string]> = { DELTA_THETA: ["Δ", "Θ"], GAMMA_VEGA: ["Γ", "Vega"], IV_OI: ["IV", "OI"] };
function colVals(q: ContractQuoteState | undefined, c: Columns): [string, string] {
  if (!q) return ["—", "—"];
  if (c === "DELTA_THETA") return [px(q.delta, 2), px(q.theta, 3)];
  if (c === "GAMMA_VEGA") return [px(q.gamma, 4), px(q.vega, 3)];
  return [q.iv != null ? `${(q.iv * 100).toFixed(1)}%` : "—", q.openInterest != null ? String(Math.round(q.openInterest)) : "—"];
}

/** When this expiration's options stop trading, as epoch ms (tastytrade's own instant, else 16:00 ET on the date). */
function expiryMs(e: FopExpiration | null): number | null {
  if (!e) return null;
  if (e.stopsTradingAt) { const t = Date.parse(e.stopsTradingAt); if (Number.isFinite(t)) return t; }
  const t = Date.parse(`${e.expiration}T20:00:00Z`);
  return Number.isFinite(t) ? t : null;
}
const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
const typeTag = (t: string | null) => (!t ? "" : /end.?of.?month/i.test(t) ? "EOM" : /quarter/i.test(t) ? "Q" : /regular|monthly/i.test(t) ? "M" : /weekly/i.test(t) ? "W" : t.slice(0, 3).toUpperCase());

const chip = (on: boolean): React.CSSProperties => ({
  minHeight: 26, padding: "0 10px", borderRadius: 3, whiteSpace: "nowrap", cursor: "pointer",
  border: `1px solid ${on ? "rgba(201,165,92,.75)" : LINE}`, background: on ? GOLD_SOFT : "transparent", color: on ? GOLD : INK,
  font: "700 10.5px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".06em",
});

export function FuturesOptionsPanel({ chartSymbol, initialOptionSymbol = null, price, bornDecision, onIdentity, onClose, onExpression }: {
  readonly chartSymbol: string;
  readonly initialOptionSymbol?: string | null;
  readonly price: number | null;
  readonly bornDecision: DecisionIdentity | null;
  readonly onIdentity: (identity: DecisionIdentity) => void;
  readonly onClose: () => void;
  /** Equity only: the Expression / Contract Lens flow (§LXI–§LXIV), one door away. */
  readonly onExpression?: () => void;
}) {
  // Garden 18 §LX: ONE options experience. A future reads its futures-option
  // chain; anything else reads the equity chain into the SAME shape (the
  // underlying stands where the parent future stands). Different economics —
  // the expiry's multiplier, the order's instrument type — one interaction.
  const futuresProduct = futuresProductFor(chartSymbol);
  const equity = futuresProduct == null;
  const product = futuresProduct ?? chartSymbol.trim().toUpperCase();
  const optionType = equity ? "Equity Option" : "Future Option";
  const [chain, setChain] = useState<FuturesOptionChain | null>(null);
  const [edge, setEdge] = useState<string | null>(null);
  const [parent, setParent] = useState("");
  const [expiry, setExpiry] = useState("");
  const [show, setShow] = useState<Show>("BOTH");
  const [columns, setColumns] = useState<Columns>("DELTA_THETA");
  const [strikeCount, setStrikeCount] = useState(16);
  const [pick, setPick] = useState<Pick | null>(null);
  const [side, setSide] = useState<Side>("BUY");
  const [effect, setEffect] = useState<Effect>("OPEN");
  const [qty, setQty] = useState(1);
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [positions, setPositions] = useState<string | null>(null);
  const [orders, setOrders] = useState<{ tail: string; id: string; state: string; symbol: string | null; action: string | null; quantity: number | null; filled: number | null; price: string | null }[] | null>(null);

  // §LXXV: today's orders at tastytrade, re-read from the broker while open.
  useEffect(() => {
    let live = true;
    const pull = () => fetch("/api/broker/tastytrade/orders", { cache: "no-store" })
      .then(r => r.json().catch(() => null))
      .then(j => {
        if (!live || j?.state !== "OK") return;
        setOrders((j.accounts as { tail: string; orders: { id: string; state: string; symbol: string | null; action: string | null; quantity: number | null; filled: number | null; price: string | null }[] }[])
          .flatMap(a => a.orders.map(o => ({ tail: a.tail, ...o }))));
      })
      .catch(() => {});
    void pull();
    const t = setInterval(pull, 10_000);
    return () => { live = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!product) { setEdge(`${chartSymbol} has no option chain to read.`); return; }
    let live = true;
    setChain(null); setEdge(null); setPick(null); setAnswer(null);
    fetch(equity ? `/api/broker/tastytrade/chain?symbol=${encodeURIComponent(product)}` : `/api/broker/tastytrade/chain?futuresOptions=${encodeURIComponent(product)}`, { cache: "no-store" })
      .then(async r => ({ status: r.status, j: await r.json().catch(() => null) }))
      .then(({ status, j }) => {
        if (!live) return;
        // guest audit 2026-10-04: the owner gate's sentence ("belong to another user") is not for a guest's eyes.
        if (isOwnerRefusal(j, status)) { setEdge("Option chains need a broker connection that isn't available on your account yet."); return; }
        if (status === 403) { setEdge(j?.error ?? "Option chains aren't available on your account."); return; }
        if (j?.state === "NOT_CONFIGURED") { setEdge("tastytrade is not connected on this deployment yet."); return; }
        if (j?.state !== "OK") { setEdge(`tastytrade answered: ${j?.reason ?? j?.state ?? `HTTP ${status}`}`); return; }
        const c = equity ? readEquityOptionChain(j.data) : readFuturesOptionChain(j.data);
        if (!c.expirations.length) { setEdge(`tastytrade lists no option expirations for ${product}.`); return; }
        setChain(c);
        // The month on the chart leads (/MNQH7); a continuous chart opens on the active month.
        const charted = chartSymbol.trim().toUpperCase();
        const chartedParent = c.expirations.some(e => e.parent === charted) ? charted : null;
        setParent(chartedParent ?? c.futures.find(f => f.activeMonth)?.symbol ?? c.expirations[0].parent);
      })
      .catch(() => { if (live) setEdge("The chain request did not return."); });
    fetch("/api/broker/tastytrade/positions", { cache: "no-store" })
      .then(r => r.json().catch(() => null))
      .then(j => {
        if (!live || j?.state !== "OK") return;
        const all = (j.accounts as { positions?: { symbol?: string }[] }[]).flatMap(a => a.positions ?? []);
        const mine = all.filter(p => typeof p.symbol === "string" && (equity
          ? p.symbol === product || p.symbol.startsWith(`${product} `)
          : p.symbol.startsWith(`/${product}`) || p.symbol.startsWith(`./${product}`)));
        setPositions(`${mine.length} ${product} position${mine.length === 1 ? "" : "s"} · ${all.length} in all`);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [product, chartSymbol, equity]);

  const expirations = useMemo(() => (chain?.expirations ?? []).filter(e => e.parent === parent), [chain, parent]);
  useEffect(() => { setExpiry(firstLiveExpiration(expirations, Date.now())?.expiration ?? ""); setPick(null); }, [expirations]);
  const searchSelectionApplied = useRef<string | null>(null);
  useEffect(() => {
    if (!chain || !initialOptionSymbol || searchSelectionApplied.current === initialOptionSymbol) return;
    for (const e of chain.expirations) for (const row of e.strikes) {
      const right = row.call === initialOptionSymbol ? "CALL" : row.put === initialOptionSymbol ? "PUT" : null;
      if (!right) continue;
      if (parent !== e.parent) { setParent(e.parent); return; }
      if (expiry !== e.expiration) { setExpiry(e.expiration); return; }
      setPick({ symbol: initialOptionSymbol, streamer: right === "CALL" ? row.callStreamer : row.putStreamer, strike: row.strike, right });
      searchSelectionApplied.current = initialOptionSymbol;
      return;
    }
  }, [chain, parent, expiry, initialOptionSymbol]);
  const exp = expirations.find(e => e.expiration === expiry) ?? null;
  const parents = useMemo(() => [...new Set((chain?.expirations ?? []).map(e => e.parent))], [chain]);
  const parentStreamer = chain?.futures.find(f => f.symbol === parent)?.streamer ?? null;

  // The parent's live quote centres the chain (the chart's price only until it arrives).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const parentOnly = useTastyQuotes(parentStreamer ? [parentStreamer] : []);
  const parentQ = parentStreamer ? parentOnly.quotes.get(parentStreamer) : undefined;
  const parentMark = parentQ?.bid != null && parentQ?.ask != null ? (parentQ.bid + parentQ.ask) / 2 : parentQ?.last ?? null;
  const center = parentMark ?? price;
  const rows = useMemo(() => strikesNear(exp?.strikes ?? [], center, strikeCount), [exp, center, strikeCount]);

  const streamers = useMemo(() => {
    const xs = rows.flatMap(r => [r.callStreamer, r.putStreamer]).filter((x): x is string => !!x);
    if (pick?.streamer) xs.push(pick.streamer);
    return xs;
  }, [rows, pick]);
  const live = useTastyQuotes(streamers);
  const q = (s: string | null) => (s ? live.quotes.get(s) : undefined);

  // IVx and the expected move, from the at-the-money options (estimate, labelled).
  const atm = useMemo(() => (center == null ? null : rows.reduce<typeof rows[number] | null>((b, r) => (!b || Math.abs(r.strike - center) < Math.abs(b.strike - center) ? r : b), null)), [rows, center]);
  const atmIvs = [q(atm?.callStreamer ?? null)?.iv, q(atm?.putStreamer ?? null)?.iv].filter((x): x is number => x != null && x > 0);
  const ivx = atmIvs.length ? atmIvs.reduce((a, b) => a + b, 0) / atmIvs.length : null;
  const expMs = expiryMs(exp);
  const em = expectedMove(center, ivx, expMs != null ? expMs - now : null);

  // ── the ticket ───────────────────────────────────────────────────────────
  const pickQ = q(pick?.streamer ?? null);
  const pickRead = readContractQuote(pickQ, live.stream, now);
  const action = (side === "BUY" ? (effect === "OPEN" ? "Buy to Open" : "Buy to Close") : (effect === "OPEN" ? "Sell to Open" : "Sell to Close")) as "Buy to Open" | "Buy to Close" | "Sell to Open" | "Sell to Close";
  const tiers = exp?.tickSizes ?? [];
  const limitNum = Number(limit) > 0 ? Number(limit) : null;
  const ticket = pick ? readFopTicket({ side, right: pick.right, strike: pick.strike, qty, limit: limitNum, multiplier: exp?.multiplier ?? null, delta: pickQ?.delta ?? null, theta: pickQ?.theta ?? null }) : null;

  // The limit starts at the side's touch (ask to buy, bid to sell) once per contract + side.
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!pick) return;
    const key = `${pick.symbol}|${side}`;
    if (seededFor.current === key) return;
    const touch = side === "BUY" ? pickQ?.ask : pickQ?.bid;
    const ref = touch ?? pickRead.mark;
    if (ref == null) return;
    const snapped = snapToTick(tiers, ref);
    if (snapped != null) { setLimit(String(snapped)); seededFor.current = key; }
  }, [pick, side, pickQ?.ask, pickQ?.bid, pickRead.mark, tiers]);

  const choose = (p: Pick, s: Side) => { setPick(p); setSide(s); setEffect("OPEN"); setAnswer(null); seededFor.current = null; };
  const nudge = (dir: 1 | -1) => {
    const cur = limitNum ?? pickRead.mark ?? 0;
    const t = tickFor(tiers, cur) ?? 0.25;
    const next = snapToTick(tiers, Math.max(t, cur + dir * t));
    if (next != null) setLimit(String(next));
  };
  const setTo = (v: number | null) => { if (v == null) return; const s = snapToTick(tiers, v); if (s != null) setLimit(String(s)); };

  // The ONE decision every order from this panel expresses.
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
    if (!pick || busy || limitNum == null) return;
    setBusy(true);
    try {
      const decisionId = ensureDecision();
      if (!decisionId) return;
      const r = await fetch("/api/broker/tastytrade/order-dry-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instrumentType: optionType, symbol: pick.symbol, action, qty, type: "Limit", limitPx: limitNum, decisionId }),
      });
      const j = await r.json().catch(() => null);
      if (j?.state === "DRY_RUN_OK") {
        const bp = j.result?.["buying-power-effect"];
        const fee = j.result?.["fee-calculation"];
        setAnswer(`tastytrade accepted the dry run${bp?.["change-in-buying-power"] ? ` · buying power ${bp["change-in-buying-power-effect"] === "Debit" ? "−" : "+"}${bp["change-in-buying-power"]}` : ""}${fee?.["total-fees"] ? ` · fees ${fee["total-fees"]}` : ""} — nothing was placed.`);
      } else {
        setAnswer(`${(j?.state ?? `HTTP ${r.status}`).replace(/_/g, " ")}${j?.reason ? ` · ${j.reason}` : ""}`);
      }
    } catch {
      setAnswer("The dry run did not return.");
    } finally {
      setBusy(false);
    }
  }

  // ── Trade the future itself ───────────────────────────────────────────────
  const [futAction, setFutAction] = useState<"Buy to Open" | "Sell to Open" | "Buy to Close" | "Sell to Close">("Buy to Open");
  const [futQty, setFutQty] = useState(1);
  const [futLimit, setFutLimit] = useState("");
  const [futSeeded, setFutSeeded] = useState<string | null>(null);
  useEffect(() => {
    const key = `${parent}|${futAction.startsWith("Buy") ? "B" : "S"}`;
    if (futSeeded === key) return;
    const touch = futAction.startsWith("Buy") ? parentQ?.ask : parentQ?.bid;
    if (touch != null) { setFutLimit(String(touch)); setFutSeeded(key); }
  }, [parent, futAction, parentQ?.ask, parentQ?.bid, futSeeded]);

  const chg = parentMark != null && parentQ?.prevClose != null ? parentMark - parentQ.prevClose : null;
  const streamWords = live.stream === "LIVE" || parentOnly.stream === "LIVE" ? "LIVE" : live.stream === "CONNECTING" ? "CONNECTING" : (live.reason ?? live.stream.replace(/_/g, " "));
  const [c1, c2] = COLS[columns];
  const priceRowIndex = center == null ? -1 : rows.findIndex(r => r.strike > center);
  // Open (and re-open per expiry) centred on the price line, like the broker screen.
  const chainRef = useRef<HTMLDivElement | null>(null);
  const priceRowRef = useRef<HTMLTableRowElement | null>(null);
  const centredFor = useRef<string | null>(null);
  useEffect(() => {
    const key = `${parent}|${expiry}|${strikeCount}`;
    if (centredFor.current === key || !priceRowRef.current || !chainRef.current) return;
    const box = chainRef.current, row = priceRowRef.current;
    box.scrollTop = Math.max(0, row.offsetTop - box.clientHeight / 2);
    centredFor.current = key;
  });

  // ── render ───────────────────────────────────────────────────────────────
  const cellBtn = (on: boolean, tone: "bid" | "ask", disabled: boolean): React.CSSProperties => ({
    width: "100%", padding: "4px 6px", textAlign: "right", borderRadius: 2, cursor: disabled ? "default" : "pointer",
    border: `1px solid ${on ? GOLD : "transparent"}`, background: on ? GOLD_SOFT : "transparent",
    color: disabled ? MUTED : tone === "bid" ? "#e3b8a8" : "#a9d9c2", ...MONO,
  });

  return (
    <aside
      aria-label={`${product} ${equity ? "options" : "futures options"}`}
      data-testid="futures-options-panel"
      // §XIV: never over the live edge — the forming candle, the price line
      // and the newest bars stay beside the chain (serving TSLA/MNQ 15m,
      // 2026-10-01: an 860px sheet anchored right hid all three).
      style={{ position: "fixed", top: 108, left: 12, bottom: 12, width: "min(860px, calc(100vw - 24px))", zIndex: 60, display: "flex", flexDirection: "column",
        background: PANEL, border: "1px solid rgba(201,165,92,.42)", borderRadius: 8, boxShadow: "0 24px 64px rgba(0,0,0,.55), inset 0 1px 0 rgba(201,165,92,.12)", color: INK, fontSize: 12, overflow: "hidden" }}
    >
      {/* ── HEADER: the parent future, live ── */}
      <header style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: GOLD, letterSpacing: ".14em", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase" }}>{product} {equity ? "Options" : "Futures Options"}</div>
          <div style={{ color: MUTED, fontSize: 10.5 }}>tastytrade · {positions ?? "reading positions…"}</div>
        </div>
        {chain && !equity ? (
          <select aria-label="Parent future" value={parent} onChange={e => setParent(e.target.value)}
            style={{ background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: "5px 8px", borderRadius: 3, fontWeight: 700 }}>
            {parents.map(p => <option key={p} value={p}>{p}{chain.futures.find(f => f.symbol === p)?.activeMonth ? " · active" : ""}</option>)}
          </select>
        ) : null}
        <div data-testid="fop-stream" data-stream={live.stream} style={{ display: "flex", alignItems: "baseline", gap: 10, ...MONO }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.01em" }}>{grp(parentMark, 2)}</span>
          {chg != null ? <span style={{ color: chg >= 0 ? GREEN : RED, fontWeight: 700 }}>{chg >= 0 ? "+" : "−"}{grp(Math.abs(chg), 2)} ({((chg / (parentQ!.prevClose as number)) * 100).toFixed(2)}%)</span> : null}
          <span style={{ color: MUTED }}>{px(parentQ?.bid)} × {px(parentQ?.ask)}</span>
          <span style={{ color: streamWords === "LIVE" ? GREEN : GOLD, fontSize: 10.5, fontWeight: 700 }}>● {streamWords}</span>
        </div>
        <span style={{ flex: 1 }} />
        {equity && onExpression ? (
          <button type="button" data-testid="options-expression-door" onClick={onExpression}
            title="Trade the underlying, express it with the option — Contract Lens and Intent Shortlist"
            style={{ ...chip(false), minHeight: 24 }}>Expression · Contract Lens</button>
        ) : null}
        <button type="button" onClick={onClose} aria-label={equity ? "Close options" : "Close futures options"} style={{ color: "#C8C0AE", fontSize: 16, padding: "0 4px" }}>✕</button>
      </header>

      {edge ? <p role="status" style={{ margin: 14, color: GOLD }}>{edge}</p> : !chain ? <p role="status" style={{ margin: 14, color: MUTED }}>Reading tastytrade&apos;s chain…</p> : (
        <>
          {/* ── EXPIRATION RAIL ── */}
          <nav aria-label="Expirations" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 14px", borderBottom: `1px solid ${LINE}`, scrollbarWidth: "thin", scrollbarColor: "rgba(201,165,92,.35) transparent", flexShrink: 0 }}>
            {expirations.slice(0, 24).map(e => (
              <button key={e.expiration} type="button" aria-pressed={e.expiration === expiry} onClick={() => { setExpiry(e.expiration); setPick(null); }} style={{ ...chip(e.expiration === expiry), minHeight: 34, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
                <span>{shortDate(e.expiration)}</span>
                <span style={{ color: e.expiration === expiry ? GOLD : MUTED, fontWeight: 600, letterSpacing: 0 }}>{e.dte ?? "?"}d · {typeTag(e.type)} {e.settlement ?? ""}</span>
              </button>
            ))}
          </nav>

          {/* The charted month has no options in tastytrade's chain: say which month these settle into. */}
          {/^\/[A-Z0-9]{1,4}[FGHJKMNQUVXZ]\d{1,2}$/.test(chartSymbol.trim().toUpperCase()) && !parents.includes(chartSymbol.trim().toUpperCase()) && parent ? (
            <div data-testid="fop-other-month" role="status" style={{ padding: "6px 14px", fontSize: 11.5, color: GOLD, borderBottom: `1px solid ${LINE}` }}>
              tastytrade lists no options on {chartSymbol.trim().toUpperCase()} yet. These settle into {parent}.
            </div>
          ) : null}
          {/* ── EXPIRY FACTS + CONTROLS ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 14px", borderBottom: `1px solid ${LINE}` }}>
            <span data-testid="fop-ivx" style={MONO}>
              <span style={{ color: MUTED }}>IVx </span><strong>{ivx != null ? `${(ivx * 100).toFixed(1)}%` : "—"}</strong>
              <span style={{ color: MUTED }}> · expected move </span><strong style={{ color: GOLD }}>{em != null ? `±${grp(em, 2)}` : "—"}</strong>
              <span style={{ color: MUTED }}> (est. from ATM IV)</span>
            </span>
            <span style={{ color: MUTED }}>${exp?.multiplier ?? "?"}/pt · root {exp?.optionRoot ?? "—"}{expMs ? ` · stops ${new Date(expMs).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}</span>
            <span style={{ flex: 1 }} />
            {(["CALLS", "BOTH", "PUTS"] as Show[]).map(s => <button key={s} type="button" aria-pressed={show === s} onClick={() => setShow(s)} style={chip(show === s)}>{s === "BOTH" ? "Calls · Puts" : s === "CALLS" ? "Calls" : "Puts"}</button>)}
            <select aria-label="Strikes shown" value={strikeCount} onChange={e => setStrikeCount(Number(e.target.value))} style={{ background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: "4px 6px", borderRadius: 3 }}>
              {[10, 16, 24, 40].map(n => <option key={n} value={n}>{n} strikes</option>)}
            </select>
            <select aria-label="Columns" value={columns} onChange={e => setColumns(e.target.value as Columns)} style={{ background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: "4px 6px", borderRadius: 3 }}>
              <option value="DELTA_THETA">Δ · Θ</option><option value="GAMMA_VEGA">Γ · Vega</option><option value="IV_OI">IV · OI</option>
            </select>
          </div>

          {/* ── THE CHAIN ── */}
          {/* The chain keeps at least ~8 rows on glass even with the ticket open. */}
          <div ref={chainRef} style={{ flex: 1, minHeight: 230, overflowY: "auto", scrollbarColor: "rgba(201,165,92,.35) transparent" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", ...MONO }}>
              <thead style={{ position: "sticky", top: 0, background: "#0d0b08", zIndex: 1 }}>
                <tr style={{ color: MUTED, fontSize: 10.5, letterSpacing: ".06em" }}>
                  {show !== "PUTS" ? <><th style={{ padding: "6px 6px", textAlign: "right" }}>{c2}</th><th style={{ textAlign: "right" }}>{c1}</th><th style={{ textAlign: "right" }}>BID</th><th style={{ textAlign: "right" }}>ASK</th></> : null}
                  <th style={{ textAlign: "center", color: GOLD, minWidth: 74 }}>{show === "PUTS" ? "STRIKE" : show === "CALLS" ? "STRIKE" : "CALLS · STRIKE · PUTS"}</th>
                  {show !== "CALLS" ? <><th style={{ textAlign: "right" }}>BID</th><th style={{ textAlign: "right" }}>ASK</th><th style={{ textAlign: "right" }}>{c1}</th><th style={{ textAlign: "right", paddingRight: 10 }}>{c2}</th></> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => {
                  const cq = q(s.callStreamer), pq = q(s.putStreamer);
                  const callItm = center != null && s.strike < center;
                  const putItm = center != null && s.strike > center;
                  const [cv1, cv2] = colVals(cq, columns);
                  const [pv1, pv2] = colVals(pq, columns);
                  const isPick = (sym: string | null, sd: Side) => pick?.symbol === sym && side === sd;
                  const callP: Pick | null = s.call ? { symbol: s.call, streamer: s.callStreamer, strike: s.strike, right: "CALL" } : null;
                  const putP: Pick | null = s.put ? { symbol: s.put, streamer: s.putStreamer, strike: s.strike, right: "PUT" } : null;
                  const priceRow = i === priceRowIndex && center != null ? (
                    <tr key={`px-${s.strike}`} aria-hidden ref={priceRowRef}>
                      <td colSpan={9} style={{ padding: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 10px" }}>
                          <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
                          <span style={{ color: GOLD, fontWeight: 700, fontSize: 10.5, letterSpacing: ".08em" }}>◆ {parent} {grp(center, 2)}</span>
                          <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
                        </div>
                      </td>
                    </tr>
                  ) : null;
                  return (
                    <React.Fragment key={s.strike}>
                      {priceRow}
                      <tr style={{ borderTop: "1px solid rgba(201,165,92,.07)" }}>
                        {show !== "PUTS" ? (
                          <>
                            <td style={{ padding: "1px 6px", textAlign: "right", color: MUTED, background: callItm ? "rgba(127,209,168,.045)" : undefined }}>{cv2}</td>
                            <td style={{ textAlign: "right", color: MUTED, background: callItm ? "rgba(127,209,168,.045)" : undefined }}>{cv1}</td>
                            <td style={{ background: callItm ? "rgba(127,209,168,.045)" : undefined }}>
                              <button type="button" disabled={!callP} aria-label={`Sell ${s.strike} call at the bid`} data-quote-state={readContractQuote(cq, live.stream, now).state}
                                onClick={() => callP && choose(callP, "SELL")} style={cellBtn(isPick(s.call, "SELL"), "bid", !callP)} title="Click the bid to SELL">{cq?.quoteAt != null ? px(cq.bid) : "…"}</button>
                            </td>
                            <td style={{ background: callItm ? "rgba(127,209,168,.045)" : undefined }}>
                              <button type="button" disabled={!callP} aria-label={`Buy ${s.strike} call at the ask`} data-quote-state={readContractQuote(cq, live.stream, now).state}
                                onClick={() => callP && choose(callP, "BUY")} style={cellBtn(isPick(s.call, "BUY"), "ask", !callP)} title="Click the ask to BUY">{cq?.quoteAt != null ? px(cq.ask) : "…"}</button>
                            </td>
                          </>
                        ) : null}
                        <td style={{ textAlign: "center", fontWeight: 700, color: atm?.strike === s.strike ? GOLD : INK, background: "rgba(201,165,92,.05)" }}>{grp(s.strike, s.strike % 1 ? 2 : 0)}</td>
                        {show !== "CALLS" ? (
                          <>
                            <td style={{ background: putItm ? "rgba(224,120,107,.045)" : undefined }}>
                              <button type="button" disabled={!putP} aria-label={`Sell ${s.strike} put at the bid`} data-quote-state={readContractQuote(pq, live.stream, now).state}
                                onClick={() => putP && choose(putP, "SELL")} style={cellBtn(isPick(s.put, "SELL"), "bid", !putP)} title="Click the bid to SELL">{pq?.quoteAt != null ? px(pq.bid) : "…"}</button>
                            </td>
                            <td style={{ background: putItm ? "rgba(224,120,107,.045)" : undefined }}>
                              <button type="button" disabled={!putP} aria-label={`Buy ${s.strike} put at the ask`} data-quote-state={readContractQuote(pq, live.stream, now).state}
                                onClick={() => putP && choose(putP, "BUY")} style={cellBtn(isPick(s.put, "BUY"), "ask", !putP)} title="Click the ask to BUY">{pq?.quoteAt != null ? px(pq.ask) : "…"}</button>
                            </td>
                            <td style={{ textAlign: "right", color: MUTED, background: putItm ? "rgba(224,120,107,.045)" : undefined }}>{pv1}</td>
                            <td style={{ textAlign: "right", color: MUTED, paddingRight: 10, background: putItm ? "rgba(224,120,107,.045)" : undefined }}>{pv2}</td>
                          </>
                        ) : null}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <p style={{ color: MUTED, fontSize: 10.5, padding: "6px 14px" }}>Click a <span style={{ color: "#a9d9c2" }}>ask</span> to buy, a <span style={{ color: "#e3b8a8" }}>bid</span> to sell. Shaded rows are in the money. “…” is a contract tastytrade has not quoted yet on this stream.</p>
          </div>

          {/* ── THE TICKET ── */}
          {pick ? (
            <section aria-label="Order ticket" style={{ borderTop: `1px solid rgba(201,165,92,.4)`, background: "rgba(10,9,7,.98)", padding: "8px 14px", flexShrink: 1, minHeight: 0, maxHeight: "46%", overflowY: "auto", scrollbarColor: "rgba(201,165,92,.35) transparent" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <strong style={{ color: side === "BUY" ? GREEN : RED, letterSpacing: ".08em" }}>{action.toUpperCase()}</strong>
                <strong style={MONO}>{qty} · {product} {grp(pick.strike, pick.strike % 1 ? 2 : 0)} {pick.right}</strong>
                <span style={{ color: MUTED }}>{exp ? `${shortDate(exp.expiration)} · ${exp.dte ?? "?"}d · on ${exp.parent}` : ""}</span>
                <span style={{ flex: 1 }} />
                <span style={{ color: MUTED, fontSize: 10.5 }}>{pick.symbol}</span>
                <button type="button" aria-label="Clear ticket" onClick={() => setPick(null)} style={{ color: MUTED }}>✕</button>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                {(["BUY", "SELL"] as Side[]).map(s2 => <button key={s2} type="button" aria-pressed={side === s2} onClick={() => { setSide(s2); seededFor.current = null; }} style={{ ...chip(side === s2), color: side === s2 ? (s2 === "BUY" ? GREEN : RED) : INK, borderColor: side === s2 ? (s2 === "BUY" ? GREEN : RED) : LINE }}>{s2}</button>)}
                {(["OPEN", "CLOSE"] as Effect[]).map(e2 => <button key={e2} type="button" aria-pressed={effect === e2} onClick={() => setEffect(e2)} style={chip(effect === e2)}>{e2 === "OPEN" ? "to open" : "to close"}</button>)}
                <span style={{ color: MUTED, marginLeft: 6 }}>Qty</span>
                <button type="button" aria-label="One fewer contract" onClick={() => setQty(n => Math.max(1, n - 1))} style={chip(false)}>−</button>
                <input type="number" min={1} step={1} value={qty} onChange={e => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))} aria-label="Contracts" style={{ width: 52, background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: 4, textAlign: "center", ...MONO }} />
                <button type="button" aria-label="One more contract" onClick={() => setQty(n => n + 1)} style={chip(false)}>+</button>
                {[1, 2, 3, 5].map(n => <button key={n} type="button" aria-pressed={qty === n} onClick={() => setQty(n)} style={chip(qty === n)}>{n}</button>)}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                <span style={{ color: MUTED }}>Limit</span>
                <button type="button" aria-label="One tick lower" onClick={() => nudge(-1)} style={chip(false)}>−</button>
                <input inputMode="decimal" value={limit} onChange={e => setLimit(e.target.value)} aria-label="Limit price" style={{ width: 92, background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: 4, textAlign: "right", fontWeight: 700, ...MONO }} />
                <button type="button" aria-label="One tick higher" onClick={() => nudge(1)} style={chip(false)}>+</button>
                <button type="button" onClick={() => setTo(pickQ?.bid ?? null)} style={{ ...chip(false), color: "#e3b8a8" }}>BID {px(pickQ?.bid)}</button>
                <button type="button" onClick={() => setTo(pickRead.mark)} style={chip(false)}>MID {px(pickRead.mark)}</button>
                <button type="button" onClick={() => setTo(pickQ?.ask ?? null)} style={{ ...chip(false), color: "#a9d9c2" }}>ASK {px(pickQ?.ask)}</button>
                <span style={{ color: MUTED, fontSize: 10.5 }}>tick {tickFor(tiers, limitNum ?? pickRead.mark ?? 0) ?? "—"} · Limit · Day</span>
              </div>

              <div data-testid="fop-reality" data-quote-state={pickRead.state} style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "6px 10px", marginTop: 10, ...MONO }}>
                {([
                  ["Debit / credit", ticket?.cash == null ? "—" : `${ticket.cash < 0 ? "Debit" : "Credit"} ${usd(Math.abs(ticket.cash))}`, ticket?.cash != null ? (ticket.cash < 0 ? INK : GREEN) : MUTED],
                  ["Max loss", ticket?.maxLossUnlimited ? "Unlimited" : usd(ticket?.maxLoss), ticket?.maxLossUnlimited ? RED : INK],
                  ["Max profit", ticket?.maxProfitUnlimited ? "Unlimited" : usd(ticket?.maxProfit), INK],
                  ["Breakeven", grp(ticket?.breakeven, 2), INK],
                  ["Δ $/pt", ticket?.deltaDollarsPerPoint == null ? "—" : `${ticket.deltaDollarsPerPoint >= 0 ? "+" : "−"}$${Math.abs(ticket.deltaDollarsPerPoint).toFixed(2)}`, INK],
                  ["Θ $/day", ticket?.thetaDollarsPerDay == null ? "—" : `${ticket.thetaDollarsPerDay >= 0 ? "+" : "−"}$${Math.abs(ticket.thetaDollarsPerDay).toFixed(2)}`, ticket?.thetaDollarsPerDay != null && ticket.thetaDollarsPerDay < 0 ? RED : GREEN],
                  ["Bid × size", `${px(pickQ?.bid)}${pickQ?.bidSize ? ` ×${pickQ.bidSize}` : ""}`, INK],
                  ["Ask × size", `${px(pickQ?.ask)}${pickQ?.askSize ? ` ×${pickQ.askSize}` : ""}`, INK],
                  ["Last", px(pickQ?.last), INK],
                  ["Spread", pickRead.spread != null ? `${px(pickRead.spread)} · ${px(pickRead.spreadPct, 1)}%` : "—", pickRead.spreadPct != null && pickRead.spreadPct > 10 ? GOLD : INK],
                  ["IV · Γ", `${pickQ?.iv != null ? `${(pickQ.iv * 100).toFixed(1)}%` : "—"} · ${px(pickQ?.gamma, 4)}`, INK],
                  ["Quote", `${pickRead.state === "LIVE" ? "live" : pickRead.state.toLowerCase()} · ${ageWords(pickRead.ageMs)}`, pickRead.state === "LIVE" ? GREEN : GOLD],
                ] as const).map(([k, v, color]) => (
                  <div key={k}><div style={{ color: MUTED, fontSize: 10 }}>{k}</div><div style={{ color, fontWeight: 600 }}>{v}</div></div>
                ))}
              </div>
              <p style={{ marginTop: 6, color: MUTED, fontSize: 10.5 }}>Multiplier ${exp?.multiplier ?? "?"} per point from tastytrade&apos;s own contract terms. Mark is the midpoint, not a guaranteed fill; a limit is the worst price you accept.</p>

              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                <button type="button" data-testid="fop-dry-run" disabled={busy || limitNum == null} onClick={() => void dryRun()}
                  style={{ padding: "7px 14px", border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 3, fontWeight: 700, opacity: busy || limitNum == null ? 0.5 : 1 }}>
                  {busy ? "Asking tastytrade…" : "Dry run on tastytrade"}
                </button>
                <span style={{ color: MUTED, fontSize: 10.5 }}>Validates against your real account; places nothing.</span>
              </div>
              {answer ? <p role="status" style={{ marginTop: 6, color: answer.includes("accepted") ? GREEN : GOLD }}>{answer}</p> : null}
              <TastytradeLiveOrder
                intent={{ instrumentType: optionType, symbol: pick.symbol, action, qty, limitPx: limitNum, describe: `${product} ${pick.strike} ${pick.right} · ${exp ? shortDate(exp.expiration) : ""} on ${exp?.parent ?? ""}` }}
                ensureDecision={ensureDecision}
              />
            </section>
          ) : null}

          {/* ── FOOTER: orders + trade the future ── */}
          <footer style={{ borderTop: `1px solid ${LINE}`, padding: "6px 14px", display: "grid", gap: 6 }}>
            {orders ? (
              <div data-testid="fop-orders" style={{ color: MUTED, fontSize: 11 }}>
                {orders.length === 0 ? "No tastytrade orders today." : orders.slice(0, 3).map(o => (
                  <div key={`${o.tail}-${o.id}`} style={{ color: o.state === "WORKING" || o.state === "PARTIALLY FILLED" ? GOLD : MUTED, ...MONO }}>
                    …{o.tail} · {o.state.replace(/_/g, " ")} · {o.action} {o.filled != null && o.quantity != null ? `${o.filled}/${o.quantity}` : o.quantity ?? ""} {o.symbol} {o.price ? `@ ${o.price}` : ""}
                  </div>
                ))}
              </div>
            ) : null}
            {equity ? null : <details data-testid="trade-the-future">
              <summary style={{ cursor: "pointer", color: GOLD, letterSpacing: ".06em" }}>Trade the future · {parent}</summary>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
                <select aria-label="Future order action" value={futAction} onChange={e => setFutAction(e.target.value as typeof futAction)} style={{ background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: 4 }}>
                  <option>Buy to Open</option><option>Sell to Open</option><option>Buy to Close</option><option>Sell to Close</option>
                </select>
                <input type="number" min={1} step={1} value={futQty} onChange={e => setFutQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))} aria-label="Future contracts" style={{ width: 60, background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: 4 }} />
                <input inputMode="decimal" value={futLimit} onChange={e => setFutLimit(e.target.value)} aria-label="Future limit price" style={{ width: 100, background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: 4, ...MONO }} />
                <span style={{ color: MUTED, ...MONO }}>live {px(parentQ?.bid)} × {px(parentQ?.ask)} · limit starts at the {futAction.startsWith("Buy") ? "ask" : "bid"}</span>
              </div>
              <TastytradeLiveOrder
                intent={parent ? { instrumentType: "Future", symbol: parent, action: futAction, qty: futQty, limitPx: Number(futLimit) > 0 ? Number(futLimit) : null, describe: `${parent} future` } : null}
                ensureDecision={ensureDecision}
              />
            </details>}
          </footer>
        </>
      )}
    </aside>
  );
}
