"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Zap, Minimize2, Maximize2,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  RefreshCw, Link2,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */
interface Msg {
  role: "user" | "assistant";
  content: string;
  tradeOrder?: TradeOrder | null;
  orderResult?: OrderResult | null;
}

interface TradeOrder {
  side: "buy" | "sell";
  symbol: string;
  qty: number;
  type: "market" | "limit" | "stop" | "stop_limit" | "trailing_stop";
  limit_price?: number;
  stop_price?: number;
  trail_percent?: number;
}

interface OrderResult {
  ok: boolean;
  order_id?: string;
  status?: string;
  side?: string;
  qty?: string;
  symbol?: string;
  error?: string;
}

interface AlpacaKeys { key: string; secret: string }

/* ── Quick direct command parser ───────────────────────────── */
// Handles: "buy 5 TSLA market" | "sell 2 AAPL limit 220" | "buy 1 NVDA stop 800"
function parseDirectCommand(text: string): TradeOrder | null {
  const t = text.trim().toLowerCase();
  const buyMatch  = t.match(/^(buy|sell)\s+(\d+(?:\.\d+)?)\s+([a-z0-9!.]+)(?:\s+(market|limit|stop|trailing))?(?:\s+(?:at\s+|@\s*)?(\d+(?:\.\d+)?))?(?:\s+trail\s+(\d+(?:\.\d+)?)%?)?/i);
  if (!buyMatch) return null;

  const side      = buyMatch[1].toLowerCase() as "buy" | "sell";
  const qty       = parseFloat(buyMatch[2]);
  const symbol    = buyMatch[3].toUpperCase();
  const orderType = (buyMatch[4] ?? "market").toLowerCase();
  const price     = buyMatch[5] ? parseFloat(buyMatch[5]) : undefined;
  const trail     = buyMatch[6] ? parseFloat(buyMatch[6]) : undefined;

  if (isNaN(qty) || qty <= 0) return null;

  const order: TradeOrder = { side, symbol, qty, type: "market" };

  if (orderType === "limit" && price) {
    order.type = "limit";
    order.limit_price = price;
  } else if (orderType === "stop" && price) {
    order.type = "stop";
    order.stop_price = price;
  } else if (orderType === "trailing" || trail) {
    order.type = "trailing_stop";
    order.trail_percent = trail ?? 1;
  }

  return order;
}

/* ── Parse TRADE_ORDER JSON from Claude response ────────────── */
function parseBotTradeOrder(text: string): TradeOrder | null {
  const match = text.match(/TRADE_ORDER:\s*(\{[\s\S]*?\})/);
  if (!match) return null;
  try { return JSON.parse(match[1]) as TradeOrder; } catch { return null; }
}

function stripTradeTag(text: string) {
  return text.replace(/TRADE_ORDER:\s*\{[\s\S]*?\}/g, "").trim();
}

function renderMd(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code style='background:rgba(255,255,255,0.08);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:10px'>$1</code>")
    .replace(/\n/g, "<br/>");
}

/* ── Suggestions ────────────────────────────────────────────── */
const SUGGESTIONS = [
  "Buy 5 TSLA market",
  "What's the NQ setup right now?",
  "Sell 2 AAPL limit 215",
  "Explain order flow",
  "My open positions",
  "Buy 1 NVDA stop 780",
];

