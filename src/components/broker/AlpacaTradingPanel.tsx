"use client";

/**
 * AlpacaTradingPanel — paper-only trade ticket + account dashboard.
 * Live execution is unavailable until the canonical firewall is certified.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, TrendingUp, RefreshCw, Loader2, CheckCircle2,
  AlertCircle, Activity, DollarSign, BarChart3,
  Clock, Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import {
  RANK_RECONCILIATION,
  DEFAULT_POSITION_STALENESS_MS,
  selectPositionTruth,
} from "@/lib/positionTruth";
import { selectExitPermission } from "@/lib/exitPermission";
import { ShellModalDrawer } from "@/components/layout/ShellModalDrawer";

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
const displayNumber = (v: unknown): number | null => {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const text = String(v).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
};

const fmt$ = (v: string | number | null | undefined, digits = 2) => {
  const n = displayNumber(v);
  if (n === null) return "UNKNOWN";
  return `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};

const fmtPct = (v: string | null | undefined) => {
  const value = displayNumber(v);
  if (value === null) return "UNKNOWN";
  const n = value * 100;
  if (!Number.isFinite(n)) return "UNKNOWN";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};

const fmtTime = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
};

/** Wall-clock for an epoch-ms observation, so "last confirmed" is a real time. */
const fmtClock = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

/** Amber: pending / estimated / caution. Never green, which would read as safe. */
const CAUTION = "#D9A441";

