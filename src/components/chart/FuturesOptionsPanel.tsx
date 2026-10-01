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

import { futuresProductFor, readFuturesOptionChain, strikesNear, type FuturesOptionChain } from "@/lib/broker/tastytradeFuturesChain";
import { continueOrMint, type DecisionIdentity } from "@/lib/traderMemory/decisionIdentity";
import { thisDeviceId } from "@/lib/traderMemory/deviceIdentity";

const GOLD = "#C9A55C";

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
  const [pick, setPick] = useState<{ symbol: string; strike: number; right: "CALL" | "PUT" } | null>(null);
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
      style={{ position: "fixed", top: 108, right: 12, bottom: 12, width: "min(420px, calc(100vw - 24px))", zIndex: 60, overflowY: "auto", background: "rgba(10,9,7,0.97)", border: "1px solid rgba(201,165,92,0.45)", borderRadius: 6, padding: 12, color: "#ede6d3", fontSize: 12 }}
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
          {exp ? <p style={{ marginTop: 6, color: "#8a8271" }}>Option root {exp.optionRoot ?? "—"} · on {exp.parent} · strikes near {price != null ? price.toFixed(2) : "—"}</p> : null}
          <table style={{ width: "100%", marginTop: 6, borderCollapse: "collapse" }}>
            <thead><tr style={{ color: "#8a8271" }}><th style={{ textAlign: "left" }}>Call</th><th>Strike</th><th style={{ textAlign: "right" }}>Put</th></tr></thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.strike} style={{ borderTop: "1px solid #2a251c" }}>
                  {(["CALL", "PUT"] as const).map((right, i) => {
                    const sym = right === "CALL" ? s.call : s.put;
                    const on = pick?.symbol === sym;
                    const cell = (
                      <button type="button" disabled={!sym} aria-pressed={on} onClick={() => sym && setPick({ symbol: sym, strike: s.strike, right })}
                        style={{ padding: "3px 8px", border: `1px solid ${on ? GOLD : "#3a3326"}`, color: on ? GOLD : "#C8C0AE", borderRadius: 3 }}>
                        {right === "CALL" ? "Call" : "Put"}
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
              <div style={{ color: "#8a8271" }}>{pick.right} {pick.strike} on {exp?.parent} · expires {exp?.expiration} · {exp?.settlement ?? ""}</div>
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
