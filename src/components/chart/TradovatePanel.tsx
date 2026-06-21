"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { clsx } from "clsx";

/* ─── Types ─────────────────────────────────────────────── */
interface AuthState {
  token: string;
  mdToken: string;
  userId: number;
  expiry: number; // ms timestamp
}

interface Quote {
  bid: number;
  ask: number;
  last: number;
  change: number;
  changePct: number;
}

interface Position {
  id: number;
  contractId: number;
  symbol: string;
  netPos: number;
  avgPrice: number;
  pnl: number;
}

interface Order {
  id: number;
  symbol: string;
  side: "Buy" | "Sell";
  ordType: string;
  qty: number;
  price?: number;
  status: string;
  timestamp: string;
}

/* ─── Constants ──────────────────────────────────────────── */
const SYMBOLS = ["ES", "NQ", "CL", "GC", "YM", "RTY"];
const CONTRACT_MAP: Record<string, string> = {
  ES: "ESM5", NQ: "NQM5", CL: "CLN5", GC: "GCQ5", YM: "YMM5", RTY: "RTYM5",
};

/* ─── Tradovate API helper ───────────────────────────────── */
async function tvPost(endpoint: string, payload: unknown, token?: string, env = "demo") {
  const res = await fetch("/api/tradovate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, payload, token, env }),
  });
  return res.json();
}

