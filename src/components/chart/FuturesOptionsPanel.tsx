"use client";

/**
 * FUTURES OPTIONS — Garden 18 §LXXXI / §XCV / §CXXX, a sidecar over the live
 * chart opened from the instrument context strip.
 *
 * tastytrade's nested futures-option chain, read by its own spec
 * (readFuturesOptionChain): choose the SPECIFIC parent future, the expiration,
 * the strike and the side; the contract symbol is tastytrade's own
 * (`./MNQZ6 MQEV6 261016C25000`), never assembled here. Preflight is
 * tastytrade's documented dry run — the order is validated against the real
 * account and NOTHING is placed. The selection is the EXPRESSION of the chart's
 * current decision (continueOrMint — a decision is born only by this explicit
 * press when none exists), never a second thesis.
 */

import React, { useEffect, useMemo, useState } from "react";

import { readContractQuote, type ContractQuoteReading } from "@/lib/broker/tastyContractQuote";
import { useTastyQuotes } from "@/lib/broker/tastyQuoteStream";
import { futuresProductFor, readFuturesOptionChain, snapToTick, strikesNear, type FuturesOptionChain } from "@/lib/broker/tastytradeFuturesChain";
import { continueOrMint, type DecisionIdentity } from "@/lib/traderMemory/decisionIdentity";
import { thisDeviceId } from "@/lib/traderMemory/deviceIdentity";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";

