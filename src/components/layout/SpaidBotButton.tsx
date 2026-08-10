"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Zap, Minimize2, Maximize2,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */
interface Msg {
  role: "user" | "assistant";
  content: string;
}

// WM-SEC-XSS-01 (2026-08-09): the AI response is rendered via
// dangerouslySetInnerHTML for markdown-lite bold/code/newline styling. Any
// raw HTML in the AI output — including jailbreak-injected `<script>` or
// `<img onerror>` — would execute in the trader's session. Escape the source
// text FIRST, then apply the markdown regexes against the escaped text.
// `**bold**` and `` `code` `` are ASCII-safe and survive the escape unchanged.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function renderMd(text: string) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code style='background:rgba(255,255,255,0.08);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:10px'>$1</code>")
    .replace(/\n/g, "<br/>");
}

/* ── Suggestions ────────────────────────────────────────────── */
const SUGGESTIONS = [
  "What's the NQ setup right now?",
  "Explain order flow",
  "What evidence is missing?",
  "Help me define invalidation",
  "Explain the current data quality",
];

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

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  useEffect(() => {
    // Load profile name
    try {
      const p = JSON.parse(localStorage.getItem("wm-profile") ?? "{}") as { botName?: string };
      if (p.botName) setBotName(p.botName);
    } catch {}
  }, []);

  /* ── Initial greeting on first open ── */
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: `Hey! I'm **${botName}** — your AI analysis and learning partner.\n\nI can explain chart evidence, surface missing information, and help you define a thesis, invalidation, and risk questions. I cannot access accounts or place orders.` }]);
    }
    if (open) { setUnread(false); setTimeout(() => inputRef.current?.focus(), 150); }
  }, [open]);

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
  }, [getContext, open]);

  /* ── Main send handler ── */
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: trimmed };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);

    // Otherwise → Claude
    await sendToClaude(trimmed, messages);
  }, [messages, streaming, sendToClaude]);

  const stopStreaming = () => { abortRef.current?.abort(); setStreaming(false); };
  const panelW = expanded ? "min(680px, 95vw)" : "min(420px, 95vw)";
  const panelH = expanded ? "min(720px, 88vh)" : "min(520px, 76vh)";

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
        className="wm-spaidbot-launcher fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-xl"
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
            className="wm-spaidbot-panel fixed bottom-20 right-5 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-wm-border"
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
                    style={{ background: "#4FA3E0" }}/>
                  <span className="text-wm-blue font-semibold">Analysis and learning mode</span>
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" style={{ background: "#0A0B10" }}>
              {messages.map((m, i) => {
                const isUser = m.role === "user";
                const displayText = m.content;
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
                placeholder={streaming ? "Thinking…" : "Ask about evidence, risk, or market structure…"}
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
