"use client";

import React from "react";
import { AlertTriangle, Link2, ShieldCheck, Users } from "lucide-react";
import { WM } from "@/lib/design/wmTokens";
import {
  selectCopyTradingGate,
  type CopyTradingGate,
  type CopyTradingProviderInput,
  type CopyTradingRequirementState,
} from "@/lib/broker/copyTradingGate";

/**
 * A GATE THAT CANNOT REPORT ITS OWN STATE IS A SIGN, NOT A GATE.
 *
 * This page used to render a hard-coded "Not available" chip and a static
 * list of four activation requirements. The verdict was correct, and it was
 * correct the way a stopped clock is: the same pixels rendered whether a
 * broker was certified WRITE_LIVE or whether no adapter was registered at
 * all. Nothing here read an adapter, a health() answer, or a certification
 * stage. The page COULD NOT CHANGE.
 *
 * An unmeasured NO is the same defect class as an unmeasured YES. It merely
 * fails in the direction we happen to like. So the four requirements are now
 * MEASURED by `selectCopyTradingGate` against the canon §W3 certification
 * ladder, read from the `/api/broker/status` aggregate — the same honest
 * report whose rows are enumerated from the adapter registry rather than
 * retyped. If someone certifies a broker tomorrow, this room moves.
 *
 * The gate is still shut today, and now it says WHY, per requirement, with
 * the evidence attached.
 */

/** COLOUR IS A CLAIM. TOTAL on purpose — a fourth requirement state fails
 *  the build rather than inheriting the tone of a passing one. */
