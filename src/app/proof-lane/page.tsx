"use client";

/**
 * /proof-lane — Founder-visible THEORETICAL pace mountain for the
 * $100 → $1,000,000 Proof Lane.
 *
 * Founder canon: "ATH/WOW Overflow Options Studio — 3·6·9·12 Challenge
 * Engine — Invention Canon v0.2" §21 LAUNCH PROTOCOL.
 * The live $100 Proof Lane launches the week of 2026-08-24.
 * This surface is READ-ONLY math today — the MEASURED LIVE overlay
 * arrives in the next atom once the first real session lands.
 *
 * Rejection guarantees rendered on-screen:
 *  - Every number carries THEORETICAL truth label (canon §13).
 *  - No language urges "risk more to catch up" (canon §12).
 *  - R and contract return % are shown as SEPARATE measurements (§24).
 *  - "$1,000,000 aspirational target, not an earnings promise" (§18).
 */

import React, { useState } from "react";
import Link from "next/link";
import {
  CANONICAL_HORIZONS,
  PACE_TRUTH_LABEL,
  paceForHorizon,
  theoreticalBalanceAtSession,
  paceStatus,
  SESSIONS_PER_MONTH,
} from "@/lib/proofLane/proofLanePace";
import { DAY_MODEL_LABELS } from "@/lib/proofLane/proofLaneR";

const START = 100;
const TARGET = 1_000_000;

function fmtPct(x: number) {
  return `${(x * 100).toFixed(x >= 1 ? 0 : x >= 0.1 ? 1 : 2)}%`;
}
function fmtUsd(x: number) {
  if (x >= 1_000_000) return `$${(x / 1_000_000).toFixed(2)}M`;
  if (x >= 1_000) return `$${(x / 1_000).toFixed(1)}k`;
  return `$${x.toFixed(2)}`;
}

