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
import type { WebullStreamEvent } from "@/lib/marketData/webullQuotesStream";
import {
  describeSilence,
  initialWebullStreamState,
  openingWebullStreamState,
  reduceWebullStream,
  type WebullLiveStreamState,
  type WebullStreamPhase,
} from "@/lib/marketData/webullStreamState";

const PHASE_COLOR: Record<WebullStreamPhase, string> = {
  IDLE: "#9ca3af",
  OPENING: "#facc15",
  CONNECTION_REFUSED: "#f87171",
  SUBSCRIBE_REFUSED: "#f87171",
  SUBSCRIBED: "#60a5fa",
  FLOWING: "#00C076",
  ENDED: "#9ca3af",
};

/** Only the four event names the server actually emits are listened for. */
const EVENT_KINDS = ["handshake", "subscribe", "quote", "closed"] as const;

export default function WebullRealTimeStrip({ symbol = WIRE_PROOF_SYMBOL }: { symbol?: string }) {
  const [state, setState] = useState<WebullLiveStreamState>(initialWebullStreamState);
  const [running, setRunning] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  const stop = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setRunning(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    stop();
    setState(openingWebullStreamState);
    setRunning(true);

    const source = new EventSource(
      `/api/market-data/webull/stream?symbols=${encodeURIComponent(symbol)}&subTypes=QUOTE`,
    );
    sourceRef.current = source;

    for (const kind of EVENT_KINDS) {
      source.addEventListener(kind, (message) => {
        try {
          const event = JSON.parse((message as MessageEvent<string>).data) as WebullStreamEvent;
          setState((previous) => reduceWebullStream(previous, event));
        } catch {
          // A frame we cannot parse is dropped rather than rendered as a
          // failure of the lane — that would be a claim we have no basis for.
        }
        if (kind === "closed") stop();
      });
    }

    source.onerror = () => {
      // EventSource reports the browser's view, which cannot distinguish a
      // finished stream from a dropped one. It therefore changes no phase.
      stop();
    };
  }, [stop, symbol]);

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
            if (running) stop();
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
      </div>
    </div>
  );
}
