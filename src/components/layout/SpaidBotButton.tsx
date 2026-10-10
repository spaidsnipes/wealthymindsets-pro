"use client";
// Canon F22A (2026-10-06): SpaidBot wears the house graphite + warm gold, not teal.

import { SPAIDBOT_PANEL_BOUNDARY } from "@/lib/execution/ticketTruth";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { WM } from "@/lib/design/wmTokens";
import { useAuth } from "@/contexts/AuthContext";
import { readSceneDecision } from "@/lib/traderMemory/decisionContinuity";
import { SPAIDBOT_IDLE_TIMEOUT_MS, spaidbotFailureMessage, withSceneDecisionId, withScenePlan, spaidbotContextPublish, type SpaidbotContextPublish } from "@/lib/ai/spaidbotContext";
import { readPlanForDecision } from "@/lib/journal/managementPlanStore";
import { SPAIDBOT_ASK_EVENT, contextWithAsk, readSpaidbotAsk, registerSpaidbotAskListener, rememberPendingAsk, takePendingAsk, type SpaidbotAsk } from "@/lib/ai/spaidbotAsk";
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

/** Said under an answer the lighter model gave (the main model missed its first-byte share). */
export const LIGHTER_MODEL_LINE = "\n\n_(answered by the lighter model — the main model was slow to start)_";

