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
 * "DELAYED BY ENTITLEMENT". CONFIGURED is shown as "SETUP PRESENT",
 * strictly weaker than connected/certified, and labelled as such on-screen.
 *
 * The same page runs on BOTH lanes (local `next dev` and the deployed host);
 * the header states which origin produced the receipt so local↔host drift is
 * visible by comparing two loads.
 */

import React, { useEffect, useRef, useState } from "react";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";
import { usePublishOsStanding } from "@/components/os/osStandingContext";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { Plug2 } from "lucide-react";
import { BrokerConnectPanel } from "@/components/broker/BrokerConnectPanel";
import { readJsonReceipt } from "@/lib/marketData/readJsonReceipt";
import {
  selectReadinessWireboard,
  type ReadinessPayload,
  type ReadinessWireboard,
} from "@/lib/broker/selectReadinessWireboard";
import { WEBULL_LANE_PROVIDERS, readWebullLanes, webullWireboardMeasurements } from "@/lib/broker/webullStatus";
import {
  selectCertificationJoint,
  type CertificationPayload,
  type CertificationJointBoard,
  type JointClass,
} from "@/lib/broker/selectCertificationJoint";
import { WM } from "@/lib/design/wmTokens";

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; wireboard: ReadinessWireboard };

/**
 * The certification board is loaded and rendered SEPARATELY from the readiness
 * wireboard, on purpose. They answer different questions from different
 * endpoints, and a shared load state would let one endpoint's failure erase the
 * other's truth — the page would go blank and imply that nothing is known, when
 * in fact half of it is.
 */
type CertState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; board: CertificationJointBoard };

/** What each joint class means, said in the reader's own terms. Never a colour
 * alone — §9 COLOR+MOTION: colour may reinforce a word, never replace it. */
const JOINT_LABEL: Readonly<Record<JointClass, string>> = {
  FULLY_CERTIFIED: "CERTIFIED",
  NOT_IMPLEMENTED: "NO ADAPTER",
  UNPROBED: "NOT MEASURED",
  FAILED: "FAILED",
  BLOCKED: "UNREACHABLE",
};

