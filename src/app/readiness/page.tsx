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
 * "DELAYED BY ENTITLEMENT". READY is shown as "credentials present",
 * strictly weaker than connected/certified, and labelled as such on-screen.
 *
 * The same page runs on BOTH lanes (local `next dev` and the deployed host);
 * the header states which origin produced the receipt so local↔host drift is
 * visible by comparing two loads.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
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

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/broker/readiness", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setState({ phase: "error", message: `Endpoint returned HTTP ${res.status}` });
          return;
        }
        const payload = (await res.json()) as ReadinessPayload;
        if (!cancelled) setState({ phase: "ready", wireboard: selectReadinessWireboard(payload) });
      } catch (e) {
        if (!cancelled) setState({ phase: "error", message: e instanceof Error ? e.message : "Network error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold tracking-tight">Provider Readiness Wireboard</h1>
            <Link href="/command-deck" className="text-xs text-neutral-400 hover:text-neutral-200">
              ← Command Deck
            </Link>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-neutral-400">
            Presence-only observability. <span className="text-neutral-200">READY</span> means the credentials
            needed to <em>attempt</em> a connection are present — it is strictly weaker than connected or
            certified. A blocked lane names its <span className="text-neutral-200">actual missing config</span>,
            never a fabricated "delayed by entitlement". No secret value is ever read or shown.
          </p>
          {origin && (
            <p className="mt-1 font-mono text-[10px] text-neutral-600">receipt origin: {origin}</p>
          )}
        </header>

        {state.phase === "loading" && (
          <div className="rounded-lg border border-neutral-800 bg-black/40 px-4 py-6 text-sm text-neutral-400">
            Loading readiness receipt…
          </div>
        )}

        {state.phase === "error" && (
          <div className="rounded-lg border border-rose-800/50 bg-rose-950/20 px-4 py-6 text-sm text-rose-200">
            Could not load /api/broker/readiness — {state.message}. This is itself a truthful blocker: the
            wireboard is UNREACHABLE, not "ready".
          </div>
        )}

        {state.phase === "ready" && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <div className="rounded-lg border border-neutral-800 bg-black/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">Providers ready</div>
                <div className="mt-1 font-mono text-lg text-neutral-100">{state.wireboard.summary}</div>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">Env names present</div>
                <div className="mt-1 font-mono text-lg text-neutral-100">
                  {state.wireboard.envPresentCount}/{state.wireboard.envTotalCount}
                </div>
              </div>
            </div>

            {state.wireboard.empty ? (
              <div className="rounded-lg border border-neutral-800 bg-black/40 px-4 py-6 text-sm text-neutral-400">
                The receipt contained no providers. Nothing to display — reported honestly rather than as
                "all clear".
              </div>
            ) : (
              <ul className="space-y-2">
                {state.wireboard.rows.map((row) => {
                  const isReady = row.status === "READY";
                  return (
                    <li
                      key={row.provider}
                      className={`rounded-lg border px-4 py-3 ${
                        isReady
                          ? "border-emerald-800/50 bg-emerald-950/10"
                          : "border-amber-800/50 bg-amber-950/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-100">{row.label}</span>
                          <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                            {row.lane}
                          </span>
                        </div>
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${
                            isReady ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          {row.blockerClass}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-neutral-300">{row.blockerDetail}</p>
                      {row.note && <p className="mt-1 text-[11px] text-neutral-500">{row.note}</p>}
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-6 text-[11px] leading-relaxed text-neutral-500">
              This wireboard is observability, not a second source of authority. Presence of a key never
              certifies a live connection — the broker Certification Harness owns that proof. Blocker classes
              here are limited to what presence can prove: READY or NOT CONFIGURED. AUTH BLOCKED, BRIDGE
              UNREACHABLE, ENTITLEMENT, and the rest require a live probe and are never guessed from a missing
              variable.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
