"use client";

/**
 * /readiness — the LOCAL WIREBOARD / READINESS TARGET made visible.
 *
 * Monday Test 2 (2026-08-31) verbatim intent: "one truthful development
 * readiness projection where an authorized developer can inspect, without
 * seeing secret values … This is observability, not a second authority
 * source."
 *
 * This surface renders the /api/broker/readiness receipt (presence-only,
 * value-free) through the pure selectReadinessWireboard view-model. The
 * visible blocker for any BLOCKED provider names the ACTUAL proven edge —
 * the exact missing config NAME(s) as "NOT CONFIGURED" — and NEVER
 * "DELAYED BY ENTITLEMENT". READY is shown as "SETUP PRESENT",
 * strictly weaker than connected/certified, and labelled as such on-screen.
 *
 * The same page runs on BOTH lanes (local `next dev` and the deployed host);
 * the header states which origin produced the receipt so local↔host drift is
 * visible by comparing two loads.
 */

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { Plug2 } from "lucide-react";
import { BrokerConnectPanel } from "@/components/broker/BrokerConnectPanel";
import {
  selectReadinessWireboard,
  type ReadinessPayload,
  type ReadinessWireboard,
} from "@/lib/broker/selectReadinessWireboard";

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; wireboard: ReadinessWireboard };