const REQ_TONE: Record<CopyTradingRequirementState, { fg: string; border: string; bg: string; word: string }> = {
  MET:        { fg: WM.state.ok,   border: `${WM.state.ok}44`,   bg: `${WM.state.ok}12`,   word: "Met" },
  UNMET:      { fg: WM.state.warn, border: `${WM.state.warn}44`, bg: `${WM.state.warn}12`, word: "Not met" },
  UNMEASURED: { fg: WM.text.muted, border: `${WM.border.line}`,  bg: "transparent",        word: "Unknown" },
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ok"; gate: CopyTradingGate }
  | { kind: "unauthorized" }
  | { kind: "error"; detail: string };

interface StatusBody {
  readonly providers?: readonly CopyTradingProviderInput[];
}

export default function CopyTradingPage() {
  const [state, setState] = React.useState<LoadState>({ kind: "loading" });

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/broker/status", { cache: "no-store" });
        if (!alive) return;
        if (res.status === 401 || res.status === 403) {
          setState({ kind: "unauthorized" });
          return;
        }
        if (!res.ok) {
          setState({ kind: "error", detail: `broker status responded ${res.status}` });
          return;
        }
        const body = (await res.json()) as StatusBody;
        if (!alive) return;
        if (!Array.isArray(body.providers)) {
          setState({ kind: "error", detail: "broker status returned no provider list" });
          return;
        }
        setState({ kind: "ok", gate: selectCopyTradingGate(body.providers) });
      } catch (err) {
        if (!alive) return;
        setState({ kind: "error", detail: err instanceof Error ? err.message : "network failure" });
      }
    })();
    return () => { alive = false; };
  }, []);

  // The header verdict chip. Every branch states what it actually knows —
  // none of them assert a measured verdict from an unmeasured state.
  const verdict =
    state.kind === "ok"
      ? { text: state.gate.available ? "Requirements met" : "Requirements unmet", tone: state.gate.available ? REQ_TONE.MET : REQ_TONE.UNMET }
      : state.kind === "loading"
        ? { text: "Checking broker certification…", tone: REQ_TONE.UNMEASURED }
        : state.kind === "unauthorized"
          ? { text: "Sign in to measure", tone: REQ_TONE.UNMEASURED }
          : { text: "Could not measure", tone: REQ_TONE.UNMEASURED };

  return (
    <div
      className="h-full overflow-y-auto"
      style={{
        background: `radial-gradient(1200px 700px at 50% -10%, rgba(212,175,55,0.06), transparent 60%), ${WM.surface.deepest}`,
        color: WM.text.body,
      }}
    >
      <div className="mx-auto max-w-5xl" style={{ padding: "24px clamp(16px, 4vw, 32px)" }}>
        {/* Header — WM atmosphere */}
        <header
          style={{
            borderRadius: 14,
            border: `1px solid ${WM.border.line}`,
            background: `linear-gradient(180deg, ${WM.surface.deep} 0%, ${WM.surface.mid} 100%)`,
            padding: "20px 22px",
          }}
        >
          <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
            <div
              className="grid place-items-center"
              style={{
                width: 44, height: 44, borderRadius: 999,
                background: "linear-gradient(160deg, rgba(212,175,55,0.22), rgba(201,165,92,0.08))",
                border: "1px solid rgba(212,175,55,0.35)",
                boxShadow: "inset 0 0 20px -8px rgba(212,175,55,0.4)",
                color: WM.gold.hero,
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h1
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "clamp(20px, 3.5vw, 26px)",
                  fontWeight: 400, color: WM.text.hero,
                  letterSpacing: -0.3, margin: 0, lineHeight: 1.1,
                }}
              >
                Copy Trading
              </h1>
              <p
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 12, fontStyle: "italic",
                  color: WM.text.muted, marginTop: 4,
                }}
              >
                Verified broker performance and authorization required
              </p>
            </div>
            <span
              className="ml-auto"
              data-testid="copy-trading-verdict"
              style={{
                padding: "3px 10px", borderRadius: 999,
                border: `1px solid ${verdict.tone.border}`,
                background: verdict.tone.bg,
                color: verdict.tone.fg,
                fontSize: 9, letterSpacing: 0.32, fontWeight: 800,
                textTransform: "uppercase",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {verdict.text}
            </span>
          </div>
          {state.kind === "ok" && (
            <p
              data-testid="copy-trading-headline"
              style={{ marginTop: 12, fontSize: 12, color: WM.text.muted, lineHeight: 1.6 }}
            >
              {state.gate.headline}
              {state.gate.bestBroker !== null && (
                <>
                  {" "}Furthest-certified broker: <strong style={{ color: WM.text.body }}>{state.gate.bestBroker}</strong>{" "}
                  at <strong style={{ color: WM.text.body }}>{state.gate.bestLevel}</strong>.
                </>
              )}
            </p>
          )}
        </header>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-wm-red/25 bg-wm-red/5 p-6">
            <div className="flex items-center gap-2 font-black text-wm-red">
              <AlertTriangle size={17} /> Fictional traders removed
            </div>
            <p className="mt-3 text-sm leading-7 text-wm-text-muted">
              WealthyMindsets no longer displays invented traders, win rates, returns, follower counts, risk ratings, or simulated copy allocations.
            </p>
          </section>

          <section className="rounded-3xl border border-wm-green/25 bg-wm-green/5 p-6">
            <div className="flex items-center gap-2 font-black text-wm-green">
              <ShieldCheck size={17} /> Activation requirements
            </div>

            {state.kind === "loading" && (
              <p className="mt-3 text-sm leading-6 text-wm-text-muted">
                Reading broker certification…
              </p>
            )}

            {state.kind === "unauthorized" && (
              <p className="mt-3 text-sm leading-6 text-wm-text-muted">
                Broker certification is only readable inside a signed-in WM session. These requirements are unknown right now — not failed.
              </p>
            )}

            {state.kind === "error" && (
              <p className="mt-3 text-sm leading-6 text-wm-text-muted">
                WM could not read broker certification ({state.detail}). These requirements are unknown right now — not failed.
              </p>
            )}

            {state.kind === "ok" && (
              <ul className="mt-3 space-y-3" data-testid="copy-trading-requirements">
                {state.gate.requirements.map(req => {
                  const tone = REQ_TONE[req.state];
                  return (
                    <li key={req.id} style={{ lineHeight: 1.5 }}>
                      <div className="flex items-start gap-2" style={{ flexWrap: "wrap" }}>
                        <span
                          data-testid={`copy-req-${req.id}`}
                          data-req-state={req.state}
                          style={{
                            padding: "2px 8px", borderRadius: 999,
                            border: `1px solid ${tone.border}`,
                            background: tone.bg,
                            color: tone.fg,
                            fontSize: 9, letterSpacing: 0.3, fontWeight: 800,
                            textTransform: "uppercase", whiteSpace: "nowrap",
                          }}
                        >
                          {tone.word}
                        </span>
                        <span className="text-sm text-wm-text-muted" style={{ flex: "1 1 200px" }}>
                          {req.label}
                        </span>
                      </div>
                      {/* The reason travels with the verdict. A state
                          without its evidence is a claim without a source. */}
                      <p style={{ marginTop: 4, fontSize: 11, color: WM.text.muted, lineHeight: 1.55 }}>
                        {req.evidence}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <section className="mt-5 rounded-3xl border border-wm-border bg-wm-card/80 p-7 text-center">
          <Link2 size={28} className="mx-auto text-wm-gold" />
          <h2 className="mt-3 text-lg font-black">Connect a real supported broker first</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-wm-text-dim">
            This feature will remain unavailable until its statistics and executions can come directly from verified broker records.
          </p>
          <p className="mx-auto mt-3 max-w-xl" style={{ fontSize: 11, color: WM.text.muted, lineHeight: 1.6 }}>
            The state above is read from <code>/api/broker/status</code>, whose rows are enumerated from the registered broker adapters. It is a measurement, not a notice.
          </p>
        </section>
      </div>
    </div>
  );
}