/** The honest waiting line: nothing before 5 s, then the elapsed seconds. */
export const WAITING_LINE_AFTER_S = 5;
export function spaidbotWaitingLine(elapsedS: number): string | null {
  return elapsedS >= WAITING_LINE_AFTER_S ? `SpaidBot is reading the chart… ${Math.floor(elapsedS)} s` : null;
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
export function SpadeBotButton({ launcher = true }: {
  /**
   * Garden 19 §30 (2026-10-07). `false` = no floating launcher: the panel
   * exists only when a surface ASKED (wm:spaidbot-ask — Inspect "Ask SpaidBot",
   * Review "Ask SpaidBot about this decision") and closes back to nothing.
   * This is how the Founder shell — which retired the floating chrome button
   * (MainLayout.residency.sentinel) — still answers the Ask door.
   */
  launcher?: boolean;
} = {}) {
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

  // The ACCOUNT's bot name wins; this device's copy only fills in when the
  // account has none (garden pass 2026-10-04: a new device showed the default,
  // and a name changed elsewhere never arrived).
  const { user } = useAuth();
  useEffect(() => {
    if (user?.botName) { setBotName(user.botName); return; }
    try {
      const p = JSON.parse(localStorage.getItem("wm-profile") ?? "{}") as { botName?: string };
      if (p.botName) setBotName(p.botName);
    } catch {}
  }, [user?.botName]);

  /* ── Initial greeting on first open ── */
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: `Hey! I'm **${botName}** — your AI analysis and learning partner.\n\nI can explain chart evidence, surface missing information, and help you define a thesis, invalidation, and risk questions. I cannot access accounts or place orders.` }]);
    }
    if (open) { setUnread(false); setTimeout(() => inputRef.current?.focus(), 150); }
  }, [open]);

  /* ── Waiting seconds: ticks only while a question waits for its first words ── */
  const [waitS, setWaitS] = useState<number | null>(null);
  const lastText = messages.length ? messages[messages.length - 1] : null;
  const waitingForWords = streaming && lastText?.role === "assistant" && !lastText.content;
  useEffect(() => {
    if (!waitingForWords) { setWaitS(null); return; }
    const t0 = Date.now();
    setWaitS(0);
    const id = setInterval(() => setWaitS((Date.now() - t0) / 1000), 1000);
    return () => clearInterval(id);
  }, [waitingForWords]);

  /* ── Auto scroll ── */
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* ── Garden 19 §30: "Ask SpaidBot" from a surface (Inspect, Review) ──
     Opens THIS panel with the question pre-filled — the trader presses Send;
     nothing is sent for them. The ask's context patch (server-validated
     fields only) rides with the next question and is then dropped. */
  const askRef = useRef<SpaidbotAsk | null>(null);
  const [askSeq, setAskSeq] = useState(0);
  useEffect(() => {
    const apply = (ask: SpaidbotAsk) => {
      askRef.current = ask;
      setAskSeq(n => n + 1);
      setOpen(true);
      setInput(ask.prompt);
      setTimeout(() => inputRef.current?.focus(), 150);
    };
    const onAsk = (e: Event) => {
      const ask = readSpaidbotAsk((e as CustomEvent).detail);
      if (!ask) return;
      rememberPendingAsk(null);
      apply(ask);
    };
    // The launcherless host mounts this panel on the FIRST ask; that ask is waiting.
    const waiting = takePendingAsk();
    if (waiting) apply(waiting);
    const unregister = registerSpaidbotAskListener();
    window.addEventListener(SPAIDBOT_ASK_EVENT, onAsk);
    return () => { unregister(); window.removeEventListener(SPAIDBOT_ASK_EVENT, onAsk); };
  }, []);

  /* ── Chart context ── */
  const getChartContext = useCallback((): Record<string, unknown> => {
    try {
      const el = document.getElementById("wm-chart-context");
      if (el?.dataset.ctx) {
        const ctx = JSON.parse(el.dataset.ctx) as Record<string, unknown>;
        // Garden 18 §8: the ONE decision store answers which Decision_ID this
        // chart's scene holds — SpaidBot keeps none of its own.
        // Garden 19 §27/§31: the plan frozen on that Decision_ID (read only).
        return withScenePlan(withSceneDecisionId(ctx, user?.id ?? null, readSceneDecision), id => readPlanForDecision(window.localStorage, id));
      }
    } catch {}
    return {};
  }, [user?.id]);
  /** THE ONE BUILDER of the context a question carries: the chart's context, then the waiting ask's patch. */
  const peekContext = useCallback(() => contextWithAsk(getChartContext(), askRef.current), [getChartContext]);
  const getContext = useCallback(() => {
    const ctx = peekContext();
    askRef.current = null; // the ask's patch rides with ONE question only
    return ctx;
  }, [peekContext]);
  // §31: on open (and when an ask arrives or a question has gone), publish the two management fields of
  // that same context — Decision_ID present? and the plan line — as data attributes. No request is made.
  const [published, setPublished] = useState<SpaidbotContextPublish | null>(null);
  useEffect(() => {
    setPublished(open ? spaidbotContextPublish(peekContext()) : null);
  }, [open, askSeq, messages.length, peekContext]);

  /* ── Send to Claude (streaming) ── */
  const sendToClaude = useCallback(async (userText: string, history: Msg[]) => {
    setStreaming(true);
    const placeholder: Msg = { role: "assistant", content: "" };
    setMessages(prev => [...prev, placeholder]);

    const controller = new AbortController();
    abortRef.current = controller;
    // ATHOS order §8 (2026-10-05): a question sat on "Thinking…" with no
    // result. A stream that says nothing for 45 s is ended and SAID to have
    // timed out — a user's own stop stays silent, a timeout does not.
    let timedOut = false;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const armIdle = () => {
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => { timedOut = true; controller.abort(); }, SPAIDBOT_IDLE_TIMEOUT_MS);
    };
    armIdle();

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
      // A frame can arrive split across network chunks; keep the unfinished
      // tail until its newline arrives instead of dropping it.
      let pending = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        armIdle();
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          // Only a malformed frame is skipped; a server ERROR frame must reach
          // the ⚠️ path below (garden pass 2026-10-04: it was swallowed here,
          // leaving an empty or cut-off answer with no word of why).
          let frame: { text?: string; error?: string; meta?: { answeredBy?: string } };
          try { frame = JSON.parse(payload) as { text?: string; error?: string; meta?: { answeredBy?: string } }; } catch { continue; }
          // The relay's closing receipt: say (small) when the lighter model answered.
          if (frame.meta?.answeredBy === "LIGHTER" && full.trim()) {
            full += LIGHTER_MODEL_LINE;
            setMessages(prev => {
              const u = [...prev];
              const last = u[u.length - 1];
              if (last?.role === "assistant") u[u.length - 1] = { ...last, content: full };
              return u;
            });
          }
          const { text: t, error } = frame;
          if (error) throw new Error(error);
          {
            if (t) {
              full += t;
              setMessages(prev => {
                const u = [...prev];
                const last = u[u.length - 1];
                if (last?.role === "assistant") u[u.length - 1] = { ...last, content: full };
                return u;
              });
            }
          }
        }
      }

      if (!full.trim()) throw new Error("EMPTY_ANSWER");
    } catch (err) {
      if ((err as Error).name === "AbortError" && !timedOut) return;
      // Plain words for every trader (garden pass 2026-10-04): guests were shown
      // "HTTP 502", "TypeFailed to fetch" and an instruction to set a server
      // variable. The operator's remedy (ANTHROPIC_API_KEY on the host) lives in
      // /readiness, not in a guest's chat.
      const raw = String(err);
      const msg = spaidbotFailureMessage(raw, timedOut);
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: `⚠️ ${msg}` };
        return u;
      });
    } finally {
      if (idle) clearTimeout(idle);
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
      {/* Floating button (not in the launcherless ask host) */}
      {launcher ? (
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
        className="wm-spaidbot-launcher fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-xl"
        style={{ background: "linear-gradient(135deg,#c4a574,#8b6a29)", boxShadow: "0 4px 28px rgba(196,165,116,0.35)" }}
        title="SpaidBot — AI Trading Assistant"
        // The button is an icon: its name is said, and so is whether the chat is open.
        aria-label={open ? `Close ${botName}` : `Open ${botName}, the trading assistant`}
        aria-expanded={open}
      >
        {open ? <X size={20} className="text-white"/> : <Zap size={20} className="text-white"/>}
        {!open && unread && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-wm-gold rounded-full border-2 border-wm-black animate-pulse"/>
        )}
      </motion.button>
      ) : null}

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="wm-spaidbot-panel fixed bottom-20 right-5 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-wm-border"
            style={{ width: panelW, height: panelH, background: WM.surface.deep, borderColor: WM.border.line, transition: "width .25s, height .25s" }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-wm-border shrink-0"
              style={{ background: `linear-gradient(90deg, ${WM.surface.mid}, ${WM.surface.deep})`, borderColor: WM.border.line }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg,#c4a574,#8b6a29)" }}>
                <Zap size={15} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-black text-wm-text">{botName}</div>
                <div className="text-[9px] flex items-center gap-1.5">
                  {/* A mode label, not a live signal: a still brass mark, no pulse. */}
                  <span className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ background: WM.gold.mark }}/>
                  <span className="font-semibold" style={{ color: WM.gold.mark }}>Analysis and learning mode</span>
                </div>
              </div>
              <button type="button" onClick={() => setExpanded(e => !e)}
                aria-label={expanded ? "Make the chat smaller" : "Make the chat larger"} aria-pressed={expanded}
                className="wm-tap p-1.5 rounded-lg text-wm-text-dim hover:text-wm-text hover:bg-wm-surface transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold">
                {expanded ? <Minimize2 size={13} aria-hidden="true"/> : <Maximize2 size={13} aria-hidden="true"/>}
              </button>
              <button aria-label="Close chat" onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-wm-text-dim hover:text-wm-text hover:bg-wm-surface transition-all">
                <X size={13}/>
              </button>
            </div>
            {/* Sheriff P2-7 (2026-10-08): the boundary, on the panel itself — from the ONE
                boundary owner the ticket also reads (ticketTruth.SPAIDBOT_PANEL_BOUNDARY). */}
            <p data-testid="spaidbot-boundary" data-ctx-decision={published?.decision} data-ctx-plan={published?.plan} className="shrink-0 border-b border-wm-border px-3 py-1.5 text-[10px] leading-snug text-wm-text-dim">
              {SPAIDBOT_PANEL_BOUNDARY}
            </p>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" style={{ background: WM.surface.deepest }}>
              {messages.map((m, i) => {
                const isUser = m.role === "user";
                const displayText = m.content;
                return (
                  <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[90%] space-y-1.5">
                      {!isUser && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-md flex items-center justify-center shrink-0"
                            style={{ background: "linear-gradient(135deg,#c4a574,#8b6a29)" }}>
                            <Zap size={9} className="text-white"/>
                          </div>
                          <span className="text-[9px] font-bold text-wm-text-dim">{botName}</span>
                        </div>
                      )}
                      {displayText && (
                        <div
                          className="rounded-xl px-3 py-2.5 text-[12px] leading-relaxed"
                          style={{
                            background: isUser ? "linear-gradient(135deg,#c4a57418,#8b6a2918)" : WM.surface.mid,
                            border: isUser ? "1px solid rgba(196,165,116,0.22)" : `1px solid ${WM.border.line}`,
                            color: isUser ? WM.text.hero : WM.text.body,
                          }}
                          dangerouslySetInnerHTML={{ __html: renderMd(displayText) }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Honest waiting line (2026-10-07): after 5 s with no words yet, say how long. */}
              {streaming && waitS !== null && spaidbotWaitingLine(waitS) ? (
                <p data-testid="spaidbot-waiting" role="status" className="px-1 text-[11px] text-wm-text-dim">{spaidbotWaitingLine(waitS)}</p>
              ) : null}
              {/* Streaming dots */}
              {streaming && (
                <div className="flex items-center gap-1.5 px-1">
                  {[0,150,300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-wm-brass-mark animate-bounce"
                      style={{ animationDelay: `${d}ms` }}/>
                  ))}
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Suggestions strip */}
            {messages.length <= 1 && (
              <div className="px-3 py-2 border-t border-wm-border shrink-0" style={{ background: WM.surface.deep, borderColor: WM.border.hair }}>
                <p className="text-[9px] text-wm-text-dim mb-1.5 font-semibold uppercase tracking-wide">Quick commands</p>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap border shrink-0 transition-all"
                      style={{ background: WM.surface.mid, borderColor: WM.border.line, color: WM.text.muted }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.cssText += ";border-color:rgba(196,165,116,0.4);color:#c9a55c"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.cssText += `;border-color:${WM.border.line};color:${WM.text.muted}`; }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-t border-wm-border shrink-0"
              style={{ background: WM.surface.deep, borderColor: WM.border.hair }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder={streaming ? "Thinking…" : "Ask about evidence, risk, or market structure…"}
                disabled={streaming}
                className="flex-1 rounded-xl px-3 py-2 text-[12px] text-wm-text placeholder-wm-text-dim outline-none transition-all"
                style={{ background: WM.surface.mid, border: `1px solid ${WM.border.line}` }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,165,116,0.4)"; }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = WM.border.line; }}
              />
              {streaming ? (
                <button aria-label="Stop response" onClick={stopStreaming}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,77,106,0.2)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.3)" }}>
                  <X size={13}/>
                </button>
              ) : (
                <button aria-label="Send message" onClick={() => send(input)} disabled={!input.trim()}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg,#c4a574,#8b6a29)" }}>
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
