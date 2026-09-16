"use client";

/**
 * /proof-lane — Founder-visible THEORETICAL pace mountain for the
 * $100 → $1,000,000 Proof Lane.
 *
 * Founder canon: "ATH/WOW Overflow Options Studio — 3·6·9·12 Challenge
 * Engine — Invention Canon v0.2" §21 LAUNCH PROTOCOL.
 * The live $100 Proof Lane launches the week of 2026-08-24.
 * This surface is read-only pace math plus a browser-local Journal summary.
 * Journal records do not prove live or brokerage execution provenance.
 *
 * Rejection guarantees rendered on-screen:
 *  - Every number carries THEORETICAL truth label (canon §13).
 *  - No language urges "risk more to catch up" (canon §12).
 *  - R and contract return % are shown as SEPARATE measurements (§24).
 *  - "$1,000,000 aspirational target, not an earnings promise" (§18).
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  cumulativeRFact,
  expectancyFact,
  maxDrawdownFact,
  winLossLineFact,
  type RTone,
} from "@/lib/proofLane/edgeCellFacts";

/**
 * COLOUR IS A CLAIM, so colour is derived from a declared tone and from
 * nothing else. It is NOT derived from `>= 0` (which paints a flat session
 * green) and NOT from a nullish check (which painted an unknown expectancy
 * red). FLAT and NONE are visibly neutral because they are not results.
 */
const TONE_CLASS: Record<RTone, string> = {
  GAIN: "text-emerald-300",
  LOSS: "text-rose-300",
  FLAT: "text-neutral-200",
  NONE: "text-neutral-500",
};
function toneClass(tone: RTone): string {
  return TONE_CLASS[tone];
}
import {
  CANONICAL_HORIZONS,
  PACE_TRUTH_LABEL,
  paceForHorizon,
  theoreticalBalanceAtSession,
  paceStatus,
  normalizeSessionIndex,
  SESSIONS_PER_MONTH,
} from "@/lib/proofLane/proofLanePace";
import { DAY_MODEL_LABELS } from "@/lib/proofLane/proofLaneR";
import {
  JOURNAL_UPDATED_EVENT,
} from "@/lib/traderMemory/adapters/journalStorage";
import {
  readProofLaneJournalEdge,
  type ProofLaneJournalEdgeRead,
} from "@/lib/proofLane/readJournalEdge";
import {
  CHALLENGE_JOURNEY,
  CHALLENGE_EXECUTION_BOUNDARY,
  CHALLENGE_ENROLLMENT_BOUNDARY,
} from "@/lib/proofLane/challengeJourney";

/**
 * useJournalEdge — SSR-safe, read-only view over the canonical browser-local
 * Journal transport. It never claims account or server durability.
 * store and returns the SessionEdge summary over R-tagged entries.
 * Never shows on server; empty until the client hydrates. The
 * hook subscribes to wm-journal-updated so a save from /journal
 * reflects instantly on /proof-lane.
 */