/* ── Trade Confirmation Card ────────────────────────────────── */
function TradeCard({ order, keys, onDone }: {
  order: TradeOrder;
  keys: AlpacaKeys | null;
  onDone: (result: OrderResult | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const isBuy = order.side === "buy";
  const color = isBuy ? "#00D4AA" : "#FF4D6A";

  const confirm = async () => {
    if (!keys) { onDone({ ok: false, error: "No Alpaca keys — connect Alpaca in Broker panel first." }); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/alpaca/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...order, key: keys.key, secret: keys.secret, paper: true }),
      });
      const data = await res.json() as OrderResult & { error?: string };
      setDone(true);
      onDone(data);
    } catch (e) {
      onDone({ ok: false, error: String(e) });
    } finally { setLoading(false); }
  };

  if (done) return null;

  return (
    <div className="rounded-xl border p-3 mt-2 space-y-2" style={{
      background: `${color}0D`, borderColor: `${color}40`,
    }}>
      {/* Title */}
      <div className="flex items-center gap-2 font-black text-[13px]" style={{ color }}>
        {isBuy ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
        {keys ? "PAPER " : ""}{order.side.toUpperCase()} — {order.symbol}
        {!keys && <span className="text-[9px] font-normal text-wm-text-dim ml-auto">⚠️ No broker connected</span>}
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-1 text-[11px]">
        <span className="text-wm-text-dim">Qty: <strong className="text-wm-text">{order.qty}</strong></span>
        <span className="text-wm-text-dim">Type: <strong className="text-wm-text">{order.type}</strong></span>
        {order.limit_price   && <span className="text-wm-text-dim">Limit: <strong className="text-wm-text">${order.limit_price}</strong></span>}
        {order.stop_price    && <span className="text-wm-text-dim">Stop: <strong className="text-wm-text">${order.stop_price}</strong></span>}
        {order.trail_percent && <span className="text-wm-text-dim">Trail: <strong className="text-wm-text">{order.trail_percent}%</strong></span>}
      </div>

      <p className="text-[9px] text-wm-text-dim flex items-center gap-1">
        <AlertTriangle size={9} className="text-wm-gold shrink-0"/>
        {keys ? "Simulated paper trade — no real money" : "Connect Alpaca paper account to execute"}
      </p>

      <div className="flex gap-2">
        <button onClick={confirm} disabled={loading || !keys}
          className="flex-1 py-1.5 rounded-lg font-bold text-[11px] transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
          style={{ background: `${color}25`, color, border: `1px solid ${color}50` }}>
          {loading ? <RefreshCw size={11} className="animate-spin"/> : <CheckCircle2 size={11}/>}
          {loading ? "Placing…" : "Execute Order"}
        </button>
        <button onClick={() => onDone(null)}
          className="px-3 py-1.5 rounded-lg text-[11px] text-wm-text-dim hover:text-wm-text border border-wm-border transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Order Result Banner ────────────────────────────────────── */
function OrderBanner({ result }: { result: OrderResult }) {
  if (!result) return null;
  const ok = result.ok;
  return (
    <div className="rounded-xl border p-2.5 mt-2 text-[11px]" style={{
      background: ok ? "rgba(0,212,170,0.08)" : "rgba(255,77,106,0.08)",
      borderColor: ok ? "rgba(0,212,170,0.3)" : "rgba(255,77,106,0.3)",
      color: ok ? "#00D4AA" : "#FF4D6A",
    }}>
      {ok ? (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 font-bold">
            <CheckCircle2 size={12}/> Paper order placed
          </div>
          <div className="text-[10px] text-wm-text-dim">
            {result.side?.toUpperCase()} {result.qty} {result.symbol} · ID: {result.order_id?.slice(0, 8)}… · {result.status}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 font-bold">
          <AlertTriangle size={12}/> {result.error}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export function SpadeBotButton() {
  const [open,       setOpen]       = useState(false);
  const [expanded,   setExpanded]   = useState(false);
  const [messages,   setMessages]   = useState<Msg[]>([]);
  const [input,      setInput]      = useState("");
  const [streaming,  setStreaming]  = useState(false);
  const [botName,    setBotName]    = useState("SpaidBot");
  const [unread,     setUnread]     = useState(false);
  const [alpacaKeys, setAlpacaKeys] = useState<AlpacaKeys | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  /* ── Load keys; re-load whenever localStorage changes (broker connect) */
  const refreshKeys = useCallback(() => {
    try {
      const b = JSON.parse(localStorage.getItem("wm-broker-keys") ?? "{}") as Record<string, AlpacaKeys>;
      if (b.alpaca?.key && b.alpaca?.secret) { setAlpacaKeys(b.alpaca); return; }
      // Fallback: read per-broker keys that BrokerConnectPanel writes individually
      const k = localStorage.getItem("wm_broker_key_alpaca") ?? "";
      const s = localStorage.getItem("wm_broker_secret_alpaca") ?? "";
      setAlpacaKeys(k && s ? { key: k, secret: s } : null);
    } catch { setAlpacaKeys(null); }
  }, []);

  useEffect(() => {
    // Load profile name
    try {
      const p = JSON.parse(localStorage.getItem("wm-profile") ?? "{}") as { botName?: string };
      if (p.botName) setBotName(p.botName);
    } catch {}
    refreshKeys();
    // Listen for broker connect happening in another tab or later in session
    const handler = (e: StorageEvent) => {
      if (e.key === "wm-broker-keys" || e.key === "wm_broker_key_alpaca") refreshKeys();
    };
    window.addEventListener("storage", handler);
    // Also poll every 3s in case storage event doesn't fire same-tab
    const poll = setInterval(refreshKeys, 3000);
    return () => { window.removeEventListener("storage", handler); clearInterval(poll); };
  }, [refreshKeys]);

  /* ── Initial greeting on first open ── */
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: `Hey! I'm **${botName}** — your AI trading co-pilot.\n\nI can analyze charts, explain setups, and ${alpacaKeys ? "**execute paper trades** directly on Alpaca" : "place paper trades once you connect Alpaca in Broker panel"}.\n\nTry: _"Buy 5 TSLA market"_ or ask me anything about the chart.` }]);
    }
    if (open) { setUnread(false); setTimeout(() => inputRef.current?.focus(), 150); }
  }, [open]);

  // Re-render greeting if keys just connected
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "assistant") {
      const connectedText = "execute paper trades** directly on Alpaca";
      const hasConnected  = messages[0].content.includes(connectedText);
      if (alpacaKeys && !hasConnected) {
        setMessages([{ role: "assistant", content: `Hey! I'm **${botName}** — your AI trading co-pilot.\n\nAlpaca paper trading is **connected**. I can execute trades for you directly.\n\nTry: _"Buy 5 TSLA market"_, _"Sell 2 AAPL limit 215"_, or ask me anything about the chart.` }]);
      }
    }
  }, [alpacaKeys]);

  /* ── Auto scroll ── */
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* ── Chart context ── */
  const getContext = useCallback(() => {
    try {
      const el = document.getElementById("wm-chart-context");
      if (el?.dataset.ctx) return JSON.parse(el.dataset.ctx) as Record<string, unknown>;
    } catch {}
    return {};
  }, []);

  /* ── Handle a pending trade order after bot reply finishes ── */
  const attachTradeOrder = useCallback((order: TradeOrder) => {
    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === "assistant") {
        updated[updated.length - 1] = { ...last, tradeOrder: order };
      }
      return updated;
    });
  }, []);

  /* ── Send to Claude (streaming) ── */
  const sendToClaude = useCallback(async (userText: string, history: Msg[]) => {
    setStreaming(true);
    const placeholder: Msg = { role: "assistant", content: "" };
    setMessages(prev => [...prev, placeholder]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/spaidbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [...history, { role: "user", content: userText }].map(m => ({ role: m.role, content: m.content })),
          context: getContext(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const { text: t, error } = JSON.parse(payload) as { text?: string; error?: string };
            if (error) throw new Error(error);
            if (t) {
              full += t;
              setMessages(prev => {
                const u = [...prev];
                const last = u[u.length - 1];
                if (last?.role === "assistant") u[u.length - 1] = { ...last, content: full };
                return u;
              });
            }
          } catch {}
        }
      }

      // After streaming done — check if Claude issued a trade order
      const order = parseBotTradeOrder(full);
      if (order) attachTradeOrder(order);

    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = String(err).includes("ANTHROPIC_API_KEY")
        ? "SpaidBot needs an Anthropic API key. Add **ANTHROPIC_API_KEY** to your Vercel environment variables."
        : String(err).replace("Error: ", "");
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: `⚠️ ${msg}` };
        return u;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
      if (!open) setUnread(true);
    }
  }, [getContext, attachTradeOrder, open]);

  /* ── Main send handler ── */
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: trimmed };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);

    // Check for direct command first (buy/sell X Y)
    const directOrder = parseDirectCommand(trimmed);
    if (directOrder) {
      // Confirm immediately — show trade card without calling Claude
      const confirmMsg: Msg = {
        role: "assistant",
        content: `Got it — here's your **${directOrder.side.toUpperCase()}** order for **${directOrder.qty} ${directOrder.symbol}** (${directOrder.type}). Confirm to execute${alpacaKeys ? " on Alpaca paper" : " (connect Alpaca first)"}.`,
        tradeOrder: directOrder,
      };
      setMessages([...newHistory, confirmMsg]);
      return;
    }

    // Check for position query
    if (/positions?|portfolio|holdings|open orders?/i.test(trimmed) && alpacaKeys) {
      fetchPositions(newHistory);
      return;
    }

    // Otherwise → Claude
    await sendToClaude(trimmed, messages);
  }, [messages, streaming, alpacaKeys, sendToClaude]);

  /* ── Fetch positions from Alpaca ── */
  const fetchPositions = useCallback(async (history: Msg[]) => {
    if (!alpacaKeys) return;
    const placeholder: Msg = { role: "assistant", content: "Fetching your open positions…" };
    setMessages(prev => [...prev, placeholder]);
    try {
      const res = await fetch(`/api/alpaca/trade?action=positions&paper=true&key=${alpacaKeys.key}&secret=${alpacaKeys.secret}`);
      const data = await res.json() as Array<{ symbol: string; qty: string; current_price: string; unrealized_pl: string; unrealized_plpc: string }> | { error?: string };

      let content: string;
      if (!Array.isArray(data) || data.length === 0) {
        content = "No open positions in your paper account.";
      } else {
        const lines = data.map(p => {
          const pl  = parseFloat(p.unrealized_pl);
          const pct = (parseFloat(p.unrealized_plpc) * 100).toFixed(2);
          const sign = pl >= 0 ? "+" : "";
          return `**${p.symbol}** · ${p.qty} shares @ $${p.current_price} · P&L: ${sign}$${pl.toFixed(2)} (${sign}${pct}%)`;
        }).join("\n");
        content = `**Open Positions (Paper)**\n${lines}`;
      }
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content }; return u; });
    } catch (e) {
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: `⚠️ Failed to load positions: ${String(e)}` }; return u; });
    }
  }, [alpacaKeys]);

  /* ── Trade card done callback ── */
  const handleTradeDone = useCallback((idx: number, result: OrderResult | null) => {
    setMessages(prev => {
      const u = [...prev];
      u[idx] = { ...u[idx], tradeOrder: null, orderResult: result ?? undefined };
      return u;
    });
    if (result?.ok) setUnread(true);
  }, []);

  const stopStreaming = () => { abortRef.current?.abort(); setStreaming(false); };
  const panelW = expanded ? "min(680px, 95vw)" : "min(420px, 95vw)";
  const panelH = expanded ? "min(720px, 88vh)" : "min(520px, 76vh)";

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-xl"
        style={{ background: "linear-gradient(135deg,#00D4AA,#4FA3E0)", boxShadow: "0 4px 28px rgba(0,212,170,0.45)" }}
        title="SpaidBot — AI Trading Assistant"
      >
        {open ? <X size={20} className="text-white"/> : <Zap size={20} className="text-white"/>}
        {!open && unread && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-wm-gold rounded-full border-2 border-wm-black animate-pulse"/>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed bottom-20 right-5 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-wm-border"
            style={{ width: panelW, height: panelH, background: "#0D0E14", transition: "width .25s, height .25s" }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-wm-border shrink-0"
              style={{ background: "linear-gradient(90deg,#0F1018,#111320)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg,#00D4AA,#4FA3E0)" }}>
                <Zap size={15} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-black text-wm-text">{botName}</div>
                <div className="text-[9px] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse"
                    style={{ background: alpacaKeys ? "#00D4AA" : "#F0B429" }}/>
                  {alpacaKeys
                    ? <span className="text-wm-green font-semibold">Alpaca paper trading connected</span>
                    : <span className="text-wm-gold">Connect Alpaca to enable trading</span>}
                </div>
              </div>
              <button onClick={() => setExpanded(e => !e)}
                className="p-1.5 rounded-lg text-wm-text-dim hover:text-wm-text hover:bg-wm-surface transition-all">
                {expanded ? <Minimize2 size={13}/> : <Maximize2 size={13}/>}
              </button>
              <button onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-wm-text-dim hover:text-wm-text hover:bg-wm-surface transition-all">
                <X size={13}/>
              </button>
            </div>

            {/* Alpaca not connected banner */}
            {!alpacaKeys && (
              <div className="px-4 py-2 border-b border-wm-border flex items-center gap-2 shrink-0"
                style={{ background: "rgba(240,180,41,0.07)" }}>
                <Link2 size={11} className="text-wm-gold shrink-0"/>
                <span className="text-[10px] text-wm-gold flex-1">Connect Alpaca in <strong>Broker panel</strong> to execute paper trades</span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" style={{ background: "#0A0B10" }}>
              {messages.map((m, i) => {
                const isUser = m.role === "user";
                const displayText = stripTradeTag(m.content);
                return (
                  <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[90%] space-y-1.5">
                      {!isUser && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-md flex items-center justify-center shrink-0"
                            style={{ background: "linear-gradient(135deg,#00D4AA,#4FA3E0)" }}>
                            <Zap size={9} className="text-white"/>
                          </div>
                          <span className="text-[9px] font-bold text-wm-text-dim">{botName}</span>
                        </div>
                      )}
                      {displayText && (
                        <div
                          className="rounded-xl px-3 py-2.5 text-[12px] leading-relaxed"
                          style={{
                            background: isUser ? "linear-gradient(135deg,#00D4AA18,#4FA3E018)" : "#111320",
                            border: isUser ? "1px solid rgba(0,212,170,0.22)" : "1px solid #1E2030",
                            color: isUser ? "#E2E8F0" : "#C8D0E0",
                          }}
                          dangerouslySetInnerHTML={{ __html: renderMd(displayText) }}
                        />
                      )}
                      {/* Trade card */}
                      {!isUser && m.tradeOrder && (
                        <TradeCard
                          order={m.tradeOrder}
                          keys={alpacaKeys}
                          onDone={result => handleTradeDone(i, result)}
                        />
                      )}
                      {/* Order result */}
                      {!isUser && m.orderResult && <OrderBanner result={m.orderResult}/>}
                    </div>
                  </div>
                );
              })}

              {/* Streaming dots */}
              {streaming && (
                <div className="flex items-center gap-1.5 px-1">
                  {[0,150,300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-wm-green animate-bounce"
                      style={{ animationDelay: `${d}ms` }}/>
                  ))}
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Suggestions strip */}
            {messages.length <= 1 && (
              <div className="px-3 py-2 border-t border-wm-border shrink-0" style={{ background: "#0D0E14" }}>
                <p className="text-[9px] text-wm-text-dim mb-1.5 font-semibold uppercase tracking-wide">Quick commands</p>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap border shrink-0 transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "#1E2030", color: "#8B8FA8" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.cssText += ";border-color:rgba(0,212,170,0.4);color:#00D4AA"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.cssText += ";border-color:#1E2030;color:#8B8FA8"; }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-t border-wm-border shrink-0"
              style={{ background: "#0D0E14" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder={streaming ? "Thinking…" : alpacaKeys ? "Ask or: buy 5 TSLA market…" : "Ask anything or connect Alpaca to trade…"}
                disabled={streaming}
                className="flex-1 rounded-xl px-3 py-2 text-[12px] text-wm-text placeholder-wm-text-dim outline-none transition-all"
                style={{ background: "#111320", border: "1px solid #1E2030" }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,212,170,0.4)"; }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1E2030"; }}
              />
              {streaming ? (
                <button onClick={stopStreaming}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,77,106,0.2)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.3)" }}>
                  <X size={13}/>
                </button>
              ) : (
                <button onClick={() => send(input)} disabled={!input.trim()}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg,#00D4AA,#4FA3E0)" }}>
                  <Send size={13} className="text-white"/>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
