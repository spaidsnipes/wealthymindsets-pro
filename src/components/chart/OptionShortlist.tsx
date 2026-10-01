"use client";

/**
 * THE INTENT SHORTLIST ON THE CHART — Garden 18 §LVI/§LVII/§LXIII.
 *
 * A few understandable candidates from the ONE shortlist owner
 * (selectExpressionShortlist): FAST · BALANCED · MORE TIME, each with why it
 * fits, what it costs, and any "cheap for a reason" flags read from observed
 * fields — live tastytrade quotes where streamed. The thesis direction is the
 * trader's to state; the shortlist never guesses one. Choosing a slot goes
 * through the chain's own review path. The full chain stays one tap below.
 */

import React, { useEffect, useMemo, useState } from "react";

import { readContractQuote } from "@/lib/broker/tastyContractQuote";
import { useTastyQuotes } from "@/lib/broker/tastyQuoteStream";
import { streamerForOcc } from "@/lib/broker/tastyOptionStreamers";
import { cheapForAReason, selectExpressionShortlist, shortlistJobLabel, shortlistJobWords } from "@/lib/expressionShortlist";
import { nominalOptionExpiryMs, type OptionContract } from "@/lib/optionContractResponse";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";

export function OptionShortlist({ chain, spot, ttMap, onReview }: {
  readonly chain: readonly OptionContract[];
  readonly spot: number | null;
  readonly ttMap: Map<string, string> | null;
  readonly onReview: (contract: OptionContract) => void;
}) {
  const [direction, setDirection] = useState<"long" | "short" | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const slots = useMemo(() => selectExpressionShortlist({ chain, spot, direction }), [chain, spot, direction]);
  const streamers = useMemo(() => slots.map(s => streamerForOcc(ttMap, s.contract?.symbol)).filter((x): x is string => !!x), [slots, ttMap]);
  const tt = useTastyQuotes(streamers);

  return (
    <section data-testid="option-shortlist" aria-label="Contract shortlist" className="border-b border-wm-border px-3 py-2 text-[11px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold uppercase tracking-wider text-[10px]" style={{ color: GOLD }}>Shortlist</span>
        <span style={{ color: MUTED }}>Your thesis on the underlying:</span>
        {(["long", "short"] as const).map(d => (
          <button key={d} type="button" aria-pressed={direction === d} onClick={() => setDirection(v => (v === d ? null : d))}
            className="rounded border px-2 py-0.5"
            style={{ borderColor: direction === d ? GOLD : "rgba(139,106,41,0.35)", color: direction === d ? GOLD : "#C8C0AE" }}>
            {d === "long" ? "↑ Up · calls" : "↓ Down · puts"}
          </button>
        ))}
        <span style={{ color: MUTED }}>Never “best” — each job trades one thing for another. The full chain is below.</span>
      </div>
      {direction === null ? (
        <p className="mt-1" style={{ color: MUTED }}>State the direction your chart analysis supports; the shortlist will not guess it.</p>
      ) : (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {slots.map(slot => {
            const w = shortlistJobWords(slot.job);
            const c = slot.contract;
            const streamer = streamerForOcc(ttMap, c?.symbol);
            const q = streamer ? tt.quotes.get(streamer) : undefined;
            const read = readContractQuote(q, tt.stream, now);
            const live = read.state === "LIVE" || read.state === "ONE-SIDED";
            const bid = live ? q?.bid ?? null : c?.bid ?? null;
            const ask = live ? q?.ask ?? null : c?.ask ?? null;
            const delta = live ? q?.delta ?? null : c?.delta ?? null;
            const iv = live ? q?.iv ?? null : c?.impliedVolatility ?? null;
            const expMs = c ? nominalOptionExpiryMs(c.expirationDate) : null;
            const hours = expMs != null ? (expMs - now) / 3_600_000 : null;
            const flags = c ? cheapForAReason({ delta, bid, ask, hoursToExpiry: hours !== null && Number.isFinite(hours) ? hours : null }) : [];
            return (
              <article key={slot.job} data-job={slot.job} className="rounded border border-wm-border p-2">
                <div className="flex items-center justify-between">
                  <strong style={{ color: GOLD }}>{shortlistJobLabel(slot.job)}</strong>
                  {c ? <span className="text-[10px]" style={{ color: live ? "#7fd1a8" : MUTED }}>{live ? "● tastytrade live" : "reference"}</span> : null}
                </div>
                {c ? (
                  <>
                    <div className="mt-1 font-mono">{c.strike} {c.contractType.toUpperCase()} · {c.expirationDate}{hours != null && Number.isFinite(hours) ? ` · ${hours < 48 ? `${Math.max(0, Math.round(hours))}h` : `${Math.round(hours / 24)}d`}` : ""}</div>
                    <div className="font-mono" style={{ color: MUTED }}>
                      {bid != null ? bid.toFixed(2) : "—"} × {ask != null ? ask.toFixed(2) : "—"} · Δ {delta != null ? delta.toFixed(2) : "—"} · IV {iv != null ? `${(iv * 100).toFixed(1)}%` : "—"}
                    </div>
                    <p className="mt-1">{w.fits}</p>
                    <p style={{ color: MUTED }}>Tradeoff: {w.tradeoff}</p>
                    {flags.map(f => <p key={f} style={{ color: GOLD }}>Cheap for a reason · {f}</p>)}
                    <button type="button" onClick={() => onReview(c)} className="mt-1 rounded border border-wm-gold px-2 py-1 text-wm-gold">Review this expression</button>
                  </>
                ) : (
                  <p className="mt-1" style={{ color: MUTED }}>{slot.reason}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