export default function ProofLanePage() {
  const [sessionIndex, setSessionIndex] = useState(0);
  const [actualBalance, setActualBalance] = useState(START);
  const [selectedHorizon, setSelectedHorizon] = useState<2 | 3 | 4 | 6 | 9 | 12>(6);

  const status = paceStatus(selectedHorizon, sessionIndex, actualBalance, START, TARGET);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black text-neutral-100">
      <header className="border-b border-amber-900/40 bg-black/60 backdrop-blur px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <Link href="/" className="text-xs uppercase tracking-widest text-amber-400/80 hover:text-amber-300">
            ← WM Pro
          </Link>
          <span className="text-neutral-600">·</span>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Proof Lane</h1>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-amber-300">
            {PACE_TRUTH_LABEL}
          </span>
        </div>
        <p className="max-w-6xl mx-auto mt-2 text-xs sm:text-sm text-neutral-400">
          The $100 → $1,000,000 challenge is an <span className="text-neutral-200">educational trading and scenario experiment</span> in discipline, risk, options mechanics, and personal-edge development. $1M is an aspirational hypothetical target,{" "}
          <span className="text-neutral-200">not an earnings promise</span>. Actual trading can include partial or complete loss of capital.
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-10">
        <section aria-labelledby="mountain">
          <h2 id="mountain" className="text-sm uppercase tracking-widest text-amber-400/80 mb-3">
            Pace Mountain — Required Theoretical Rate
          </h2>
          <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950/60">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-neutral-500 bg-black/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Horizon</th>
                  <th className="px-3 py-2 font-medium">Sessions</th>
                  <th className="px-3 py-2 font-medium">Per Week</th>
                  <th className="px-3 py-2 font-medium">Per Session</th>
                  <th className="px-3 py-2 font-medium text-right">Truth</th>
                </tr>
              </thead>
              <tbody>
                {CANONICAL_HORIZONS.map((h) => {
                  const row = paceForHorizon(h, START, TARGET);
                  return (
                    <tr key={h} className="border-t border-neutral-900 hover:bg-neutral-900/40">
                      <td className="px-3 py-2 font-semibold text-neutral-100">{h} months</td>
                      <td className="px-3 py-2 text-neutral-300">{Math.round(row.sessions)}</td>
                      <td className="px-3 py-2 font-mono text-amber-300">{fmtPct(row.weeklyRate)}</td>
                      <td className="px-3 py-2 font-mono text-amber-300">{fmtPct(row.sessionRate)}</td>
                      <td className="px-3 py-2 text-right text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                        THEORETICAL
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            21 sessions/month, 4.345 weeks/month. Compound (geometric), not additive. Numbers are mathematics — not forecasts, not permission to trade.
          </p>
        </section>

        <section aria-labelledby="compass" className="rounded-xl border border-amber-900/40 bg-gradient-to-br from-neutral-950 to-black p-5">
          <h2 id="compass" className="text-sm uppercase tracking-widest text-amber-400/80 mb-3">
            Catch-Up Compass
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <label className="block">
              <span className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Horizon</span>
              <select
                value={selectedHorizon}
                onChange={(e) => setSelectedHorizon(Number(e.target.value) as 2 | 3 | 4 | 6 | 9 | 12)}
                className="w-full rounded-md border border-neutral-800 bg-black/60 px-3 py-2 text-sm"
              >
                {CANONICAL_HORIZONS.map((h) => (
                  <option key={h} value={h}>
                    {h} months
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                Session # (0 = start, {selectedHorizon * SESSIONS_PER_MONTH} = target)
              </span>
              <input
                type="number"
                min={0}
                max={selectedHorizon * SESSIONS_PER_MONTH}
                value={sessionIndex}
                onChange={(e) => setSessionIndex(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-md border border-neutral-800 bg-black/60 px-3 py-2 text-sm font-mono"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Actual balance ($)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={actualBalance}
                onChange={(e) => setActualBalance(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-md border border-neutral-800 bg-black/60 px-3 py-2 text-sm font-mono"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border border-neutral-800 bg-black/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">Theoretical</div>
              <div className="mt-1 font-mono text-lg text-neutral-100">
                {fmtUsd(status.theoreticalBalance)}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-black/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">Actual</div>
              <div className="mt-1 font-mono text-lg text-neutral-100">{fmtUsd(status.actualBalance)}</div>
            </div>
            <div
              className={`rounded-lg border px-3 py-2 ${
                status.status === "ON_PACE"
                  ? "border-emerald-700/60 bg-emerald-950/30"
                  : status.status === "AHEAD"
                    ? "border-amber-700/60 bg-amber-950/30"
                    : "border-rose-800/60 bg-rose-950/30"
              }`}
            >
              <div className="text-[10px] uppercase tracking-widest text-neutral-400">Pace Status</div>
              <div className="mt-1 font-mono text-lg">
                {status.status}{" "}
                <span className="text-xs text-neutral-400">
                  ({status.differenceRatio >= 0 ? "+" : ""}
                  {fmtPct(status.differenceRatio)})
                </span>
              </div>
            </div>
          </div>

          <p
            data-testid="pace-message"
            className={`text-sm ${
              status.status === "BEHIND"
                ? "text-rose-300"
                : status.status === "AHEAD"
                  ? "text-amber-300"
                  : "text-emerald-300"
            }`}
          >
            {status.humanMessage}
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Behind pace changes the timeline, not the setup standard. Ahead of pace does not lower the setup standard. No-trade can still be the best decision.
          </p>
        </section>

        <section aria-labelledby="models">
          <h2 id="models" className="text-sm uppercase tracking-widest text-amber-400/80 mb-3">
            Day Models — Canon §3
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {(["M0", "M1", "M2"] as const).map((m) => (
              <div key={m} className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
                <div className="font-mono text-xs text-amber-400/80">{m}</div>
                <div className="mt-1 text-sm text-neutral-200">{DAY_MODEL_LABELS[m]}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Middle-of-range guessing is not M2. Any missing chain link → M0. No green-day count creates permission to trade.
          </p>
        </section>

        <section aria-labelledby="launch" className="rounded-xl border border-amber-800/50 bg-amber-950/10 p-5">
          <h2 id="launch" className="text-sm uppercase tracking-widest text-amber-400/80 mb-2">
            Launch Protocol — Week of 2026-08-24
          </h2>
          <p className="text-sm text-neutral-200">
            The MEASURED LIVE overlay activates when the first real session is recorded. Objective is not "make $1M fast" — the objective is the first MEASURED LIVE dataset for the invention. Five sessions of faithful classification and execution, not five green days.
          </p>
        </section>
      </main>
    </div>
  );
}
