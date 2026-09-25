"use client";

/**
 * THE FIRST WM PRO SURFACE THAT CAN SHOW A WEBULL PRINT ARRIVING.
 *
 * Until now the Webull lane could only be asked questions with yes/no answers:
 * does the app key sign correctly, does the broker accept a connection. This
 * strip holds the real-time socket open and counts prints as they land, which
 * is the only evidence that actually settles the three-month argument — because
 * a print on the glass cannot be misread as anything else.
 *
 * IT DOES NOT DECIDE WHAT ANYTHING MEANS. Every phase, headline and sentence
 * comes from `reduceWebullStream`, which is pure and tested. Deciding meaning
 * inside a component is how "403 from the pull endpoint" became "buy a data
 * package" and stayed there for three months without a single test failing.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Radio, Square } from "lucide-react";
import { WIRE_PROOF_SYMBOL } from "@/lib/marketData/wireProofScope";
import type { WebullStreamRouteEvent } from "@/lib/marketData/webullQuotesStream";
import {
  describeSilence,
  initialWebullStreamState,
  openingWebullStreamState,
  reduceWebullStream,
  type WebullLiveStreamState,
  type WebullStreamPhase,
} from "@/lib/marketData/webullStreamState";
import {
  initialReconnectState,
  nextStep,
  observe,
  recordAttempt,
  schedulesReopen,
  type NextStep,
  type ReconnectState,
} from "@/lib/marketData/webullReconnectPolicy";

const PHASE_COLOR: Record<WebullStreamPhase, string> = {
  IDLE: "#9ca3af",
  OPENING: "#facc15",
  AWAITING_APPROVAL: "#facc15",
  NOT_AVAILABLE_HERE: "#9ca3af",
  CONNECTION_REFUSED: "#f87171",
  SUBSCRIBE_REFUSED: "#f87171",
  SUBSCRIBED: "#60a5fa",
  FLOWING: "#00C076",
  ENDED: "#9ca3af",
};

/**
 * Only the event names the server actually emits are listened for: the four
 * the socket choreography produces, plus the route's own `gate` (it stopped
 * before Webull was contacted) and `session` (what happened to a refused
 * session). See WebullStreamRouteEvent.
 */
const EVENT_KINDS = ["handshake", "subscribe", "quote", "closed", "gate", "session"] as const;