export default function ReadinessPage() {
  /*
    A ROOM WITH NO FEED SAYS SO, RATHER THAN STAYING SILENT.

    `compileFeedStanding` renders an unpublished standing as FEED UNKNOWN in
    the masthead and SOURCE UNKNOWN in the provenance footer. That is the right
    reading for a room that has not spoken yet. It is the WRONG reading for a
    room with no market pipeline of any kind: it prints an open question about
    a feed that does not exist, and sends a reader to diagnose nothing.

    Silence is only earned by a POSITIVE declaration — silence and "I have
    nothing to report" look identical in the source and mean opposite things on
    the screen. Hence one line per room rather than a heuristic.
  */
  usePublishOsStanding({ surface: "Readiness", feed: FEEDLESS_SURFACE });

  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [cert, setCert] = useState<CertState>({ phase: "loading" });
  const [origin, setOrigin] = useState<string>("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const connectTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
    let cancelled = false;
    const controller = new AbortController();
    setState({ phase: "loading" });
    (async () => {
      try {
        /*
          MEASUREMENT IS FETCHED ALONGSIDE PRESENCE, NOT INSTEAD OF IT.

          The presence receipt is required; a live probe is a bonus. So the
          Webull probe is awaited with `catch → null` and its failure downgrades
          exactly one row to UNMEASURED rather than blanking the page. An
          unreachable probe must never be able to erase the presence truth —
          nor to masquerade as a clean result.
        */
        /*
          BOTH WEBULL LANES, FROM THE ONE LANE OWNER. (2026-09-25)

          This block used to read /api/broker/webull/status alone and correct
          only the webull-broker row. MEASURED on serving 2026-09-25: the
          "Webull market data" row then read "SETUP PRESENT — NOT MEASURED. No
          live probe exists for this provider yet" while the market-data probe
          existed and was answering 403 MARKET_DATA_NOT_SUBSCRIBED on this
          runtime. `readWebullLanes` reads both lanes' existing routes (each
          failing to NOT MEASURED on its own) and `webullWireboardMeasurements`
          hands each row ONLY the lane it measured — the account list still
          corrects the broker row alone, the market-data read the data row
          alone. The reader returns lane verdicts, never prints: this room
          still carries no market feed.
        */
        const [payload, webullLanes] = await Promise.all([
          readJsonReceipt<ReadinessPayload>(fetch, "/api/broker/readiness", controller.signal),
          readWebullLanes(fetch, controller.signal),
        ]);
        const measurements = webullWireboardMeasurements(webullLanes);
        const probed = Object.values(WEBULL_LANE_PROVIDERS);
        if (!cancelled) setState({ phase: "ready", wireboard: selectReadinessWireboard(payload, measurements, probed) });
      } catch (e) {
        if (!cancelled) setState({ phase: "error", message: e instanceof Error ? e.message : "Network error" });
      }
    })();
    (async () => {
      try {
        const payload = await readJsonReceipt<CertificationPayload>(
          fetch,
          "/api/broker/certification",
          controller.signal,
        );
        if (!cancelled) setCert({ phase: "ready", board: selectCertificationJoint(payload) });
      } catch (e) {
        if (!cancelled) setCert({ phase: "error", message: e instanceof Error ? e.message : "Network error" });
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [attempt]);

  return (
    <div className="min-h-screen bg-[#050506] text-neutral-100">
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(240,180,41,0.14),transparent_68%)]" />
      {/* Was a <main>. MainLayout already wraps this route in
          <main className="wm-app-surface">, so this was a second one and
          "take me to the main content" had two answers. A <div> keeps every
          pixel and returns the landmark to its one owner. See
          src/lib/design/oneRoomHasOneLandmark.enforcement.test.ts. */}
      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
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
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className={`rounded-xl border px-4 py-4 ${state.wireboard.accountService.blockerClass === "SETUP PRESENT" ? "border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.07] to-black/50" : "border-rose-500/20 bg-gradient-to-br from-rose-500/[0.08] to-black/50"}`}>
                <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Account service</div>
                <div className={`mt-2 font-mono text-sm font-semibold ${state.wireboard.accountService.blockerClass === "SETUP PRESENT" ? "text-emerald-300" : "text-rose-300"}`}>
                  {state.wireboard.accountService.blockerClass}
                </div>
                <div className="mt-2 text-[10px] leading-relaxed text-neutral-500">{state.wireboard.accountService.detail}</div>
              </div>
            </div>

            {state.wireboard.nearMisses.length > 0 && (
              <section
                aria-labelledby="wm-near-miss-heading"
                className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-4"
              >
                <h2 id="wm-near-miss-heading" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                  Name mismatch suspected
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-neutral-300">
                  A blocked provider above may not be missing its credential at all — this runtime carries
                  a variable whose NAME closely resembles one the code reads. Renaming is a different fix
                  from adding a secret, so it is called out separately.
                </p>
                <ul className="mt-3 space-y-2">
                  {state.wireboard.nearMisses.map((miss) => (
                    <li
                      key={`${miss.expected}→${miss.found}`}
                      className="rounded-lg border border-white/5 bg-black/40 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-amber-200 ring-1 ring-amber-400/30">
                          {miss.strength}
                        </span>
                        <span className="font-mono text-[11px] text-neutral-200">
                          code reads <span className="text-emerald-300">{miss.expected}</span>
                          {" · "}
                          host has <span className="text-amber-300">{miss.found}</span>
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">{miss.detail}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[10px] leading-relaxed text-neutral-500">
                  Names only — no secret value is read or shown on either side of a pairing. A matching name
                  does not prove the value behind it is valid; that still needs a live probe.
                </p>
              </section>
            )}

            {state.wireboard.empty ? (
              <div className="rounded-lg border border-neutral-800 bg-black/40 px-4 py-6 text-sm text-neutral-400">
                The receipt contained no providers. Nothing to display — reported honestly rather than as
                "all clear".
              </div>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {state.wireboard.rows.map((row) => {
                  /*
                    A MEASURED ROW IS COLOURED BY ITS MEASUREMENT.

                    `row.status === "CONFIGURED"` answers "are the credentials
                    present". It was driving the green border while the live
                    probe on the same runtime said AUTH BLOCKED. A green card
                    over a failing wire is the single most expensive pixel on
                    this page — it is the pixel that ends the investigation.
                  */
                  const isReady = row.live ? row.live.blockerClass === "CONNECTED" : row.status === "CONFIGURED";
                  const attention = row.live?.blockerClass === "AWAITING 2FA";
                  // Amber, not rose: a measured entitlement refusal has a named
                  // human step and is not a broken wire. (2026-09-25)
                  const entitlement = row.live?.blockerClass === "ENTITLEMENT BLOCKED";
                  return (
                    <li
                      key={row.provider}
                      className={`group rounded-xl border px-4 py-4 transition ${
                        isReady
                          ? "border-emerald-500/20 bg-emerald-500/[0.045] hover:border-emerald-500/35"
                          : "border-[#f0b429]/20 bg-[#f0b429]/[0.045] hover:border-[#f0b429]/35"
                      }`}
                      data-provider={row.provider}
                      data-blocker-class={row.blockerClass}
                      data-measured={row.live ? "live" : "presence-only"}
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
                      {/*
                        THE MEASURED SENTENCE COMES FIRST AND IS NOT COLLAPSIBLE.

                        This row previously read "Setup present — verification
                        required" for a provider whose live probe, on this same
                        runtime, was returning AUTH BLOCKED. The evidence to
                        contradict the reassuring line already existed; it just
                        wasn't on the page. Counter-evidence that requires a
                        second fetch by the reader is not surfaced.
                      */}
                      {row.live && (
                        <div
                          className={`mt-3 rounded-lg border px-3 py-2 ${
                            row.live.blockerClass === "CONNECTED"
                              ? "border-emerald-500/25 bg-emerald-500/[0.07]"
                              : attention
                                ? "border-sky-400/30 bg-sky-400/[0.07]"
                                : entitlement
                                  ? "border-amber-400/30 bg-amber-400/[0.07]"
                                  : "border-rose-500/25 bg-rose-500/[0.06]"
                          }`}
                          data-live-class={row.live.blockerClass}
                        >
                          {/*
                            ONE LINE, CLASS FIRST, EVIDENCE VERBATIM. (2026-09-25)
                            "ENTITLEMENT BLOCKED · MEASURED LIVE · 403
                            MARKET_DATA_NOT_SUBSCRIBED at <time>". The status and
                            code come from the receipt (`live.evidence`), never
                            from the class name, so a row can only say "403" when
                            a 403 was answered.
                          */}
                          <div className="font-mono text-[9px] font-semibold uppercase tracking-widest text-neutral-400" data-live-headline>
                            {row.live.blockerClass} · MEASURED LIVE{row.live.evidence ? ` · ${row.live.evidence}` : ""} at {row.live.checkedAt}
                          </div>
                          {row.live.founderAction && (
                            <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-amber-200" data-founder-action>
                              Founder action: {row.live.founderAction}
                            </p>
                          )}
                          <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-200">{row.live.nextAction}</p>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">{row.live.note}</p>
                          <p className="mt-1 font-mono text-[9px] text-neutral-600">provider state {row.live.state}</p>
                        </div>
                      )}
                      <p className="mt-3 text-xs leading-relaxed text-neutral-300">
                        {row.live
                          ? "The measurement above outranks the presence check below. Presence says what this runtime carries; the probe says what the provider actually answered."
                          : isReady && row.probed
                          ? "Setup present — NOT MEASURED on this load. A live probe exists for this provider but did not answer, so this row proves credentials are installed and nothing more. Reload to measure again."
                          : isReady
                          ? "Setup present — NOT MEASURED. No live probe exists for this provider yet, so this row proves credentials are installed and nothing more."
                          : row.nameMismatches.length > 0
                            ? "This provider is missing a name the code reads — but this host carries a lookalike for it. Check the name mismatch below before obtaining any new secret."
                            : "This RUNNING host does not carry the credential name(s) this provider reads. That is a deployment binding, not proof the integration is absent — the adapter may already exist in this build."}
                      </p>
                      {/*
                        Surfaced OUTSIDE the collapsed "Technical receipt". For six days
                        (2026-09-05 → 09-11) the finnhub lookalike was reported on this page
                        while this row's visible line read "still needs setup" — the counter-
                        evidence existed and lost to the summary sentence above it. A fact
                        that only wins when the reader expands a disclosure is not surfaced.
                      */}
                      {row.nameMismatches.length > 0 && (
                        <ul className="mt-3 space-y-2 rounded-lg border border-[#f0b429]/20 bg-[#f0b429]/[0.06] px-3 py-2">
                          {row.nameMismatches.map((m) => (
                            <li key={`${m.expected}->${m.found}`} className="text-[11px] leading-relaxed text-[#f0b429]">
                              <span className="font-mono font-semibold uppercase tracking-widest">
                                Name mismatch suspected · {m.strength}
                              </span>
                              <span className="mt-1 block font-mono text-neutral-300">
                                code reads {m.expected} · host carries {m.found}
                              </span>
                              <span className="mt-1 block text-neutral-400">{m.detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}
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

            {/*
              CERTIFICATION JOINT BOARD.

              This section exists because the paragraph below used to be the ONLY
              mention of the Certification Harness anywhere a human could reach.
              `/api/broker/certification` had shipped a full twelve-stage read
              side and no surface consumed it — backend green, frontend dark. The
              prose pointed at a door that was never cut.

              It deliberately renders ONE row per broker naming the first link
              that is not holding, rather than forty-eight rows of PENDING. An
              ordered chain has exactly one interesting element.
            */}
            <section className="mt-8" aria-labelledby="cert-joint-heading">
              <h2
                id="cert-joint-heading"
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400"
              >
                Certification · next link
              </h2>

              {cert.phase === "loading" && (
                <p className="mt-2 text-[11px] text-neutral-500">Reading the certification receipt…</p>
              )}

              {cert.phase === "error" && (
                // An unreachable endpoint is NOT "nothing to certify". Saying so
                // would let a network failure read as a clean board.
                <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
                  Certification receipt UNREACHABLE — {cert.message}. This says nothing about whether any
                  broker is certified; it says this page could not ask.
                </p>
              )}

              {cert.phase === "ready" && (
                <>
                  <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">{cert.board.summary}</p>
                  <ul className="mt-3 space-y-2">
                    {cert.board.rows.map((row) => (
                      <li
                        key={row.brokerId}
                        className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                      >
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="font-mono text-[12px] font-semibold uppercase tracking-widest text-neutral-200">
                            {row.brokerId}
                          </span>
                          <span
                            className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
                            style={{
                              color:
                                row.jointClass === "FULLY_CERTIFIED" ? WM.gold.hero : WM.gold.mark,
                            }}
                          >
                            {JOINT_LABEL[row.jointClass]}
                          </span>
                          {row.joint && (
                            <span className="font-mono text-[11px] text-neutral-400">
                              at {row.joint}
                            </span>
                          )}
                          <span className="ml-auto font-mono text-[10px] text-neutral-500">
                            {/*
                              Spelled out rather than rendered as "0/12". A bare
                              fraction reads as a failing grade; the words carry
                              the qualifier, and the NOT MEASURED chip above says
                              whether the zero is a result or an absence of one.
                            */}
                            {row.passedCount} of {row.totalStages} stages passed
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">{row.detail}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
                          Owner: {row.owner === "NOBODY" ? "no direct action" : row.owner.toLowerCase()}
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <p className="mt-7 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[11px] leading-relaxed text-neutral-500">
              This wireboard is observability, not a second source of authority. Presence of a key never
              certifies a live connection. A row shows SETUP PRESENT or NOT CONFIGURED when presence is all
              this page has — and says NOT MEASURED out loud so a quiet row is never mistaken for a passing
              one. CONNECTED, AWAITING 2FA, AUTH BLOCKED, ENTITLEMENT BLOCKED and NOT CONNECTED appear only on
              rows that carry a real probe result from that provider&apos;s own route, and are never guessed
              from a missing variable.
            </p>
          </>
        )}
      </div>
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