/* ─── Panel ──────────────────────────────────────────────── */
export function TradovatePanel({ onClose }: { onClose: () => void }) {
  /* Auth */
  const [env, setEnv] = useState<"demo" | "live">("demo");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cid, setCid] = useState("");
  const [secret, setSecret] = useState("");
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [authErr, setAuthErr] = useState("");
  const [logging, setLogging] = useState(false);

  /* Quotes */
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Positions / Orders */
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  /* Order ticket */
  const [ticketSym, setTicketSym] = useState("ES");
  const [ticketSide, setTicketSide] = useState<"Buy" | "Sell">("Buy");
  const [ticketType, setTicketType] = useState<"Market" | "Limit" | "Stop">("Market");
  const [ticketQty, setTicketQty] = useState(1);
  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketStop, setTicketStop] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderMsg, setOrderMsg] = useState("");

  /* Active tab */
  const [tab, setTab] = useState<"trade" | "positions" | "orders">("trade");

  /* ── Login ──────────────────────────────────────────────── */
  const login = useCallback(async () => {
    setLogging(true);
    setAuthErr("");
    try {
      const result = await tvPost("auth/accesstokenrequest", {
        name: username,
        password,
        appId: "WealthyMindsets Pro",
        appVersion: "1.0.0",
        cid: cid ? parseInt(cid) : undefined,
        sec: secret || undefined,
      }, undefined, env);

      if (result.data?.accessToken) {
        const d = result.data;
        setAuth({
          token: d.accessToken,
          mdToken: d.mdAccessToken || d.accessToken,
          userId: d.userId,
          expiry: Date.now() + (d.expirationTime ? new Date(d.expirationTime).getTime() - Date.now() : 3600_000),
        });
      } else {
        setAuthErr(result.data?.errorText || result.data?.p || "Login failed — check credentials");
      }
    } catch (e: any) {
      setAuthErr(e.message || "Network error");
    }
    setLogging(false);
  }, [username, password, cid, secret, env]);

  /* ── MD WebSocket ───────────────────────────────────────── */
  const connectMD = useCallback((mdToken: string) => {
    const wsUrl = env === "live"
      ? "wss://md.tradovateapi.com/v1/websocket"
      : "wss://md.tradovateapi.com/v1/websocket"; // same endpoint, token differs
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Authenticate
      ws.send(`authorize\n0\n\n${mdToken}`);
    };

    let msgId = 1;
    ws.onmessage = (evt) => {
      const raw = evt.data as string;
      if (!raw || raw === "o") return;
      if (raw === "h") { ws.send("[]"); return; } // heartbeat

      const frames = raw.startsWith("a") ? JSON.parse(raw.slice(1)) as string[] : [raw];
      for (const frame of frames) {
        try {
          const msg = typeof frame === "string" ? JSON.parse(frame) : frame;
          if (!msg) continue;

          // Auth response — then subscribe to all symbols
          if (msg.i === 0 && msg.s === 200) {
            for (const sym of SYMBOLS) {
              const contract = CONTRACT_MAP[sym] || sym;
              ws.send(`md/subscribeQuote\n${msgId++}\n\n{"symbol":"${contract}"}`);
            }
            // heartbeat
            heartbeatRef.current = setInterval(() => ws.send("[]"), 2500);
          }

          // Quote data
          if (msg.d?.quotes) {
            for (const q of msg.d.quotes) {
              const sym = Object.entries(CONTRACT_MAP).find(([, v]) => v === q.contractId || q.symbol?.startsWith(v.slice(0, 2)))?.[0];
              if (!sym) continue;
              setQuotes(prev => ({
                ...prev,
                [sym]: {
                  bid: q.bid ?? prev[sym]?.bid ?? 0,
                  ask: q.ask ?? prev[sym]?.ask ?? 0,
                  last: q.price ?? q.last ?? prev[sym]?.last ?? 0,
                  change: q.netChange ?? prev[sym]?.change ?? 0,
                  changePct: q.percentChange ?? prev[sym]?.changePct ?? 0,
                },
              }));
            }
          }
        } catch { /* ignore */ }
      }
    };

    ws.onerror = () => {};
    ws.onclose = () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [env]);

  /* ── Fetch positions + orders ───────────────────────────── */
  const fetchPositions = useCallback(async () => {
    if (!auth) return;
    try {
      const res = await tvPost("position/list", {}, auth.token, env);
      if (Array.isArray(res.data)) {
        setPositions(res.data.map((p: any) => ({
          id: p.id,
          contractId: p.contractId,
          symbol: p.contract?.name || String(p.contractId),
          netPos: p.netPos,
          avgPrice: p.netPrice,
          pnl: p.openPl ?? 0,
        })));
      }
    } catch { /* skip */ }

    try {
      const res = await tvPost("order/list", {}, auth.token, env);
      if (Array.isArray(res.data)) {
        setOrders(res.data.slice(-20).reverse().map((o: any) => ({
          id: o.id,
          symbol: o.contract?.name || String(o.contractId),
          side: o.action === "Buy" ? "Buy" : "Sell",
          ordType: o.ordType || "Market",
          qty: o.totalQty,
          price: o.price,
          status: o.ordStatus,
          timestamp: o.timestamp?.slice(0, 16).replace("T", " ") || "",
        })));
      }
    } catch { /* skip */ }
  }, [auth, env]);

  /* ── Effect: connect WS + poll on auth ─────────────────── */
  useEffect(() => {
    if (!auth) return;
    connectMD(auth.mdToken);
    fetchPositions();
    const poll = setInterval(fetchPositions, 5000);
    return () => {
      clearInterval(poll);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      wsRef.current?.close();
    };
  }, [auth, connectMD, fetchPositions]);

  /* ── Place order ────────────────────────────────────────── */
  const placeOrder = useCallback(async () => {
    if (!auth) return;
    setPlacing(true);
    setOrderMsg("");
    try {
      const contract = CONTRACT_MAP[ticketSym] || ticketSym;
      const payload: Record<string, unknown> = {
        accountSpec: username,
        accountId: auth.userId,
        action: ticketSide,
        symbol: contract,
        orderQty: ticketQty,
        orderType: ticketType,
        isAutomated: false,
      };
      if (ticketType === "Limit" && ticketPrice) payload.price = parseFloat(ticketPrice);
      if (ticketType === "Stop" && ticketStop) payload.stopPrice = parseFloat(ticketStop);

      const endpoint = ticketType === "Market"
        ? "order/placeorder"
        : ticketType === "Limit"
        ? "order/placeorder"
        : "order/placeorder";

      const res = await tvPost(endpoint, payload, auth.token, env);
      if (res.data?.orderId || res.data?.id) {
        setOrderMsg(`✓ Order placed — ID ${res.data.orderId ?? res.data.id}`);
        fetchPositions();
      } else {
        setOrderMsg(`✗ ${res.data?.errorText || res.data?.failureReason || "Order rejected"}`);
      }
    } catch (e: any) {
      setOrderMsg(`✗ ${e.message}`);
    }
    setPlacing(false);
  }, [auth, username, ticketSym, ticketSide, ticketType, ticketQty, ticketPrice, ticketStop, env, fetchPositions]);

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 560, maxHeight: "90vh", overflowY: "auto",
        background: "#0e1117", border: "1px solid #2a2e39",
        borderRadius: 10, display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #2a2e39", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#1f6feb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>T</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e0e3eb" }}>Tradovate</div>
              <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>Futures Execution</div>
            </div>
            {auth && (
              <span style={{ marginLeft: 8, fontSize: 10, background: "#132a1a", color: "#26a69a", border: "1px solid #26a69a44", borderRadius: 4, padding: "2px 8px" }}>
                ● CONNECTED ({env.toUpperCase()})
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {/* ENV toggle */}
        {!auth && (
          <div style={{ padding: "12px 18px 0", display: "flex", gap: 8 }}>
            {(["demo", "live"] as const).map(e => (
              <button key={e} onClick={() => setEnv(e)} style={{
                flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid",
                borderColor: env === e ? (e === "live" ? "#f44336" : "#26a69a") : "#2a2e39",
                background: env === e ? (e === "live" ? "#2a1218" : "#132a1a") : "transparent",
                color: env === e ? (e === "live" ? "#f44336" : "#26a69a") : "#666",
                fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "uppercase",
              }}>
                {e === "live" ? "⚠ Live" : "Demo"}
              </button>
            ))}
          </div>
        )}

        {/* ── Login form ── */}
        {!auth ? (
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 11, color: "#888", background: "#111827", borderRadius: 6, padding: "8px 12px", lineHeight: 1.5 }}>
              {env === "live"
                ? "⚠ Live trading with real money. Use your Tradovate live account credentials."
                : "Demo mode — use your Tradovate demo account. Safe for testing orders."}
            </div>

            {[
              { label: "Username / Email", val: username, set: setUsername, type: "text" },
              { label: "Password", val: password, set: setPassword, type: "password" },
              { label: "Client ID (CID) — optional", val: cid, set: setCid, type: "text" },
              { label: "App Secret — optional", val: secret, set: setSecret, type: "password" },
            ].map(({ label, val, set, type }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
                <input
                  type={type}
                  value={val}
                  onChange={e => set(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && login()}
                  style={{
                    background: "#161b22", border: "1px solid #2a2e39", borderRadius: 6,
                    color: "#e0e3eb", fontSize: 13, padding: "8px 10px", outline: "none",
                  }}
                  placeholder={type === "password" ? "••••••••" : ""}
                />
              </div>
            ))}

            {authErr && <div style={{ fontSize: 12, color: "#f44336", background: "#2a1218", borderRadius: 6, padding: "8px 12px" }}>{authErr}</div>}

            <button
              onClick={login}
              disabled={logging || !username || !password}
              style={{
                padding: "10px 0", borderRadius: 7, border: "none",
                background: logging || !username || !password ? "#1a2332" : "#1f6feb",
                color: logging || !username || !password ? "#555" : "#fff",
                fontSize: 13, fontWeight: 700, cursor: logging || !username || !password ? "default" : "pointer",
                marginTop: 4,
              }}
            >
              {logging ? "Connecting…" : `Connect to Tradovate ${env === "live" ? "Live" : "Demo"}`}
            </button>

            <div style={{ fontSize: 10, color: "#555", textAlign: "center" }}>
              Don&apos;t have an account?{" "}
              <a href="https://trader.tradovate.com/sign-up" target="_blank" rel="noreferrer" style={{ color: "#1f6feb" }}>
                Open a Tradovate demo account
              </a>
            </div>
          </div>
        ) : (
          /* ── Authenticated UI ── */
          <>
            {/* Live quotes strip */}
            <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid #1a1e2d", padding: "8px 12px", gap: 10 }}>
              {SYMBOLS.map(sym => {
                const q = quotes[sym];
                const up = (q?.change ?? 0) >= 0;
                return (
                  <div key={sym} style={{
                    minWidth: 90, background: "#0d1117", border: "1px solid #1a1e2d",
                    borderRadius: 6, padding: "5px 8px", cursor: "pointer",
                    borderColor: ticketSym === sym ? "#1f6feb" : "#1a1e2d",
                  }} onClick={() => setTicketSym(sym)}>
                    <div style={{ fontSize: 10, color: "#888", fontWeight: 700 }}>{sym}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e3eb" }}>
                      {q?.last ? q.last.toFixed(2) : "—"}
                    </div>
                    <div style={{ fontSize: 10, color: up ? "#26a69a" : "#ef5350" }}>
                      {q ? `${up ? "+" : ""}${q.change.toFixed(2)} (${q.changePct.toFixed(2)}%)` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #1a1e2d" }}>
              {(["trade", "positions", "orders"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: "9px 0", border: "none",
                  borderBottom: tab === t ? "2px solid #1f6feb" : "2px solid transparent",
                  background: "transparent", color: tab === t ? "#e0e3eb" : "#666",
                  fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
                  cursor: "pointer",
                }}>
                  {t === "positions" ? `Positions (${positions.filter(p => p.netPos !== 0).length})` : t === "orders" ? `Orders` : "Trade"}
                </button>
              ))}
            </div>

            {/* Trade tab */}
            {tab === "trade" && (
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Symbol */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SYMBOLS.map(sym => (
                    <button key={sym} onClick={() => setTicketSym(sym)} style={{
                      padding: "5px 12px", borderRadius: 5, border: "1px solid",
                      borderColor: ticketSym === sym ? "#1f6feb" : "#2a2e39",
                      background: ticketSym === sym ? "#1a2a4a" : "transparent",
                      color: ticketSym === sym ? "#58a6ff" : "#888",
                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                    }}>{sym}</button>
                  ))}
                </div>

                {/* Side */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setTicketSide("Buy")} style={{
                    flex: 1, padding: "10px 0", borderRadius: 7, border: "1px solid",
                    borderColor: ticketSide === "Buy" ? "#26a69a" : "#2a2e39",
                    background: ticketSide === "Buy" ? "#132a1a" : "transparent",
                    color: ticketSide === "Buy" ? "#26a69a" : "#555",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>▲ BUY / LONG</button>
                  <button onClick={() => setTicketSide("Sell")} style={{
                    flex: 1, padding: "10px 0", borderRadius: 7, border: "1px solid",
                    borderColor: ticketSide === "Sell" ? "#ef5350" : "#2a2e39",
                    background: ticketSide === "Sell" ? "#2a1218" : "transparent",
                    color: ticketSide === "Sell" ? "#ef5350" : "#555",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>▼ SELL / SHORT</button>
                </div>

                {/* Order type */}
                <div style={{ display: "flex", gap: 6 }}>
                  {(["Market", "Limit", "Stop"] as const).map(t => (
                    <button key={t} onClick={() => setTicketType(t)} style={{
                      flex: 1, padding: "6px 0", borderRadius: 5, border: "1px solid",
                      borderColor: ticketType === t ? "#8b5cf6" : "#2a2e39",
                      background: ticketType === t ? "#1e1535" : "transparent",
                      color: ticketType === t ? "#a78bfa" : "#666",
                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                    }}>{t}</button>
                  ))}
                </div>

                {/* Qty */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Quantity (Contracts)</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1, 2, 5, 10].map(n => (
                      <button key={n} onClick={() => setTicketQty(n)} style={{
                        flex: 1, padding: "6px 0", borderRadius: 5, border: "1px solid",
                        borderColor: ticketQty === n ? "#f59e0b" : "#2a2e39",
                        background: ticketQty === n ? "#1e1a0f" : "transparent",
                        color: ticketQty === n ? "#f59e0b" : "#666",
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}>{n}</button>
                    ))}
                    <input
                      type="number" min={1} value={ticketQty}
                      onChange={e => setTicketQty(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{
                        width: 60, background: "#161b22", border: "1px solid #2a2e39",
                        borderRadius: 5, color: "#e0e3eb", fontSize: 12, padding: "6px 8px", textAlign: "center",
                      }}
                    />
                  </div>
                </div>

                {/* Price fields */}
                {ticketType === "Limit" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Limit Price</label>
                    <input type="number" step="0.25" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)}
                      placeholder={quotes[ticketSym]?.last?.toFixed(2) || "0.00"}
                      style={{ background: "#161b22", border: "1px solid #2a2e39", borderRadius: 6, color: "#e0e3eb", fontSize: 13, padding: "8px 10px" }} />
                  </div>
                )}
                {ticketType === "Stop" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Stop Price</label>
                    <input type="number" step="0.25" value={ticketStop} onChange={e => setTicketStop(e.target.value)}
                      placeholder={quotes[ticketSym]?.last?.toFixed(2) || "0.00"}
                      style={{ background: "#161b22", border: "1px solid #2a2e39", borderRadius: 6, color: "#e0e3eb", fontSize: 13, padding: "8px 10px" }} />
                  </div>
                )}

                {/* Market preview */}
                {quotes[ticketSym] && (
                  <div style={{ background: "#0d1117", borderRadius: 6, padding: "8px 12px", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888" }}>
                    <span>Bid: <b style={{ color: "#ef5350" }}>{quotes[ticketSym].bid.toFixed(2)}</b></span>
                    <span>Last: <b style={{ color: "#e0e3eb" }}>{quotes[ticketSym].last.toFixed(2)}</b></span>
                    <span>Ask: <b style={{ color: "#26a69a" }}>{quotes[ticketSym].ask.toFixed(2)}</b></span>
                  </div>
                )}

                {orderMsg && (
                  <div style={{
                    fontSize: 12, padding: "8px 12px", borderRadius: 6,
                    background: orderMsg.startsWith("✓") ? "#132a1a" : "#2a1218",
                    color: orderMsg.startsWith("✓") ? "#26a69a" : "#f44336",
                    border: `1px solid ${orderMsg.startsWith("✓") ? "#26a69a44" : "#f4433644"}`,
                  }}>{orderMsg}</div>
                )}

                {/* Place button */}
                <button
                  onClick={placeOrder}
                  disabled={placing}
                  style={{
                    padding: "12px 0", borderRadius: 7, border: "none",
                    background: placing ? "#1a2332" : ticketSide === "Buy" ? "#26a69a" : "#ef5350",
                    color: placing ? "#555" : "#fff",
                    fontSize: 14, fontWeight: 800, cursor: placing ? "default" : "pointer",
                    letterSpacing: "0.04em",
                  }}
                >
                  {placing ? "Placing…" : `${ticketSide.toUpperCase()} ${ticketQty} ${ticketSym} ${ticketType.toUpperCase()}`}
                </button>

                <div style={{ fontSize: 10, color: "#444", textAlign: "center" }}>
                  Orders route via Tradovate {env} environment · Not financial advice
                </div>
              </div>
            )}

            {/* Positions tab */}
            {tab === "positions" && (
              <div style={{ padding: 12 }}>
                {positions.filter(p => p.netPos !== 0).length === 0 ? (
                  <div style={{ textAlign: "center", color: "#555", padding: "40px 0", fontSize: 13 }}>No open positions</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ color: "#555", borderBottom: "1px solid #1a1e2d" }}>
                        {["Symbol", "Size", "Avg Price", "P&L"].map(h => (
                          <th key={h} style={{ padding: "6px 8px", textAlign: h === "Symbol" ? "left" : "right", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {positions.filter(p => p.netPos !== 0).map(p => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #0d1117" }}>
                          <td style={{ padding: "8px 8px", color: "#e0e3eb", fontWeight: 700 }}>{p.symbol}</td>
                          <td style={{ padding: "8px 8px", textAlign: "right", color: p.netPos > 0 ? "#26a69a" : "#ef5350" }}>
                            {p.netPos > 0 ? "+" : ""}{p.netPos}
                          </td>
                          <td style={{ padding: "8px 8px", textAlign: "right", color: "#888" }}>{p.avgPrice?.toFixed(2)}</td>
                          <td style={{ padding: "8px 8px", textAlign: "right", color: p.pnl >= 0 ? "#26a69a" : "#ef5350", fontWeight: 700 }}>
                            {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <button onClick={fetchPositions} style={{ margin: "12px auto 0", display: "block", background: "transparent", border: "1px solid #2a2e39", color: "#666", borderRadius: 5, padding: "5px 16px", fontSize: 11, cursor: "pointer" }}>
                  Refresh
                </button>
              </div>
            )}

            {/* Orders tab */}
            {tab === "orders" && (
              <div style={{ padding: 12 }}>
                {orders.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#555", padding: "40px 0", fontSize: 13 }}>No recent orders</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ color: "#555", borderBottom: "1px solid #1a1e2d" }}>
                        {["Symbol", "Side", "Type", "Qty", "Price", "Status", "Time"].map(h => (
                          <th key={h} style={{ padding: "6px 6px", textAlign: "left", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id} style={{ borderBottom: "1px solid #0d1117" }}>
                          <td style={{ padding: "6px 6px", color: "#e0e3eb", fontWeight: 700 }}>{o.symbol}</td>
                          <td style={{ padding: "6px 6px", color: o.side === "Buy" ? "#26a69a" : "#ef5350", fontWeight: 700 }}>{o.side}</td>
                          <td style={{ padding: "6px 6px", color: "#888" }}>{o.ordType}</td>
                          <td style={{ padding: "6px 6px", color: "#e0e3eb" }}>{o.qty}</td>
                          <td style={{ padding: "6px 6px", color: "#888" }}>{o.price?.toFixed(2) || "MKT"}</td>
                          <td style={{ padding: "6px 6px", color: o.status === "Filled" ? "#26a69a" : o.status === "Canceled" ? "#666" : "#f59e0b" }}>{o.status}</td>
                          <td style={{ padding: "6px 6px", color: "#555" }}>{o.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Disconnect */}
            <div style={{ padding: "10px 18px", borderTop: "1px solid #1a1e2d", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { wsRef.current?.close(); setAuth(null); setQuotes({}); setPositions([]); setOrders([]); }}
                style={{ background: "transparent", border: "1px solid #2a2e39", color: "#666", borderRadius: 5, padding: "5px 16px", fontSize: 11, cursor: "pointer" }}>
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
