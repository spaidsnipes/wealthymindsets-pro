"use client";

/**
 * AlpacaTradingPanel — Full trade ticket + account dashboard
 * Connects to /api/alpaca-trading (uses server-side ALPACA_KEY/SECRET from .env.local)
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, TrendingUp, TrendingDown, RefreshCw, Loader2, CheckCircle2,
  AlertCircle, ChevronDown, Activity, DollarSign, BarChart3,
  Clock, Trash2,
} from "lucide-react";
import { clsx } from "clsx";

/* ── Types ─────────────────────────────────────────────── */
interface AlpacaAccount {
  status:        string;
  cash:          string;
  equity:        string;
  buying_power:  string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  account_number: string;
  _env:          string;
  _connected:    boolean;
}

interface Position {
  symbol:          string;
  qty:             string;
  avg_entry_price: string;
  current_price:   string;
  market_value:    string;
  unrealized_pl:   string;
  unrealized_plpc: string;
  side:            string;
}

interface Order {
  id:            string;
  symbol:        string;
  qty:           string;
  filled_qty:    string;
  side:          string;
  type:          string;
  status:        string;
  submitted_at:  string;
  filled_avg_price: string | null;
  limit_price:   string | null;
}

type OrderSide = "buy" | "sell";
type OrderType = "market" | "limit" | "stop" | "stop_limit";
type TimeInForce = "day" | "gtc" | "ioc" | "fok";
type ActiveTab = "trade" | "positions" | "orders" | "account";

/* ── helpers ─────────────────────────────────────────── */
const fmt$ = (v: string | number | null | undefined, digits = 2) => {
  const n = parseFloat(String(v ?? "0"));
  if (isNaN(n)) return "—";
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};

const fmtPct = (v: string | null | undefined) => {
  const n = parseFloat(String(v ?? "0")) * 100;
  if (isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};

const fmtTime = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
};