function useJournalEdge() {
  const [readState, setReadState] = useState<ProofLaneJournalEdgeRead | { status: "LOADING" }>({ status: "LOADING" });
  useEffect(() => {
    const compute = () => {
      try {
        setReadState(readProofLaneJournalEdge(localStorage));
      } catch {
        setReadState({ status: "UNAVAILABLE", reason: "Browser Journal storage could not be read." });
      }
    };
    compute();
    const on = () => compute();
    window.addEventListener(JOURNAL_UPDATED_EVENT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return readState;
}

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
  const journalEdge = useJournalEdge();
  const measured = journalEdge.status === "RESOLVED" ? journalEdge.edge : null;

  // Every MEASURED JOURNAL cell is owned by edgeCellFacts. The owners take
  // `unknown` precisely so this call site needs no `!`, no fallback number and
  // no second opinion: an absent input produces a NONE tone and a sentence
  // saying what is absent, which is the same answer the gate below would have
  // needed anyway.
  const cumulativeFact = cumulativeRFact(measured?.cumulativeR, measured?.rTaggedEntries ?? 0);
  const expectancyCell = expectancyFact(measured?.expectancyR, measured?.rTaggedEntries ?? 0);
  const drawdownFact = maxDrawdownFact(measured?.maxDrawdownR, measured?.rTaggedEntries ?? 0);
  const winLine = winLossLineFact(
    "win",
    measured?.winners ?? 0,
    measured?.rWinnerSampleSize ?? 0,
    measured?.avgWinnerR,
  );
  const lossLine = winLossLineFact(
    "loss",
    measured?.losers ?? 0,
    measured?.rLoserSampleSize ?? 0,
    measured?.avgLoserR,
  );

  const status = paceStatus(selectedHorizon, sessionIndex, actualBalance, START, TARGET);

  return (
    // THE ROOM NO LONGER PAINTS ITS OWN FLOOR.
    //
    // This carried `bg-[#050506]` — a near-black opaque fill on an element
    // that also claims `h-full`. In the July shell that was merely REDUNDANT:
    // MainLayout already paints `bg-wm-black wm-universe` behind it, so the
    // slab landed on an identical slab and nobody could see it. In the OS
    // frame the same line is a DEFECT: it would cover the sanctuary's
    // vignette, grain and water-breath for the whole height of the room.
    //
    // Redundant-then-fatal is why it survived. Nothing looks wrong today, so
    // there is no pressure to remove it, and the damage only appears on the
    // commit that promotes the route — by which point the promotion gets
    // blamed. `#050506` is the same colour /morning-prep and /charts were
    // each fixed for, separately.
    //
    // It also survived a scan: a grep for bg-wm-black / bg-wm-dark /
    // WM.surface.deep reported this file CLEAN, because those are the names
    // previous offenders used and this one is spelled as an arbitrary value.
    // Found instead by src/lib/design/osRoomPlane.ts, which states the rule
    // by effect — near-black AND opaque AND full-extent.
    <div className="h-full overflow-y-auto text-neutral-100">
      {/* Was a <main>. MainLayout already wraps this route in
          <main className="wm-app-surface">, so this was a second one and
          "take me to the main content" had two answers. A <div> keeps every
          pixel and returns the landmark to its one owner. See
          src/lib/design/oneRoomHasOneLandmark.enforcement.test.ts. */}
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/5 pb-4">
          <Link href="/education" className="inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-widest text-amber-400/80 hover:text-amber-300">
            ← Academy
          </Link>
          <span className="text-neutral-700">/</span>
          <h1 className="text-base font-semibold tracking-tight">Challenge Lab</h1>
          <span className="ml-auto inline-flex min-h-8 items-center rounded-full border border-amber-500/30 bg-amber-950/25 px-3 text-[9px] font-mono uppercase tracking-widest text-amber-300">
            {PACE_TRUTH_LABEL}
          </span>
        </div>

        <section aria-labelledby="academy-challenge" className="rounded-2xl border border-amber-700/50 bg-gradient-to-br from-amber-950/30 via-neutral-950 to-black p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-400/80">
                Academy Challenge · preview
              </div>
              <h2 id="academy-challenge" className="mt-1 text-xl font-semibold text-neutral-100">
                Learn → Plan → Practice → Review
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">
                This private Academy lesson models the $100 challenge as an educational scenario in discipline, risk, options mechanics, and personal-edge development. $100 means simulated starting capital—not a price, deposit, funded account, or earnings promise. Actual trading can include partial or complete loss of capital.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-amber-700/50 bg-amber-950/30 px-3 text-[10px] font-mono uppercase tracking-wider text-amber-200">
                Enrollment not connected
              </span>
              <span className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-rose-700/50 bg-rose-950/30 px-3 text-[10px] font-mono uppercase tracking-wider text-rose-200">
                Live execution excluded
              </span>
            </div>
          </div>

          <ol className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {CHALLENGE_JOURNEY.map((stage) => (
              <li key={stage.id} className="flex min-h-[190px] flex-col rounded-xl border border-neutral-800 bg-black/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-amber-300">0{stage.step}</span>
                  <span className="max-w-[75%] truncate text-[9px] font-mono uppercase tracking-wider text-neutral-600" title={stage.truth}>
                    {stage.truth.replaceAll("_", " ")}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-neutral-100">{stage.title}</h3>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-neutral-400">{stage.description}</p>
                <Link
                  href={stage.href}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-700/50 bg-amber-950/20 px-3 text-xs font-semibold text-amber-200 transition-colors hover:border-amber-500 hover:bg-amber-950/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                >
                  {stage.action}
                </Link>
              </li>
            ))}
          </ol>

          <p className="mt-4 text-xs text-neutral-500">
            Academy boundaries: <span className="font-mono text-amber-300">{CHALLENGE_ENROLLMENT_BOUNDARY}</span> · <span className="font-mono text-rose-300">{CHALLENGE_EXECUTION_BOUNDARY}</span>. Previewing this path creates no enrollment or payment. Academy provides browser-local education and paper rehearsal only; it cannot authorize live execution.
          </p>
        </section>

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
                onChange={(e) => {
                  const nextHorizon = Number(e.target.value) as 2 | 3 | 4 | 6 | 9 | 12;
                  setSelectedHorizon(nextHorizon);
                  setSessionIndex((current) => normalizeSessionIndex(current, nextHorizon));
                }}
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
                step={1}
                value={sessionIndex}
                onChange={(e) => setSessionIndex(
                  normalizeSessionIndex(Number(e.target.value), selectedHorizon),
                )}
                className="w-full rounded-md border border-neutral-800 bg-black/60 px-3 py-2 text-sm font-mono"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Manual scenario balance ($)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={actualBalance}
                onChange={(e) => setActualBalance(Math.max(0, Number(e.target.value)))}
                aria-describedby="scenario-balance-boundary"
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
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">Manual Scenario</div>
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
          <p id="scenario-balance-boundary" className="mt-2 text-xs text-neutral-500">
            Manual scenario input only · not connected to a brokerage account, Paper balance, Journal balance, or live execution.
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

        {/* Browser-local Journal summary. R-tagged records can support
            measured process math, but without brokerage provenance they
            cannot be promoted into a live-execution claim. */}
        {journalEdge.status === "UNAVAILABLE" && (
          <section
            role="status"
            aria-live="polite"
            className="rounded-xl border border-rose-800/50 bg-rose-950/10 p-5"
          >
            <h2 className="text-sm uppercase tracking-widest text-rose-300">
              Journal summary unavailable
            </h2>
            <p className="mt-2 text-sm text-neutral-300">
              Saved browser Journal data could not be read safely. No measured
              result is shown; your Journal has not been cleared or replaced.
            </p>
          </section>
        )}
        {measured && measured.rTaggedEntries > 0 && (
          <section aria-labelledby="measured-journal" className="rounded-xl border border-emerald-800/50 bg-emerald-950/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 id="measured-journal" className="text-sm uppercase tracking-widest text-emerald-400/90">
                Measured Journal — Personal Edge (browser-local 7d window)
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-emerald-300">
                MEASURED JOURNAL
              </span>
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-neutral-800 bg-black/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">R-Tagged</div>
                <div className="mt-1 font-mono text-lg text-neutral-100">
                  {measured.rTaggedEntries} / {measured.totalEntries}
                </div>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">Expectancy</div>
                <div
                  className={`mt-1 font-mono text-lg ${toneClass(expectancyCell.tone)}`}
                  title={expectancyCell.reason}
                  aria-label={`Expectancy: ${expectancyCell.text}. ${expectancyCell.reason}`}
                >
                  {expectancyCell.text}
                </div>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">Cumulative R</div>
                <div
                  className={`mt-1 font-mono text-lg ${toneClass(cumulativeFact.tone)}`}
                  title={cumulativeFact.reason}
                  aria-label={`Cumulative R: ${cumulativeFact.text}. ${cumulativeFact.reason}`}
                >
                  {cumulativeFact.text}
                </div>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">Max Drawdown</div>
                <div
                  className={`mt-1 font-mono text-lg ${toneClass(drawdownFact.tone)}`}
                  title={drawdownFact.reason}
                  aria-label={`Max drawdown: ${drawdownFact.text}. ${drawdownFact.reason}`}
                >
                  {drawdownFact.text}
                </div>
              </div>
            </div>
            <div className="mt-3 grid sm:grid-cols-3 gap-3 text-xs">
              {/* TWO POPULATIONS, TWO DENOMINATORS, SAID OUT LOUD. The count is
                  by the grade on the entry; the average is over R-tagged
                  entries only. Neither number may imply the other's sample. */}
              <div
                className={`font-mono ${toneClass(winLine.tone)}`}
                title={winLine.reason}
                aria-label={`Winners. ${winLine.text}. ${winLine.reason}`}
              >
                {winLine.text}
              </div>
              <div
                className={`font-mono ${toneClass(lossLine.tone)}`}
                title={lossLine.reason}
                aria-label={`Losers. ${lossLine.text}. ${lossLine.reason}`}
              >
                {lossLine.text}
              </div>
              <div className="text-neutral-400">
                Rules Adhered: {measured.rulesAdheredPct != null ? (
                  <span className="text-emerald-300 font-mono">{(measured.rulesAdheredPct * 100).toFixed(0)}%</span>
                ) : (
                  <span className="text-neutral-500">— (no graded process yet)</span>
                )}
              </div>
              <div className="text-neutral-400">
                Capture % (canon §7): {measured.avgCaptureRatio != null ? (
                  <>
                    <span className="text-emerald-300 font-mono">{(measured.avgCaptureRatio * 100).toFixed(0)}%</span>
                    <span className="text-neutral-500"> · n={measured.captureSampleSize}</span>
                  </>
                ) : (
                  <span className="text-neutral-500">— (no MFE recorded yet)</span>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              MEASURED JOURNAL reads only browser-local entries with Planned R defined pre-entry per canon §4. Entries without R are counted but excluded from expectancy — never fabricated. Capture % requires both realized R and max-favorable R per canon §7. Journal entries are not brokerage-certified live-execution receipts.
            </p>
          </section>
        )}

        <section aria-labelledby="launch" className="rounded-xl border border-amber-800/50 bg-amber-950/10 p-5">
          <h2 id="launch" className="text-sm uppercase tracking-widest text-amber-400/80 mb-2">
            Launch Protocol — Week of 2026-08-24
          </h2>
          <p className="text-sm text-neutral-200">
            The measured overlay activates when the first R-tagged Journal record is available. Objective is not "make $1M fast" — it is a trustworthy process dataset. Live-execution status remains unknown without authoritative brokerage evidence. Five sessions of faithful classification and execution, not five green days.
          </p>
        </section>
      </div>
    </div>
  );
}