export default function WebullRealTimeStrip({ symbol = WIRE_PROOF_SYMBOL, autoStart = false }: {
  symbol?: string;
  /**
   * Start on its own once the signed wire check says CONNECTED — the Founder
   * should not have to press twice to see a print. Fires once per mount; a
   * trader's Stop is honoured and never overridden by this.
   */
  autoStart?: boolean;
}) {
  const [state, setState] = useState<WebullLiveStreamState>(initialWebullStreamState);
  const [running, setRunning] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  // CONTINUITY (webullReconnectPolicy.ts): the policy decides; this owner obeys.
  const reconnectRef = useRef<ReconnectState>(initialReconnectState);
  const userStoppedRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedAtRef = useRef(0);
  const [step, setStep] = useState<NextStep | null>(null);
  const [gaps, setGaps] = useState<ReconnectState["gaps"]>([]);

  const closeSource = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
  }, []);

  const stop = useCallback(() => {
    userStoppedRef.current = true;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
    closeSource();
    setStep(null);
    setRunning(false);
  }, [closeSource]);

  useEffect(() => stop, [stop]);

  const openRef = useRef<() => void>(() => {});
  const ended = useCallback(() => {
    if (!sourceRef.current) return;
    closeSource();
    reconnectRef.current = observe(reconnectRef.current, { kind: "ended", upMs: Date.now() - openedAtRef.current });
    const n = nextStep(reconnectRef.current, userStoppedRef.current);
    setStep(n);
    if (schedulesReopen(n)) {
      reconnectRef.current = recordAttempt(reconnectRef.current);
      retryTimerRef.current = setTimeout(() => openRef.current(), n.delayMs);
    } else {
      setRunning(false);
    }
  }, [closeSource]);

  const open = useCallback(() => {
    // Each open is a NEW stream: the server repeats handshake AND subscribe.
    setState(openingWebullStreamState);
    openedAtRef.current = Date.now();
    // A new connection is judged on its own answers, not the last one's.
    reconnectRef.current = observe(reconnectRef.current, { kind: "opening" });
    const source = new EventSource(
      `/api/market-data/webull/stream?symbols=${encodeURIComponent(symbol)}&subTypes=QUOTE`,
    );
    sourceRef.current = source;

    for (const kind of EVENT_KINDS) {
      source.addEventListener(kind, (message) => {
        try {
          const event = JSON.parse((message as MessageEvent<string>).data) as WebullStreamRouteEvent;
          setState((previous) => reduceWebullStream(previous, event));
          if (event.kind === "handshake") {
            reconnectRef.current = observe(reconnectRef.current, { kind: "handshake", accepted: event.accepted, credentialRejected: event.credentialRejected });
          } else if (event.kind === "subscribe") {
            reconnectRef.current = observe(reconnectRef.current, { kind: "subscribe", subscribed: event.subscribed, status: event.status, providerCode: event.providerCode });
          } else if (event.kind === "gate") {
            reconnectRef.current = observe(reconnectRef.current, { kind: "gate", gate: event.gate });
          } else if (event.kind === "session") {
            reconnectRef.current = observe(reconnectRef.current, { kind: "session", verdict: event.verdict });
          } else if (event.kind === "quote") {
            reconnectRef.current = observe(reconnectRef.current, { kind: "quote", receivedAt: event.receivedAt });
            setGaps(reconnectRef.current.gaps);
            setStep(null);
          }
        } catch {
          // A frame we cannot parse is dropped rather than rendered as a
          // failure of the lane — that would be a claim we have no basis for.
        }
        if (kind === "closed") ended();
      });
    }

    // EventSource cannot tell a finished stream from a dropped one; the
    // POLICY decides what happens next, not this handler.
    source.onerror = () => ended();
  }, [ended, symbol]);
  openRef.current = open;

  const start = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    closeSource();
    userStoppedRef.current = false;
    reconnectRef.current = { ...initialReconnectState, gaps: reconnectRef.current.gaps };
    setStep(null);
    setRunning(true);
    open();
  }, [closeSource, open]);

  // Only a trader's own Stop press blocks auto-start; the unmount cleanup
  // (which also calls stop) must not, or a remount would never go live.
  const traderStoppedRef = useRef(false);
  const autoStartedRef = useRef(false);
  useEffect(() => () => { autoStartedRef.current = false; }, []);
  useEffect(() => {
    if (!autoStart || autoStartedRef.current || traderStoppedRef.current || running) return;
    autoStartedRef.current = true;
    start();
  }, [autoStart, running, start]);

  const silence = describeSilence(state);
  const color = PHASE_COLOR[state.phase];

  return (
    <div className="rounded-xl border border-wm-border bg-wm-surface/60 px-3 py-2.5" data-webull-realtime-strip>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-wm-text-muted">
            Real-time stream
          </div>
          <p className="mt-1 text-[9px] leading-snug text-wm-text-dim">
            Holds Webull&apos;s real-time socket open for {symbol} and counts prints as they arrive.
            Read-only: no account access and no order action.
          </p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (running) { traderStoppedRef.current = true; stop(); }
            else start();
          }}
          className="flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-wm-border bg-wm-card px-3 text-[9px] font-black uppercase tracking-wider text-wm-text-muted transition-colors hover:text-wm-text"
          aria-label={running ? `Stop the ${symbol} real-time stream` : `Start the ${symbol} real-time stream`}
        >
          {running && state.phase === "OPENING" ? (
            <Loader2 size={11} className="animate-spin" />
          ) : running ? (
            <Square size={11} />
          ) : (
            <Radio size={11} />
          )}
          {running ? "Stop" : "Go live"}
        </button>
      </div>

      <div className="mt-2 rounded-lg border px-2 py-2" style={{ borderColor: `${color}59`, background: `${color}14` }}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-bold" style={{ color }}>
            {state.headline}
          </span>
          <span className="text-[9px] font-black uppercase tracking-wider text-wm-text-muted">
            {state.quoteCount} print{state.quoteCount === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-1 text-[9px] leading-snug text-wm-text-dim" aria-live="polite">
          {state.detail}
        </p>
        {state.lastQuoteAt && (
          <p className="mt-1 text-[9px] leading-snug text-wm-text-dim">
            Newest {new Date(state.lastQuoteAt).toLocaleTimeString()}
            {state.lastTopic ? ` · ${state.lastTopic}` : ""}
          </p>
        )}
        {silence && <p className="mt-1 text-[9px] leading-snug text-wm-text-dim">{silence}</p>}
        {step && step.kind !== "STOPPED" && (
          <p className="mt-1 text-[10px] font-bold leading-snug" data-webull-continuity={step.kind}
            style={{ color: step.kind === "REAUTHORIZE" ? "#facc15" : "#C8C0AE" }}>
            {step.kind === "RETRY" ? `Reconnecting in ${Math.round(step.delayMs / 1000)} s · attempt ${step.attempt} — handshake and subscribe will be repeated`
              : step.kind === "AWAITING_APPROVAL" ? `${step.note} Checking again in ${Math.round(step.delayMs / 1000)} s.`
              : step.kind === "REAUTHORIZE" ? `REAUTHORIZE · ${step.note}` : step.note}
          </p>
        )}
        {gaps.length > 0 && (
          <p className="mt-1 text-[9px] leading-snug text-wm-text-dim" data-webull-gaps={gaps.length}>
            Recorded gaps (not filled): {gaps.slice(-3).map(g => `${new Date(g.from).toLocaleTimeString()} → ${new Date(g.to).toLocaleTimeString()}`).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