/* ── Panel ────────────────────────────────────────────── */
export function AlpacaTradingPanel({
  onClose,
  defaultSymbol = "AAPL",
}: {
  onClose: () => void;
  defaultSymbol?: string;
}) {
  const [account,   setAccount]   = useState<AlpacaAccount | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [acctError, setAcctError] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("trade");

  // Order ticket state
  const [symbol,      setSymbol]      = useState(defaultSymbol.toUpperCase());
  const [side,        setSide]        = useState<OrderSide>("buy");
  const [orderType,   setOrderType]   = useState<OrderType>("market");
  const [qty,         setQty]         = useState("1");
  const [limitPrice,  setLimitPrice]  = useState("");
  const [stopPrice,   setStopPrice]   = useState("");
  const [tif,         setTif]         = useState<TimeInForce>("day");
  const [orderStatus, setOrderStatus] = useState<"idle" | "submitting" | "filled" | "error">("idle");
  const [orderMsg,    setOrderMsg]    = useState("");
  const [orderResult, setOrderResult] = useState<Order | null>(null);

  const loadAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/alpaca-trading?action=account", { cache: "no-store" });
      const data = await res.json();
      if (data.error) { setAcctError(data.error); setLoading(false); return; }
      setAccount(data as AlpacaAccount);
      setAcctError("");
    } catch (e) { setAcctError(String(e)); }
    setLoading(false);
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      const res  = await fetch("/api/alpaca-trading?action=positions", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setPositions(data);
    } catch {}
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const res  = await fetch("/api/alpaca-trading?action=orders&status=all", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data.slice(0, 20));
    } catch {}
  }, []);

  useEffect(() => {
    loadAccount();
    loadPositions();
    loadOrders();
  }, [loadAccount, loadPositions, loadOrders]);

  const refresh = () => {
    setLoading(true);
    Promise.all([loadAccount(), loadPositions(), loadOrders()]);
  };

  const placeOrder = async () => {
    if (!symbol.trim()) { setOrderMsg("Symbol required"); setOrderStatus("error"); return; }
    if (!qty || parseFloat(qty) <= 0) { setOrderMsg("Quantity must be > 0"); setOrderStatus("error"); return; }
    if ((orderType === "limit" || orderType === "stop_limit") && !limitPrice) {
      setOrderMsg("Limit price required"); setOrderStatus("error"); return;
    }
    if ((orderType === "stop" || orderType === "stop_limit") && !stopPrice) {
      setOrderMsg("Stop price required"); setOrderStatus("error"); return;
    }

    setOrderStatus("submitting");
    setOrderMsg("");
    setOrderResult(null);

    try {
      const body: Record<string, unknown> = {
        action:        "order",
        symbol:        symbol.trim().toUpperCase(),
        qty:           parseFloat(qty),
        side,
        type:          orderType,
        time_in_force: tif,
      };
      if (limitPrice) body.limit_price = parseFloat(limitPrice);
      if (stopPrice)  body.stop_price  = parseFloat(stopPrice);

      const res  = await fetch("/api/alpaca-trading", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (data.error) {
        setOrderStatus("error");
        setOrderMsg(data.error);
        return;
      }

      setOrderResult(data as Order);
      setOrderStatus("filled");
      setOrderMsg(`Order submitted: ${data.id?.slice(0, 8)}…`);
      // Refresh positions + orders after 1s
      setTimeout(() => { loadPositions(); loadOrders(); loadAccount(); }, 1200);

    } catch (e) {
      setOrderStatus("error");
      setOrderMsg(String(e));
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await fetch(`/api/alpaca-trading?action=order&id=${orderId}`, { method: "DELETE" });
      loadOrders();
    } catch {}
  };

  const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "trade",     label: "Trade",     icon: <TrendingUp size={12} /> },
    { id: "positions", label: `Positions${positions.length ? ` (${positions.length})` : ""}`, icon: <BarChart3 size={12} /> },
    { id: "orders",    label: "Orders",    icon: <Clock size={12} /> },
    { id: "account",   label: "Account",   icon: <DollarSign size={12} /> },
  ];

  const isLive = account?._env === "Live Trading";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-start justify-end"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ x: 440 }}
        animate={{ x: 0 }}
        exit={{ x: 440 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative h-full flex flex-col border-l border-wm-border bg-wm-dark shadow-2xl"
        style={{ width: 400 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-wm-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
              style={{ background: "rgba(255,206,0,0.15)", border: "1.5px solid rgba(255,206,0,0.4)", color: "#FFCE00" }}>
              A
            </div>
            <div>
              <div className="text-sm font-black text-wm-text">Alpaca Trading</div>
              <div className="flex items-center gap-1.5">
                {loading ? (
                  <Loader2 size={9} className="animate-spin text-wm-text-dim" />
                ) : account ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: isLive ? "#ef4444" : "#00C076" }} />
                    <span className="text-[9px] font-bold" style={{ color: isLive ? "#ef4444" : "#00C076" }}>
                      {isLive ? "LIVE" : "PAPER"} · {account.account_number}
                    </span>
                  </>
                ) : (
                  <span className="text-[9px] text-wm-red font-bold">NOT CONNECTED</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={refresh} className="p-1.5 rounded text-wm-text-dim hover:text-wm-text hover:bg-wm-surface transition-colors">
              <RefreshCw size={13} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded text-wm-text-dim hover:text-wm-text hover:bg-wm-surface transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Account error ── */}
        {acctError && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg text-[11px] text-wm-red flex items-center gap-2"
            style={{ background: "rgba(255,77,106,0.08)", border: "1px solid rgba(255,77,106,0.2)" }}>
            <AlertCircle size={12} className="shrink-0" />
            {acctError}
          </div>
        )}

        {/* ── Quick stats bar ── */}
        {account && !acctError && (
          <div className="grid grid-cols-3 gap-px border-b border-wm-border shrink-0" style={{ background: "#1E2030" }}>
            {[
              { label: "Cash",          val: fmt$(account.cash) },
              { label: "Equity",        val: fmt$(account.equity) },
              { label: "Buying Power",  val: fmt$(account.buying_power) },
            ].map(({ label, val }) => (
              <div key={label} className="px-3 py-2 text-center" style={{ background: "#0D1017" }}>
                <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">{label}</div>
                <div className="text-[13px] font-black text-wm-text mt-0.5">{val}</div>
              </div>
            ))}
          </div>
        )}

        {/* LIVE trading warning */}
        {isLive && (
          <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg text-[10px] font-bold text-wm-red flex items-center gap-1.5 shrink-0"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE TRADING — Real money at risk. Verify orders before submitting.
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex border-b border-wm-border shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-bold transition-colors",
                activeTab === t.id
                  ? "text-wm-green border-b-2 border-wm-green bg-wm-green/5"
                  : "text-wm-text-muted hover:text-wm-text"
              )}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>

          {/* ─── TRADE TAB ─── */}
          {activeTab === "trade" && (
            <div className="p-4 space-y-3">
              {/* Symbol */}
              <div>
                <label className="block text-[10px] font-bold text-wm-text-dim uppercase tracking-wider mb-1">Symbol</label>
                <input
                  value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  placeholder="AAPL, QQQ, BTC…"
                  className="w-full px-3 py-2 rounded-lg text-[13px] font-bold text-wm-text outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              {/* Side */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSide("buy")}
                  className={clsx("py-2.5 rounded-lg font-black text-sm transition-all border", side === "buy"
                    ? "bg-wm-green/20 text-wm-green border-wm-green/50"
                    : "text-wm-text-muted border-wm-border hover:text-wm-text"
                  )}>
                  BUY
                </button>
                <button onClick={() => setSide("sell")}
                  className={clsx("py-2.5 rounded-lg font-black text-sm transition-all border", side === "sell"
                    ? "bg-wm-red/20 text-wm-red border-wm-red/50"
                    : "text-wm-text-muted border-wm-border hover:text-wm-text"
                  )}>
                  SELL
                </button>
              </div>

              {/* Order type + TIF */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-wm-text-dim uppercase tracking-wider mb-1">Order Type</label>
                  <select
                    value={orderType}
                    onChange={e => setOrderType(e.target.value as OrderType)}
                    className="w-full px-2 py-2 rounded-lg text-[11px] font-semibold outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#8B8FA8" }}
                  >
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                    <option value="stop">Stop</option>
                    <option value="stop_limit">Stop Limit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-wm-text-dim uppercase tracking-wider mb-1">Time in Force</label>
                  <select
                    value={tif}
                    onChange={e => setTif(e.target.value as TimeInForce)}
                    className="w-full px-2 py-2 rounded-lg text-[11px] font-semibold outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#8B8FA8" }}
                  >
                    <option value="day">Day</option>
                    <option value="gtc">GTC</option>
                    <option value="ioc">IOC</option>
                    <option value="fok">FOK</option>
                  </select>
                </div>
              </div>

              {/* Qty */}
              <div>
                <label className="block text-[10px] font-bold text-wm-text-dim uppercase tracking-wider mb-1">Quantity (shares)</label>
                <input
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="1"
                  className="w-full px-3 py-2 rounded-lg text-[13px] font-bold text-wm-text outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                {/* Quick qty buttons */}
                <div className="flex gap-1 mt-1.5">
                  {[1, 5, 10, 25, 100].map(n => (
                    <button key={n} onClick={() => setQty(String(n))}
                      className="flex-1 py-1 rounded text-[10px] font-bold text-wm-text-dim hover:text-wm-text hover:bg-wm-surface border border-wm-border/50 transition-all">
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Limit price */}
              {(orderType === "limit" || orderType === "stop_limit") && (
                <div>
                  <label className="block text-[10px] font-bold text-wm-text-dim uppercase tracking-wider mb-1">Limit Price</label>
                  <input
                    value={limitPrice}
                    onChange={e => setLimitPrice(e.target.value)}
                    type="number" min="0" step="0.01" placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg text-[13px] font-bold text-wm-text outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
              )}

              {/* Stop price */}
              {(orderType === "stop" || orderType === "stop_limit") && (
                <div>
                  <label className="block text-[10px] font-bold text-wm-text-dim uppercase tracking-wider mb-1">Stop Price</label>
                  <input
                    value={stopPrice}
                    onChange={e => setStopPrice(e.target.value)}
                    type="number" min="0" step="0.01" placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg text-[13px] font-bold text-wm-text outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
              )}

              {/* Submit */}
              <button
                onClick={placeOrder}
                disabled={orderStatus === "submitting" || !account}
                className={clsx(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-50",
                  side === "buy"
                    ? "bg-wm-green/20 text-wm-green border border-wm-green/40 hover:bg-wm-green/30"
                    : "bg-wm-red/20 text-wm-red border border-wm-red/40 hover:bg-wm-red/30"
                )}
              >
                {orderStatus === "submitting" && <Loader2 size={14} className="animate-spin" />}
                {orderStatus === "submitting"
                  ? "Submitting…"
                  : `${side.toUpperCase()} ${qty || "0"} ${symbol} — ${orderType.toUpperCase().replace("_", " ")}`}
              </button>

              {/* Order result */}
              <AnimatePresence>
                {orderStatus !== "idle" && orderStatus !== "submitting" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={clsx(
                      "px-3 py-2.5 rounded-xl text-[11px] font-semibold flex items-start gap-2",
                      orderStatus === "filled"
                        ? "bg-wm-green/10 text-wm-green border border-wm-green/25"
                        : "bg-wm-red/10 text-wm-red border border-wm-red/25"
                    )}
                  >
                    {orderStatus === "filled"
                      ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                      : <AlertCircle size={13} className="mt-0.5 shrink-0" />}
                    <div>
                      {orderMsg}
                      {orderResult && (
                        <div className="mt-1 text-[10px] opacity-70">
                          ID: {orderResult.id?.slice(0, 8)}… · Status: {orderResult.status}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!account && !loading && (
                <div className="text-center text-[11px] text-wm-text-dim py-4">
                  Alpaca account not connected. Check <code className="text-wm-text">.env.local</code> keys.
                </div>
              )}
            </div>
          )}

          {/* ─── POSITIONS TAB ─── */}
          {activeTab === "positions" && (
            <div className="p-3 space-y-2">
              {positions.length === 0 ? (
                <div className="text-center py-12 text-wm-text-dim text-[12px]">
                  <Activity size={28} className="mx-auto mb-3 opacity-30" />
                  No open positions
                </div>
              ) : positions.map(pos => {
                const pl = parseFloat(pos.unrealized_pl ?? "0");
                const pos_color = pl >= 0 ? "#00C076" : "#FF4D67";
                return (
                  <div key={pos.symbol} className="rounded-xl p-3 border border-wm-border bg-wm-card">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-black text-sm text-wm-text">{pos.symbol}</div>
                        <div className="text-[10px] text-wm-text-dim">{pos.qty} shares · avg {fmt$(pos.avg_entry_price)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm" style={{ color: pos_color }}>
                          {pl >= 0 ? "+" : ""}{fmt$(pos.unrealized_pl)}
                        </div>
                        <div className="text-[10px] font-semibold" style={{ color: pos_color }}>
                          {fmtPct(pos.unrealized_plpc)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-wm-text-dim">
                      <span>Mkt Val: {fmt$(pos.market_value)}</span>
                      <span>Cur: {fmt$(pos.current_price)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── ORDERS TAB ─── */}
          {activeTab === "orders" && (
            <div className="p-3 space-y-2">
              {orders.length === 0 ? (
                <div className="text-center py-12 text-wm-text-dim text-[12px]">
                  <Clock size={28} className="mx-auto mb-3 opacity-30" />
                  No recent orders
                </div>
              ) : orders.map(ord => {
                const isOpen   = ["new", "partially_filled", "accepted", "pending_new"].includes(ord.status);
                const isFilled = ord.status === "filled";
                const statusColor = isFilled ? "#00C076" : isOpen ? "#F0B429" : "#8B8FA8";
                return (
                  <div key={ord.id} className="rounded-xl p-3 border border-wm-border bg-wm-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={clsx("font-black text-xs", ord.side === "buy" ? "text-wm-green" : "text-wm-red")}>
                            {ord.side.toUpperCase()}
                          </span>
                          <span className="font-black text-sm text-wm-text">{ord.symbol}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                            style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}33` }}>
                            {ord.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[10px] text-wm-text-dim mt-0.5">
                          {ord.filled_qty}/{ord.qty} shares · {ord.type?.toUpperCase().replace("_", " ")}
                          {ord.limit_price ? ` @ ${fmt$(ord.limit_price)}` : ""}
                          {ord.filled_avg_price ? ` → filled @ ${fmt$(ord.filled_avg_price)}` : ""}
                        </div>
                        <div className="text-[9px] text-wm-text-dim mt-0.5">{fmtTime(ord.submitted_at)}</div>
                      </div>
                      {isOpen && (
                        <button onClick={() => cancelOrder(ord.id)}
                          className="p-1.5 rounded text-wm-red hover:bg-wm-red/10 transition-all shrink-0"
                          title="Cancel order">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── ACCOUNT TAB ─── */}
          {activeTab === "account" && account && (
            <div className="p-4 space-y-3">
              <div className="rounded-xl border border-wm-border bg-wm-card p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: isLive ? "#ef4444" : "#00C076" }} />
                  <span className="text-xs font-black" style={{ color: isLive ? "#ef4444" : "#00C076" }}>
                    {account._env}
                  </span>
                </div>
                {[
                  { label: "Account #",     val: account.account_number },
                  { label: "Status",        val: account.status },
                  { label: "Cash",          val: fmt$(account.cash) },
                  { label: "Equity",        val: fmt$(account.equity) },
                  { label: "Portfolio",     val: fmt$(account.portfolio_value) },
                  { label: "Buying Power",  val: fmt$(account.buying_power) },
                  { label: "PDT",           val: account.pattern_day_trader ? "YES ⚠️" : "No" },
                  { label: "Trading",       val: account.trading_blocked ? "BLOCKED" : "Active" },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center justify-between text-[11px]">
                    <span className="text-wm-text-dim">{label}</span>
                    <span className="font-bold text-wm-text">{val}</span>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-wm-text-dim text-center space-y-1">
                <div>Powered by Alpaca Securities LLC</div>
                {isLive && (
                  <div className="text-wm-red font-semibold">
                    ⚠️ This is a LIVE account. Fund at alpaca.markets before trading.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