/* ── Panel ────────────────────────────────────────────── */
export function AlpacaTradingPanel({
  onClose,
  defaultSymbol = "AAPL",
  onSwitchBroker,
  initialTab = "positions",
  fallbackTriggerRef,
}: {
  onClose: () => void;
  defaultSymbol?: string;
  onSwitchBroker?: () => void;
  initialTab?: ActiveTab;
  fallbackTriggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [disconnected, setDisconnected] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("wm_alpaca_disconnected") === "1"
  );
  const [account,   setAccount]   = useState<AlpacaAccount | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [acctError, setAcctError] = useState("");
  // A failed load is NOT an empty book. These distinguish "you hold nothing"
  // from "we could not find out what you hold".
  const [positionsLoad, setPositionsLoad] = useState<"pending" | "ok" | "failed">("pending");
  /** When the broker last actually reconciled. null until it has ever succeeded. */
  const [positionsAsOf, setPositionsAsOf] = useState<number | null>(null);
  const positionRead = useRef<{ cancel: () => void } | null>(null);
  const orderRead = useRef<{ cancel: () => void } | null>(null);
  const accountRead = useRef<{ cancel: () => void } | null>(null);
  useEffect(() => () => positionRead.current?.cancel(), []);
  useEffect(() => () => orderRead.current?.cancel(), []);
  useEffect(() => () => accountRead.current?.cancel(), []);
  const [positionClock, setPositionClock] = useState(0);
  // Start the clock after hydration. A received snapshot must age even when
  // no rerender or new broker event happens, including tab foreground return.
  useEffect(() => {
    const update = () => setPositionClock(Date.now());
    update();
    const timer = setInterval(update, 1_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const positionSnapshotCurrent = positionsAsOf !== null &&
    positionClock >= positionsAsOf &&
    positionClock - positionsAsOf <= DEFAULT_POSITION_STALENESS_MS;
  const [ordersLoad,    setOrdersLoad]    = useState<"pending" | "ok" | "failed">("pending");
  const [cancelError,   setCancelError]   = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);

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

  // tastytrade (futures) connection status — read from the secure server route.
  // No tokens/secrets ever reach the client; this is state booleans only.
  const [ttStatus, setTtStatus] = useState<
    { configured: boolean; connected: boolean; accounts: number; quotes: boolean; note?: string } | null
  >(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/broker/tastytrade/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive) setTtStatus(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const loadAccount = useCallback(async () => {
    accountRead.current?.cancel();
    const controller = new AbortController();
    let active = true;
    const cancel = () => {
      active = false;
      clearTimeout(deadline);
      controller.abort();
    };
    const deadline = setTimeout(() => {
      if (!active) return;
      setAcctError("Account check timed out. Current account state is unverified.");
      setLoading(false);
      cancel();
    }, 12_000);
    accountRead.current = { cancel };
    try {
      const res = await fetch("/api/alpaca-trading?action=account", { cache: "no-store", signal: controller.signal });
      if (!active) return;
      const data = await res.json();
      if (!active) return;
      if (data?.error) { setAcctError(data.error); setLoading(false); return; }
      // A non-ok response whose body simply lacks an `error` field would
      // otherwise be cast straight to AlpacaAccount and rendered as an
      // account made of undefined numbers.
      if (!res.ok) {
        setAcctError(`Account request failed (${res.status}).`);
        setLoading(false);
        return;
      }
      if (!data || typeof data !== "object" || typeof data.equity === "undefined") {
        setAcctError("Account response was not in the expected shape.");
        setLoading(false);
        return;
      }
      setAccount(data as AlpacaAccount);
      setAcctError("");
    } catch (e) {
      if (active) setAcctError(String(e));
    } finally {
      if (active) setLoading(false);
      cancel();
      if (accountRead.current?.cancel === cancel) accountRead.current = null;
    }
  }, []);

  const loadPositions = useCallback(async () => {
    positionRead.current?.cancel();
    const controller = new AbortController();
    let active = true;
    const cancel = () => {
      active = false;
      clearTimeout(deadline);
      controller.abort();
    };
    const deadline = setTimeout(() => {
      if (!active) return;
      setPositionsLoad("failed");
      cancel();
    }, 12_000);
    positionRead.current = { cancel };
    try {
      const res  = await fetch("/api/alpaca-trading?action=positions", { cache: "no-store", signal: controller.signal });
      if (!active) return;
      // fetch() does not throw on 4xx/5xx — an unchecked response would leave
      // the previous (often empty) list standing as if it were confirmed.
      if (!res.ok) { setPositionsLoad("failed"); return; }
      const data = await res.json();
      if (!active) return;
      if (!Array.isArray(data)) { setPositionsLoad("failed"); return; }
      setPositions(data);
      setPositionsAsOf(Date.now());
      setPositionsLoad("ok");
    } catch {
      if (active) setPositionsLoad("failed");
    } finally {
      cancel();
      if (positionRead.current?.cancel === cancel) positionRead.current = null;
    }
  }, []);

  const loadOrders = useCallback(async () => {
    orderRead.current?.cancel();
    const controller = new AbortController();
    let active = true;
    const cancel = () => {
      active = false;
      clearTimeout(deadline);
      controller.abort();
    };
    const deadline = setTimeout(() => {
      if (!active) return;
      setOrdersLoad("failed");
      cancel();
    }, 12_000);
    orderRead.current = { cancel };
    try {
      const res  = await fetch("/api/alpaca-trading?action=orders&status=all", { cache: "no-store", signal: controller.signal });
      if (!active) return;
      if (!res.ok) { setOrdersLoad("failed"); return; }
      const data = await res.json();
      if (!active) return;
      if (!Array.isArray(data)) { setOrdersLoad("failed"); return; }
      setOrders(data.slice(0, 20));
      setOrdersLoad("ok");
    } catch {
      if (active) setOrdersLoad("failed");
    } finally {
      cancel();
      if (orderRead.current?.cancel === cancel) orderRead.current = null;
    }
  }, []);

  useEffect(() => {
    if (disconnected) { setLoading(false); return; }
    loadAccount();
    loadPositions();
    loadOrders();
  }, [loadAccount, loadPositions, loadOrders, disconnected]);

  const disconnect = () => {
    accountRead.current?.cancel();
    positionRead.current?.cancel();
    orderRead.current?.cancel();
    localStorage.setItem("wm_alpaca_disconnected", "1");
    setDisconnected(true);
    setAccount(null); setPositions([]); setOrders([]);
  };
  const reconnect = () => {
    localStorage.removeItem("wm_alpaca_disconnected");
    setDisconnected(false);
    setLoading(true);
  };

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
    setCancelError("");
    try {
      const res = await fetch(`/api/alpaca-trading?action=order&id=${orderId}`, { method: "DELETE" });
      // A rejected cancel resolves normally. Without this check a still-working
      // order looks cancelled, and the trader walks away still exposed.
      if (!res.ok) {
        setCancelError(`Cancel was not accepted (${res.status}). The order may still be working — check with your broker.`);
        loadOrders();
        return;
      }
      loadOrders();
    } catch {
      setCancelError("Cancel could not be sent. The order may still be working — check with your broker.");
    }
  };

  /**
   * §14.6 — the order button does not decide whether the trader may act. It
   * asks, so that no dependency outage can quietly take away the exit.
   *
   * The book is UNKNOWN, not flat, whenever the position refresh failed or has
   * never succeeded (§14.1). Passing null rather than 0 is the whole point:
   * 0 would let a stale screen call a real short "no position".
   */
  const ticketSymbol = symbol.trim().toUpperCase();
  const heldQty: number | null = (() => {
    if (positionsLoad !== "ok" || !positionSnapshotCurrent) return null;
    const held = positions.find(p => p.symbol?.toUpperCase() === ticketSymbol);
    if (!held) return 0;             // observed, and it is not in the book
    const n = displayNumber(held.qty);
    if (n === null) return null;
    // Alpaca reports a short as a negative qty, but the sign is not worth
    // trusting on its own: `side` is the field that always states the
    // direction. An unsigned short read as +n would turn a cover into an
    // "add to position" and refuse it during an outage.
    return held.side?.toLowerCase() === "short" ? -Math.abs(n) : n;
  })();

  const accountObserved = account !== null && !acctError && !loading;
  const exitPermission = selectExitPermission({
    side,
    qty: parseFloat(qty),
    heldQty,
    // A retained account is history, not a successful current read.
    // The canonical selector still preserves reduction of known exposure.
    accountObserved,
    degraded: [
      !accountObserved ? "Account" : null,
      heldQty === null ? "Positions" : null,
    ].filter((d): d is string => d !== null),
    inFlight: orderStatus === "submitting",
  });

  const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "trade",     label: "Trade",     icon: <TrendingUp size={12} /> },
    { id: "positions", label: `Positions${positions.length ? ` (${positions.length})` : ""}`, icon: <BarChart3 size={12} /> },
    { id: "orders",    label: "Orders",    icon: <Clock size={12} /> },
    { id: "account",   label: "Account",   icon: <DollarSign size={12} /> },
  ];

  const isLive = false;

  return (
    <ShellModalDrawer
      id="wm-alpaca-paper-account"
      titleId="wm-alpaca-paper-account-title"
      descriptionId="wm-alpaca-paper-account-description"
      title="Alpaca paper account"
      description="Paper capital only. Live brokerage access is disabled."
      closeLabel="Close Alpaca paper account"
      width={440}
      onClose={onClose}
      fallbackTriggerRef={fallbackTriggerRef}
      headerActions={
        <button type="button" onClick={refresh} aria-label="Refresh paper account"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-wm-text-muted hover:bg-wm-surface hover:text-wm-text">
          <RefreshCw size={16} aria-hidden="true" />
        </button>
      }
      footer={
        <a href="https://app.alpaca.markets/account/login" target="_blank" rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center rounded-lg border border-wm-border px-3 text-sm text-wm-text hover:bg-wm-surface">
          Open broker — select your paper account ↗
        </a>
      }
    >
        <div role="status" className="border-b border-wm-border px-4 py-2 text-[11px] text-wm-text-muted">
          {loading ? "Checking paper account…" : acctError ? "PAPER ACCOUNT UNVERIFIED — inspect positions separately." : account ? "PAPER ACCOUNT OBSERVED — positions and orders have separate status below." : "PAPER ACCOUNT UNVERIFIED"}
        </div>

        {/* ── Account error (actionable) ── */}
        {acctError && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg text-[11px] text-wm-red flex items-start gap-2"
            style={{ background: "rgba(255,77,106,0.08)", border: "1px solid rgba(255,77,106,0.2)" }}>
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>
              {/401|not authorized/i.test(acctError)
                ? "Paper trading unavailable — Alpaca paper account not authorized. Add ALPACA_PAPER_KEY / ALPACA_PAPER_SECRET (from the Alpaca paper dashboard) to enable paper trading."
                : acctError}
            </span>
          </div>
        )}

        {/* ── tastytrade (futures) connection — honest server-verified state ── */}
        {ttStatus && (ttStatus.configured || ttStatus.connected) && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg flex items-center gap-2 text-[11px]"
            style={{
              background: ttStatus.connected ? "rgba(0,192,118,0.08)" : "rgba(240,180,41,0.08)",
              border: `1px solid ${ttStatus.connected ? "rgba(0,192,118,0.25)" : "rgba(240,180,41,0.25)"}`,
            }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: ttStatus.connected ? "#00C076" : "#F0B429" }} />
            <span style={{ color: ttStatus.connected ? "#00C076" : "#F0B429" }} className="font-bold">
              tastytrade {ttStatus.connected ? "Connected" : "Configured"}
            </span>
            <span className="text-wm-text-dim">
              {ttStatus.connected
                ? `· ${ttStatus.accounts} account${ttStatus.accounts === 1 ? "" : "s"} · futures${ttStatus.quotes ? " · quotes" : ""}`
                : `· ${ttStatus.note || "finishing setup"}`}
            </span>
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

        <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg text-[10px] font-bold text-wm-blue flex items-center gap-1.5 shrink-0"
          style={{ background: "rgba(79,163,224,0.08)", border: "1px solid rgba(79,163,224,0.25)" }}>
          PAPER ONLY — Live brokerage access is disabled.
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-wm-border shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={clsx(
                "min-h-11 flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-bold transition-colors",
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

          {/* ─── DISCONNECTED STATE ─── */}
          {disconnected && (
            <div className="p-6 flex flex-col items-center justify-center text-center gap-4" style={{ minHeight: 320 }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,77,103,0.12)", border: "1.5px solid rgba(255,77,103,0.4)" }}>
                <X size={26} className="text-wm-red" />
              </div>
              <div>
                <div className="text-sm font-black text-wm-text">Alpaca Disconnected</div>
                <div className="text-[11px] text-wm-text-dim mt-1 max-w-[260px]">
                  Your Alpaca account is disconnected. Reconnect to resume trading, or switch to a different broker.
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-[240px]">
                <button onClick={reconnect}
                  className="w-full py-2.5 rounded-xl font-bold text-[12px] bg-wm-green/20 text-wm-green border border-wm-green/40 hover:bg-wm-green/30 transition-all">
                  Reconnect Alpaca
                </button>
                {onSwitchBroker && (
                  <button onClick={() => { onClose(); onSwitchBroker(); }}
                    className="w-full py-2.5 rounded-xl font-bold text-[12px] bg-wm-surface text-wm-text border border-wm-border hover:border-wm-blue/50 transition-all">
                    Switch Broker →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── TRADE TAB ─── */}
          {!disconnected && activeTab === "trade" && (
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
              {/*
                §14.6 — this used to read `disabled={... || !account}`, so a
                failed ACCOUNT BALANCE fetch greyed out SELL and trapped a
                trader in a live position. The gate is now asymmetric: an
                outage may withhold the ability to ADD risk, never to shed it.
              */}
              <button
                onClick={placeOrder}
                disabled={!exitPermission.allowed}
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

              {/* Why it is refused, or what is missing while it goes through. */}
              {exitPermission.reason && (
                <div role="status" className="text-[11px] font-semibold text-wm-text-dim">
                  {exitPermission.reason}
                </div>
              )}
              {exitPermission.allowed && exitPermission.disclosure && (
                <div className="text-[11px] font-semibold" style={{ color: CAUTION }}>
                  {exitPermission.disclosure}
                </div>
              )}

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
          {!disconnected && activeTab === "positions" && (
            <div className="p-3 space-y-2">
              {/* A failed refresh may reduce capability. It may not remove the
                  position from the screen — risk that goes invisible is the same
                  harm as a false FLAT. So this is a banner, not a replacement. */}
              {positionsLoad === "failed" && (
                <div
                  role="alert"
                  className="rounded-xl border border-wm-red/25 bg-wm-red/10 px-3 py-2.5 text-[11px] font-semibold text-wm-red"
                >
                  Could not refresh positions.
                  <div className="text-wm-text-dim text-[10px] font-normal mt-1">
                    This is not a confirmation that you hold none.
                    {positionsAsOf !== null && ` Last confirmed ${fmtClock(positionsAsOf)}.`}
                  </div>
                </div>
              )}

              {positions.length === 0 ? (
                positionsLoad === "failed" ? null : (
                  <div className="text-center py-12 text-wm-text-dim text-[12px]">
                    <Activity size={28} className="mx-auto mb-3 opacity-30" />
                    {positionsLoad === "pending" ? "Loading positions…" : positionSnapshotCurrent
                      ? "No open positions"
                      : "Last observed empty — current positions unverified"}
                  </div>
                )
              ) : positions.map(pos => {
                const pl = displayNumber(pos.unrealized_pl);
                const pos_color = pl !== null ? (pl >= 0 ? "#00C076" : "#FF4D67") : "#8B95A5";
                // §14.1 — the panel does not get to decide what is held. It asks
                // the reducer, and repeats the answer.
                const truth = selectPositionTruth({
                  reports: positionsAsOf === null ? [] : [{
                    source: "Alpaca reconciliation",
                    qty: displayNumber(pos.qty) ?? Number.NaN,
                    observedAt: positionsAsOf,
                    rank: RANK_RECONCILIATION,
                  }],
                  unobservedSources:
                    positionsLoad === "failed" ? ["the latest refresh"] : undefined,
                  now: positionClock,
                });
                return (
                  <div key={pos.symbol} className="rounded-xl p-3 border border-wm-border bg-wm-card">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-black text-sm text-wm-text">{pos.symbol}</div>
                        <div className="text-[10px] text-wm-text-dim">{pos.qty} shares · avg {fmt$(pos.avg_entry_price)}</div>
                        {truth.confidence !== "CONFIRMED" && (
                          <div className="text-[10px] font-semibold mt-0.5" style={{ color: CAUTION }}>
                            {truth.sentence}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-wm-text-muted">{positionsLoad === "failed" ? "Last observed P&L" : "Observed P&L"}</div>
                        <div className="font-bold text-sm" style={{ color: pos_color }}>
                          {pl !== null && pl >= 0 ? "+" : ""}{fmt$(pos.unrealized_pl)}
                        </div>
                        <div className="text-[10px] font-semibold" style={{ color: pos_color }}>
                          {fmtPct(pos.unrealized_plpc)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-wm-text-dim">
                      <span>Mkt Val: {fmt$(pos.market_value)}</span>
                      <span>{positionsLoad === "failed" ? "Last observed mark" : "Broker mark"}: {fmt$(pos.current_price)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── ORDERS TAB ─── */}
          {!disconnected && activeTab === "orders" && (
            <div className="p-3 space-y-2">
              {cancelError && (
                <div role="alert" className="mb-2 rounded-lg border border-wm-red/50 bg-wm-red/10 px-2.5 py-2 text-[10px] text-wm-text">
                  {cancelError}
                </div>
              )}
              {ordersLoad === "failed" && (
                <div role="alert" className="text-center py-12 text-wm-red text-[12px]">
                  <Clock size={28} className="mx-auto mb-3 opacity-40" />
                  Could not load orders.
                  <div className="text-wm-text-dim text-[10px] mt-1">
                    This is not a confirmation that you have none working.
                  </div>
                </div>
              )}
              {orders.length === 0 ? (ordersLoad === "failed" ? null : (
                <div className="text-center py-12 text-wm-text-dim text-[12px]">
                  <Clock size={28} className="mx-auto mb-3 opacity-30" />
                  {ordersLoad === "pending" ? "Loading orders…" : "No recent orders"}
                </div>
              )) : orders.map(ord => {
                const isOpen   = ["new", "partially_filled", "accepted", "pending_new"].includes(ord.status);
                const isFilled = ord.status === "filled";
                const statusColor = ordersLoad === "failed" ? "#F0B429" : isFilled ? "#00C076" : isOpen ? "#F0B429" : "#8B8FA8";
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
                            {ordersLoad === "failed" ? `Last observed status: ${ord.status.toUpperCase()}` : ord.status.toUpperCase()}
                          </span>
                        </div>
                        {ordersLoad === "failed" && (
                          <div className="text-[10px] text-wm-gold mt-1">
                            Current order state unverified. {isOpen ? "This order may still execute. " : ""}Check the broker before adding exposure.
                          </div>
                        )}
                        <div className="text-[10px] text-wm-text-dim mt-0.5">
                          {ord.filled_qty}/{ord.qty} shares · {ord.type?.toUpperCase().replace("_", " ")}
                          {ord.limit_price ? ` @ ${fmt$(ord.limit_price)}` : ""}
                          {ord.filled_avg_price ? ` → filled @ ${fmt$(ord.filled_avg_price)}` : ""}
                        </div>
                        <div className="text-[9px] text-wm-text-dim mt-0.5">{fmtTime(ord.submitted_at)}</div>
                      </div>
                      {isOpen && (
                        <button
                          onClick={() => {
                            // cancelOrder calls the Alpaca API to cancel an
                            // open order. Alpaca defaults to paper, but real
                            // accounts can be connected — treat every cancel
                            // as potentially real financial state.
                            const side = (ord.side ?? "").toUpperCase();
                            const desc = `${side} ${ord.qty} ${ord.symbol}${ord.limit_price ? ` @ ${fmt$(ord.limit_price)}` : " (market)"}`;
                            if (!window.confirm(`Cancel this open order?\n\n${desc}\n\nThe order will not execute.`)) return;
                            cancelOrder(ord.id);
                          }}
                          aria-label={`Cancel ${ord.side ?? ""} ${ord.qty} ${ord.symbol} order (requires confirmation)`}
                          className="inline-flex items-center justify-center rounded text-wm-red hover:bg-wm-red/10 transition-all shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
                          title="Cancel order"
                          style={{ minWidth: 32, minHeight: 32 }}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── ACCOUNT TAB ─── */}
          {!disconnected && activeTab === "account" && account && (
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

              {/* Disconnect + Switch Broker */}
              <div className="flex gap-2">
                <button onClick={disconnect}
                  className="flex-1 py-2.5 rounded-xl font-bold text-[12px] bg-wm-red/15 text-wm-red border border-wm-red/40 hover:bg-wm-red/25 transition-all">
                  Disconnect
                </button>
                {onSwitchBroker && (
                  <button onClick={() => { onClose(); onSwitchBroker(); }}
                    className="flex-1 py-2.5 rounded-xl font-bold text-[12px] bg-wm-surface text-wm-text border border-wm-border hover:border-wm-blue/50 transition-all">
                    Switch Broker →
                  </button>
                )}
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
    </ShellModalDrawer>
  );
}