const px = (n: number | null | undefined, d = 2) => (n == null ? "—" : n.toFixed(d));
const age = (ms: number | null) => (ms == null ? "—" : ms < 1000 ? "<1s" : ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60_000)}m`);
const stateColor = (r: ContractQuoteReading) => (r.state === "LIVE" ? "#7fd1a8" : GOLD);

export function FuturesOptionsPanel({ chartSymbol, price, bornDecision, onIdentity, onClose }: {
  readonly chartSymbol: string;
  readonly price: number | null;
  readonly bornDecision: DecisionIdentity | null;
  readonly onIdentity: (identity: DecisionIdentity) => void;
  readonly onClose: () => void;
}) {
  const product = futuresProductFor(chartSymbol);
  const [chain, setChain] = useState<FuturesOptionChain | null>(null);
  const [edge, setEdge] = useState<string | null>(null);
  const [parent, setParent] = useState<string>("");
  const [expiry, setExpiry] = useState<string>("");
  const [pick, setPick] = useState<{ symbol: string; streamer: string | null; strike: number; right: "CALL" | "PUT" } | null>(null);
  const [action, setAction] = useState<"Buy to Open" | "Sell to Close">("Buy to Open");
  const [qty, setQty] = useState(1);
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [positions, setPositions] = useState<string | null>(null);

  useEffect(() => {
    if (!product) { setEdge(`${chartSymbol} is not a futures market.`); return; }
    let live = true;
    setChain(null); setEdge(null); setPick(null); setAnswer(null);
    fetch(`/api/broker/tastytrade/chain?futuresOptions=${encodeURIComponent(product)}`, { cache: "no-store" })
      .then(async r => ({ status: r.status, j: await r.json().catch(() => null) }))
      .then(({ status, j }) => {
        if (!live) return;
        if (status === 403) { setEdge(j?.error ?? "These broker accounts belong to their owner only."); return; }
        if (j?.state === "NOT_CONFIGURED") { setEdge("tastytrade is not connected on this deployment yet: its refresh token (the owner's OAuth grant) is missing."); return; }
        if (j?.state !== "OK") { setEdge(`tastytrade answered: ${j?.reason ?? j?.state ?? `HTTP ${status}`}`); return; }
        const c = readFuturesOptionChain(j.data);
        if (!c.expirations.length) { setEdge(`tastytrade lists no option expirations for ${product}.`); return; }
        setChain(c);
        const first = c.futures.find(f => f.activeMonth)?.symbol ?? c.expirations[0].parent;
        setParent(first);
      })
      .catch(() => { if (live) setEdge("The chain request did not return."); });
    fetch("/api/broker/tastytrade/positions", { cache: "no-store" })
      .then(r => r.json().catch(() => null))
      .then(j => {
        if (!live || j?.state !== "OK") return;
        const all = (j.accounts as { positions?: { symbol?: string }[] }[]).flatMap(a => a.positions ?? []);
        const mine = all.filter(p => typeof p.symbol === "string" && (p.symbol.startsWith(`/${product}`) || p.symbol.startsWith(`./${product}`)));
        setPositions(`${mine.length} ${product} position${mine.length === 1 ? "" : "s"} on tastytrade · ${all.length} in all`);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [product, chartSymbol]);

  const expirations = useMemo(() => (chain?.expirations ?? []).filter(e => e.parent === parent), [chain, parent]);
  useEffect(() => { setExpiry(expirations[0]?.expiration ?? ""); setPick(null); }, [expirations]);
  const exp = expirations.find(e => e.expiration === expiry) ?? null;
  const rows = useMemo(() => strikesNear(exp?.strikes ?? [], price, 14), [exp, price]);
  const parents = useMemo(() => [...new Set((chain?.expirations ?? []).map(e => e.parent))], [chain]);
  const parentStreamer = chain?.futures.find(f => f.symbol === parent)?.streamer ?? null;

  // §LI–§LIII: the visible contracts and their parent future, on the ONE shared stream.
  const streamers = useMemo(() => {
    const xs = rows.flatMap(r => [r.callStreamer, r.putStreamer]).filter((x): x is string => !!x);
    if (parentStreamer) xs.push(parentStreamer);
    if (pick?.streamer) xs.push(pick.streamer);
    return xs;
  }, [rows, parentStreamer, pick]);
  const live = useTastyQuotes(streamers);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const read = (sym: string | null) => readContractQuote(sym ? live.quotes.get(sym) : undefined, live.stream, now);
  const parentRead = read(parentStreamer);
  const pickQ = pick?.streamer ? live.quotes.get(pick.streamer) : undefined;
  const pickRead = read(pick?.streamer ?? null);

  // The limit starts at the live mark, snapped to tastytrade's own increment —
  // once per selection, so the trader's own price is never overwritten.
  const [seeded, setSeeded] = useState<string | null>(null);
  useEffect(() => {
    if (!pick || seeded === pick.symbol || pickRead.mark == null) return;
    const snapped = snapToTick(exp?.tickSizes ?? [], pickRead.mark);
    if (snapped != null) { setLimit(String(snapped)); setSeeded(pick.symbol); }
  }, [pick, seeded, pickRead.mark, exp]);

  async function dryRun() {
    if (!pick || busy) return;
    setBusy(true);
    try {
      const born = continueOrMint(bornDecision, { cause: "EXPLICIT_INTENT", deviceId: bornDecision?.bornOnDeviceId ?? thisDeviceId(), nowMs: Date.now(), nonce: crypto.randomUUID() });
      if (!born.ok) { setAnswer(born.reason); return; }
      if (!bornDecision) onIdentity(born.identity);
      const r = await fetch("/api/broker/tastytrade/order-dry-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instrumentType: "Future Option", symbol: pick.symbol, action, qty, type: "Limit", limitPx: Number(limit), decisionId: born.identity.decisionId }),
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

  return (
    <aside
      aria-label={`${product ?? chartSymbol} futures options`}
      data-testid="futures-options-panel"
      style={{ position: "fixed", top: 108, right: 12, bottom: 12, width: "min(480px, calc(100vw - 24px))", zIndex: 60, overflowY: "auto", background: "rgba(10,9,7,0.97)", border: "1px solid rgba(201,165,92,0.45)", borderRadius: 6, padding: 12, color: "#ede6d3", fontSize: 12 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ letterSpacing: ".1em", textTransform: "uppercase", color: GOLD }}>{product ?? chartSymbol} Futures Options · tastytrade</strong>
        <button type="button" onClick={onClose} aria-label="Close futures options" style={{ color: "#C8C0AE" }}>✕</button>
      </div>
      {positions ? <p style={{ marginTop: 4, color: "#8a8271" }}>{positions}</p> : null}
      {edge ? <p role="status" style={{ marginTop: 10, color: GOLD }}>{edge}</p> : !chain ? <p role="status" style={{ marginTop: 10, color: "#8a8271" }}>Reading tastytrade's chain…</p> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "#8a8271" }}>Parent future</span>
              <select value={parent} onChange={e => setParent(e.target.value)} style={{ background: "#0b0a08", border: "1px solid #3a3326", padding: 4 }}>
                {parents.map(p => <option key={p} value={p}>{p}{chain.futures.find(f => f.symbol === p)?.activeMonth ? " · active month" : ""}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "#8a8271" }}>Expiration</span>
              <select value={expiry} onChange={e => { setExpiry(e.target.value); setPick(null); }} style={{ background: "#0b0a08", border: "1px solid #3a3326", padding: 4 }}>
                {expirations.map(e => <option key={e.expiration} value={e.expiration}>{e.expiration} · {e.dte ?? "?"}d · {e.type ?? ""} {e.settlement ?? ""}</option>)}
              </select>
            </label>
          </div>
          {exp ? <p style={{ marginTop: 6, color: MUTED }}>Option root {exp.optionRoot ?? "—"} · on {exp.parent} · strikes near {price != null ? price.toFixed(2) : "—"}</p> : null}
          <p data-testid="fop-stream" data-stream={live.stream} style={{ marginTop: 4, color: live.stream === "LIVE" ? "#7fd1a8" : GOLD, fontVariantNumeric: "tabular-nums" }}>
            {live.stream === "LIVE" ? "● tastytrade live" : live.stream === "CONNECTING" ? "Connecting to tastytrade's stream…" : live.reason ?? live.stream.replace(/_/g, " ").toLowerCase()}
            {parentStreamer ? ` · ${parent} ${parentRead.mark != null ? `${px(live.quotes.get(parentStreamer)?.bid)} × ${px(live.quotes.get(parentStreamer)?.ask)}` : parentRead.state.toLowerCase()}` : ""}
          </p>
          <table style={{ width: "100%", marginTop: 6, borderCollapse: "collapse" }}>
            <thead><tr style={{ color: MUTED }}><th style={{ textAlign: "left" }}>Call bid × ask</th><th>Strike</th><th style={{ textAlign: "right" }}>Put bid × ask</th></tr></thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.strike} style={{ borderTop: "1px solid #2a251c" }}>
                  {(["CALL", "PUT"] as const).map((right, i) => {
                    const sym = right === "CALL" ? s.call : s.put;
                    const streamer = right === "CALL" ? s.callStreamer : s.putStreamer;
                    const on = pick?.symbol === sym;
                    const q = streamer ? live.quotes.get(streamer) : undefined;
                    const r = read(streamer);
                    const cell = (
                      <button type="button" disabled={!sym} aria-pressed={on} aria-label={`${right} ${s.strike}`} data-quote-state={r.state}
                        onClick={() => { if (sym) { setPick({ symbol: sym, streamer, strike: s.strike, right }); setAnswer(null); } }}
                        title={r.state}
                        style={{ minWidth: 112, padding: "3px 6px", border: `1px solid ${on ? GOLD : "#3a3326"}`, color: on ? GOLD : "#C8C0AE", borderRadius: 3, fontVariantNumeric: "tabular-nums" }}>
                        {q?.quoteAt != null ? `${px(q.bid)} × ${px(q.ask)}` : <span style={{ color: MUTED, fontSize: 10 }}>{r.state === "WAITING FOR QUOTE" ? "waiting…" : r.state.toLowerCase()}</span>}
                      </button>
                    );
                    return i === 0
                      ? <React.Fragment key={right}><td style={{ padding: 3 }}>{cell}</td><td style={{ textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{s.strike}</td></React.Fragment>
                      : <td key={right} style={{ padding: 3, textAlign: "right" }}>{cell}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {pick ? (
            <div style={{ marginTop: 10, borderTop: "1px solid #3a3326", paddingTop: 8 }}>
              <div style={{ color: GOLD }}>{pick.symbol}</div>
              <div style={{ color: MUTED }}>{pick.right} {pick.strike} on {exp?.parent} · expires {exp?.expiration} · {exp?.settlement ?? ""}</div>
              <div data-testid="fop-reality" data-quote-state={pickRead.state} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px 8px", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                {([
                  ["Bid", `${px(pickQ?.bid)}${pickQ?.bidSize ? ` ×${pickQ.bidSize}` : ""}`],
                  ["Ask", `${px(pickQ?.ask)}${pickQ?.askSize ? ` ×${pickQ.askSize}` : ""}`],
                  ["Mark", px(pickRead.mark)],
                  ["Last", px(pickQ?.last)],
                  ["Spread", pickRead.spread != null ? `${px(pickRead.spread)} · ${px(pickRead.spreadPct, 1)}%` : "—"],
                  ["Quote age", age(pickRead.ageMs)],
                  ["Delta", px(pickQ?.delta, 3)],
                  ["IV", pickQ?.iv != null ? `${(pickQ.iv * 100).toFixed(1)}%` : "—"],
                  ["Gamma", px(pickQ?.gamma, 4)],
                  ["Theta", px(pickQ?.theta, 3)],
                  ["Vega", px(pickQ?.vega, 3)],
                  ["Vol · OI", `${pickQ?.dayVolume ?? "—"} · ${pickQ?.openInterest ?? "—"}`],
                ] as const).map(([k, v]) => (
                  <div key={k}><div style={{ color: MUTED, fontSize: 10 }}>{k}</div><div>{v}</div></div>
                ))}
              </div>
              <p style={{ marginTop: 4, color: stateColor(pickRead) }}>
                {pickRead.state === "LIVE" ? "Live quote" : pickRead.state === "ONE-SIDED" ? "One-sided market — no mark" : pickRead.state === "WAITING FOR QUOTE" ? "Contract discovered · waiting for its first quote" : pickRead.state === "NOT CONNECTED" ? "tastytrade's stream is not connected" : pickRead.state === "STREAM DEGRADED" ? (live.reason ?? "Stream degraded — reconnecting") : "Quote is stale"}
                {" · "}<span style={{ color: MUTED }}>Mark is the midpoint, not a guaranteed fill.</span>
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 6 }}>
                <select value={action} onChange={e => setAction(e.target.value as typeof action)} style={{ background: "#0b0a08", border: "1px solid #3a3326", padding: 4 }}>
                  <option>Buy to Open</option><option>Sell to Close</option>
                </select>
                <input type="number" min={1} step={1} value={qty} onChange={e => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))} aria-label="Contracts" style={{ background: "#0b0a08", border: "1px solid #3a3326", padding: 4 }} />
                <input inputMode="decimal" value={limit} onChange={e => setLimit(e.target.value)} placeholder="Limit" aria-label="Limit price" style={{ background: "#0b0a08", border: "1px solid #3a3326", padding: 4 }} />
              </div>
              <button type="button" data-testid="fop-dry-run" disabled={busy || !(Number(limit) > 0)} onClick={() => void dryRun()}
                style={{ marginTop: 8, padding: "6px 12px", border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 3, opacity: busy || !(Number(limit) > 0) ? 0.5 : 1 }}>
                {busy ? "Asking tastytrade…" : bornDecision ? "Dry run on tastytrade" : "Begin decision · dry run on tastytrade"}
              </button>
              {answer ? <p role="status" style={{ marginTop: 6, color: answer.includes("accepted") ? "#7fd1a8" : GOLD }}>{answer}</p> : null}
              <p style={{ marginTop: 4, color: "#8a8271" }}>A dry run validates the order against your account and places nothing.</p>
            </div>
          ) : null}
        </>
      )}
    </aside>
  );
}