export default function ReadinessPage() {
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [origin, setOrigin] = useState<string>("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const connectTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
    let cancelled = false;
    let settled = false;
    const controller = new AbortController();
    setState({ phase: "loading" });
    // Bound the complete read, including a response whose JSON body stalls.
    // A late result may never restore an expired configuration receipt.
    const deadline = setTimeout(() => {
      if (cancelled || settled) return;
      settled = true;
      setState({ phase: "error", message: "Connection setup check timed out. No current receipt is available" });
      controller.abort();
    }, 12_000);
    (async () => {
      try {
        const res = await fetch("/api/broker/readiness", { cache: "no-store", signal: controller.signal });
        if (!res.ok) {
          if (!cancelled && !settled) setState({ phase: "error", message: `Endpoint returned HTTP ${res.status}` });
          return;
        }
        const payload = (await res.json()) as ReadinessPayload;
        if (!cancelled && !settled) setState({ phase: "ready", wireboard: selectReadinessWireboard(payload) });
      } catch (e) {
        if (!cancelled && !settled) setState({ phase: "error", message: e instanceof Error ? e.message : "Network error" });
      } finally {
        settled = true;
        clearTimeout(deadline);
        controller.abort();
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [attempt]);

  return (
    <div className="min-h-screen bg-[#050506] text-neutral-100">
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(240,180,41,0.14),transparent_68%)]" />
      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-8 overflow-hidden rounded-2xl border border-[#f0b429]/20 bg-black/70 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
          <div className="h-px bg-gradient-to-r from-transparent via-[#f0b429]/80 to-transparent" />
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#f0b429]">WM Pro workspace</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Connections</h1>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">Connect one broker or several. Each connection is verified independently before it can power charts or trading.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  ref={connectTriggerRef}
                  type="button"
                  onClick={() => setConnectOpen(true)}
                  aria-haspopup="dialog"
                  aria-controls="wm-broker-connect"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:border-emerald-300/60 hover:bg-emerald-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                >
                  <Plug2 size={14} aria-hidden="true" /> Connect or review brokers
                </button>
                <Link href="/command-deck" className="rounded-full border border-[#f0b429]/25 bg-[#f0b429]/5 px-4 py-2 text-xs font-semibold text-[#f0b429] transition hover:border-[#f0b429]/50 hover:bg-[#f0b429]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0b429]">
                  ← Command Deck
                </Link>
              </div>
            </div>
            <details className="mt-5 max-w-3xl rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-neutral-500">
              <summary className="cursor-pointer font-semibold text-neutral-300">How connection status works</summary>
              <p className="mt-2">
                Credentials present means WM Pro may attempt a connection. It does not mean connected or live.
                Missing setup, authentication, entitlement, no events, and stale data remain separate states.
                Secret values are never shown.
              </p>
              {origin && <p className="mt-2 font-mono text-[10px]">receipt origin: {origin}</p>}
            </details>
          </div>
        </header>

        {state.phase === "loading" && (
          <div role="status" className="rounded-xl border border-[#f0b429]/15 bg-black/60 px-4 py-8 text-sm text-neutral-400">
            Loading readiness receipt…
          </div>
        )}

        {state.phase === "error" && (
          <div role="alert" className="rounded-lg border border-rose-800/50 bg-rose-950/20 px-4 py-6 text-sm text-rose-200">
            <p>Could not load /api/broker/readiness — {state.message}. Connection status is unverified.</p>
            <button type="button" onClick={() => setAttempt(value => value + 1)}
              className="mt-4 min-h-11 rounded-lg border border-rose-300/40 px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300">
              Retry connection check
            </button>
          </div>
        )}

        {state.phase === "ready" && (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#f0b429]/20 bg-gradient-to-br from-[#f0b429]/10 to-black/50 px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#f0b429]/75">Providers configured</div>
                <div className="mt-2 font-mono text-2xl text-neutral-50">{state.wireboard.summary}</div>
                <div className="mt-1 text-[10px] text-neutral-500">Presence allows an attempt. It is not a live receipt.</div>
              </div>
              <div className="rounded-xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.07] to-black/50 px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/70">Required names present</div>
                <div className="mt-2 font-mono text-2xl text-neutral-50">
                  {state.wireboard.envPresentCount}/{state.wireboard.envTotalCount}
                </div>
                <div className="mt-1 text-[10px] text-neutral-500">Values stay sealed in approved runtime stores.</div>
              </div>
            </div>

            {state.wireboard.empty ? (
              <div className="rounded-lg border border-neutral-800 bg-black/40 px-4 py-6 text-sm text-neutral-400">
                The receipt contained no providers. Nothing to display — reported honestly rather than as
                "all clear".
              </div>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {state.wireboard.rows.map((row) => {
                  const isReady = row.status === "READY";
                  return (
                    <li
                      key={row.provider}
                      className={`group rounded-xl border px-4 py-4 transition ${
                        isReady
                          ? "border-emerald-500/20 bg-emerald-500/[0.045] hover:border-emerald-500/35"
                          : "border-[#f0b429]/20 bg-[#f0b429]/[0.045] hover:border-[#f0b429]/35"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-neutral-100">{row.label}</span>
                          <span className="rounded border border-white/5 bg-black/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                            {row.lane}
                          </span>
                        </div>
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${
                            isReady ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border border-[#f0b429]/20 bg-[#f0b429]/10 text-[#f0b429]"
                          }`}
                        >
                          {row.blockerClass}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-neutral-300">
                        {isReady
                          ? "Setup present — verification required. Charts and trading are not certified by this receipt."
                          : "This provider still needs setup in the current runtime."}
                      </p>
                      <details className="mt-3 border-t border-white/5 pt-2 text-[11px] leading-relaxed text-neutral-500">
                        <summary className="cursor-pointer font-semibold text-neutral-400">Technical receipt</summary>
                        <p className="mt-2">{row.blockerDetail}</p>
                        {row.note ? <p className="mt-2">{row.note}</p> : null}
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-7 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[11px] leading-relaxed text-neutral-500">
              This wireboard is observability, not a second source of authority. Presence of a key never
              certifies a live connection — the broker Certification Harness owns that proof. Blocker classes
              here are limited to what presence can prove: SETUP PRESENT or NOT CONFIGURED. AUTH BLOCKED, BRIDGE
              UNREACHABLE, ENTITLEMENT, and the rest require a live probe and are never guessed from a missing
              variable.
            </p>
          </>
        )}
      </main>
      <AnimatePresence>
        {connectOpen && (
          <BrokerConnectPanel
            onClose={() => setConnectOpen(false)}
            fallbackTriggerRef={connectTriggerRef}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
