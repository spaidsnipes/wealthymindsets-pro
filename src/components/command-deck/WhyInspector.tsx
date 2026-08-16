"use client";
import * as React from "react";
import type { CanonicalMarketState, MarketStateDimension } from "@/lib/marketData/canonicalMarketState";
import type { DLARVM } from "@/lib/marketData/viewModels/selectDLAR";
import type { CLCVM } from "@/lib/marketData/viewModels/selectCLC";

/**
 * WhyInspector — the "WHY?" evidence inspector Founder Aug-14 called out.
 *
 * "When the user clicks a Story state / hero state / important derived
 *  conclusion, show the available evidence."
 *
 * Renders ONLY what's actually present. Never fabricates evidence.
 * Contradictions + unknowns are surfaced verbatim from the producer.
 */

export type WhyTarget =
  | { kind: "hero" }
  | { kind: "story"; chapter: string | null }
  | { kind: "dlar"; dim: "direction" | "location" | "aggression" | "response" }
  | { kind: "clc"; leg: "context" | "location" | "confirmation" };

export interface WhyInspectorProps {
  target: WhyTarget | null;
  state: CanonicalMarketState | null;
  dlar: DLARVM | null;
  clc: CLCVM | null;
  onClose?: () => void;
  className?: string;
}

function dimEvidence(dim: MarketStateDimension | null | undefined) {
  if (!dim) return { evidence: [], contradictions: [], unknowns: [], value: null, resolution: null, confidence: null };
  return {
    evidence: dim.evidence,
    contradictions: dim.contradictions,
    unknowns: dim.unknowns,
    value: dim.value,
    resolution: dim.resolution,
    confidence: dim.confidence,
  };
}

function pickDim(state: CanonicalMarketState | null, key: "direction" | "location" | "aggression"): MarketStateDimension | null {
  if (!state) return null;
  return state[key] ?? null;
}

export function WhyInspector({ target, state, dlar, clc, onClose, className }: WhyInspectorProps) {
  if (!target) return null;

  let title = "Why?";
  let subtitle = "";
  let value: string | null = null;
  let resolution: string | null = null;
  let confidence: number | null = null;
  let evidence: { basis: string; source: string; observedAt: number; fidelity: string; eventId: string }[] = [];
  let contradictions: string[] = [];
  let unknowns: string[] = [];

  if (target.kind === "hero") {
    title = "Why this hero truth?";
    subtitle = state ? `Quality state ${state.qualityState}. ${state.coverage.length} coverage channel(s).` : "No canonical snapshot yet.";
    value = state?.qualityState ?? null;
    unknowns = state ? [...state.unknowns] : [];
    contradictions = state ? [...state.contradictions] : [];
  } else if (target.kind === "dlar") {
    title = `Why ${target.dim.toUpperCase()}?`;
    if (target.dim === "response") {
      subtitle = dlar?.response.reason ?? "Response verdict unresolved.";
      value = dlar?.response.verdict ?? null;
      resolution = dlar?.response.resolution ?? null;
      evidence = (dlar?.response.evidence ?? []) as unknown as typeof evidence;
      contradictions = [...(dlar?.response.contradictions ?? [])];
    } else {
      const d = pickDim(state, target.dim);
      const e = dimEvidence(d);
      value = e.value;
      resolution = e.resolution;
      confidence = e.confidence;
      evidence = [...(e.evidence as unknown as typeof evidence)];
      contradictions = [...e.contradictions];
      unknowns = [...e.unknowns];
      subtitle = value ? `${target.dim} = ${value} (${resolution?.toLowerCase()})` : `${target.dim} unresolved`;
    }
  } else if (target.kind === "clc") {
    title = `Why ${target.leg.toUpperCase()}?`;
    const leg = clc?.[target.leg] ?? null;
    value = leg?.verdict ?? null;
    subtitle = leg?.summary ?? "Not evaluated.";
    evidence = (leg?.evidence ?? []) as unknown as typeof evidence;
    contradictions = [...(leg?.contradictions ?? [])];
    unknowns = [...(leg?.unknowns ?? [])];
  } else if (target.kind === "story") {
    title = "Why this chapter?";
    subtitle = target.chapter
      ? `Current chapter: ${target.chapter}`
      : "No chapter currently supported — state.dimensions unresolved.";
    unknowns = state ? [...state.unknowns] : [];
    contradictions = state ? [...state.contradictions] : [];
  }

  return (
    <section
      role="dialog"
      aria-label={title}
      className={["wm-why-inspector", className ?? ""].join(" ")}
      style={{
        border: "1px solid #d4af3760",
        borderRadius: 12,
        background: "linear-gradient(180deg, rgba(212,175,55,0.06), rgba(11,11,13,0.95))",
        padding: 18,
        boxShadow: "0 0 60px -30px #d4af37",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>
            Evidence
          </div>
          <div style={{ fontSize: 16, color: "#ede6d3", fontWeight: 600, marginTop: 4 }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: "#8a8271", marginTop: 4, lineHeight: 1.5 }}>
            {subtitle}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close evidence"
            style={{
              background: "transparent",
              border: "none",
              color: "#55503f",
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
              padding: 4,
              minWidth: 32,
              minHeight: 32,
            }}
          >
            ×
          </button>
        )}
      </div>

      {(value || resolution || confidence != null) && (
        <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          {value && (
            <Stat label="Value" value={value} />
          )}
          {resolution && (
            <Stat label="Resolution" value={resolution.toLowerCase()} />
          )}
          {confidence != null && (
            <Stat label="Confidence" value={confidence.toFixed(2)} />
          )}
        </div>
      )}

      {evidence.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 700 }}>
              Observed evidence ({evidence.length})
            </div>
            {state && (
              <div style={{ fontSize: 9, color: "#55503f", letterSpacing: 0.3 }}>
                as of {new Date(state.capturedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
            )}
          </div>
          {(() => {
            const bySource = new Map<string, typeof evidence>();
            evidence.forEach((e) => {
              const src = e.source || "unknown source";
              const bucket = bySource.get(src) ?? [];
              bucket.push(e);
              bySource.set(src, bucket);
            });
            const fmtAge = (ms: number): string => {
              if (!Number.isFinite(ms) || ms < 0) return "—";
              if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
              if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
              if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h ago`;
              return `${(ms / 86_400_000).toFixed(1)}d ago`;
            };
            const groups = Array.from(bySource.entries()).map(([src, items]) => {
              const latest = items.reduce((max, it) => (it.observedAt > max ? it.observedAt : max), 0);
              return { src, items, latest };
            }).sort((a, b) => b.latest - a.latest);
            const now = state?.capturedAt ?? Date.now();
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groups.map((g) => (
                  <div key={g.src} style={{ padding: "6px 10px", background: "rgba(19,19,23,0.5)", borderRadius: 4, borderLeft: "2px solid #c9a55c40" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: "#c9a55c", fontWeight: 700, letterSpacing: 0.3 }}>{g.src}</span>
                      <span style={{ fontSize: 9, color: "#55503f", letterSpacing: 0.3 }}>{g.items.length} obs · latest {fmtAge(now - g.latest)}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {g.items.slice(0, 4).map((e, i) => (
                        <div key={`${e.eventId}-${i}`} style={{ fontSize: 11, color: "#c0b8a0", lineHeight: 1.5, display: "flex", gap: 6, alignItems: "baseline" }}>
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.basis || "evidence"}</span>
                          <span style={{ fontSize: 9, color: e.fidelity === "direct" ? "#7fbf7f" : e.fidelity === "derived" ? "#c9a55c" : "#8a8271", letterSpacing: 0.2 }}>{e.fidelity}</span>
                          <span style={{ fontSize: 9, color: "#55503f", minWidth: 60, textAlign: "right" }}>{fmtAge(now - e.observedAt)}</span>
                        </div>
                      ))}
                      {g.items.length > 4 && (
                        <div style={{ fontSize: 9, color: "#55503f", fontStyle: "italic" }}>
                          +{g.items.length - 4} more from {g.src}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "#8a8271", fontWeight: 700, marginBottom: 6 }}>
            No observed evidence
          </div>
          <div style={{ fontSize: 11, color: "#8a8271", fontStyle: "italic", lineHeight: 1.5, padding: "6px 10px", background: "rgba(19,19,23,0.3)", borderRadius: 4 }}>
            {state && state.coverage.length === 0
              ? "No coverage channels have been established yet for this symbol. WM has not yet observed data."
              : state && state.coverage.length > 0
                ? `WM has ${state.coverage.length} coverage channel(s) but none have posted evidence for this dimension. This is honest UNKNOWN, not silence.`
                : "No canonical market snapshot yet — evidence cannot be attributed."}
          </div>
        </div>
      )}

      {contradictions.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "#c05a4a", fontWeight: 700, marginBottom: 6 }}>
            Contradictions ({contradictions.length})
          </div>
          {contradictions.slice(0, 5).map((c, i) => (
            <div key={i} style={{ fontSize: 11, color: "#c0b8a0", lineHeight: 1.5, padding: "4px 10px", borderLeft: "2px solid #c05a4a30" }}>
              {c}
            </div>
          ))}
        </div>
      )}

      {unknowns.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 700, marginBottom: 6 }}>
            Unknowns ({unknowns.length}) — why unknown
          </div>
          {unknowns.slice(0, 5).map((u, i) => (
            <div key={i} style={{ fontSize: 11, color: "#c0b8a0", lineHeight: 1.5, padding: "4px 10px", borderLeft: "2px solid #c9a55c30" }}>
              {u}
            </div>
          ))}
        </div>
      )}

      {/* Coverage explanation — makes UNKNOWN inspectable. Founder Aug-14 §9:
          "Can UNKNOWN explain WHY it is unknown?" A trader clicking Why? and
          seeing an unresolved dimension deserves to know which channels are
          silent, stale, or gapped. */}
      {state && state.coverage.length > 0 && (unknowns.length > 0 || evidence.length === 0) && (
        <div style={{ paddingTop: 10, borderTop: "1px solid rgba(139,106,41,0.15)" }}>
          <div style={{ fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "#8a8271", fontWeight: 700, marginBottom: 6 }}>
            Coverage
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {state.coverage.slice(0, 6).map((c) => {
              const ageMs = c.lastEventAt ? state.capturedAt - c.lastEventAt : null;
              const stale = ageMs != null && ageMs > 60_000;
              const silent = c.observedEventCount === 0;
              const gapped = (c.gapCount ?? 0) > 0;
              return (
                <div key={`${c.channel}-${c.providerPath}`} style={{ fontSize: 10, color: "#c0b8a0", lineHeight: 1.5, display: "flex", gap: 6, alignItems: "baseline" }}>
                  <span style={{ color: silent ? "#8a8271" : "#c9a55c", minWidth: 90 }}>{c.channel}</span>
                  <span style={{ flex: 1, color: "#8a8271", fontSize: 9 }}>
                    {silent ? "silent" : stale ? `stale (${Math.round((ageMs ?? 0) / 1000)}s)` : "live"}
                    {gapped ? ` · ${c.gapCount} gap${c.gapCount === 1 ? "" : "s"}` : ""}
                  </span>
                  <span style={{ fontSize: 9, color: "#55503f" }}>{c.observedEventCount} obs</span>
                </div>
              );
            })}
            {state.coverage.length > 6 && (
              <div style={{ fontSize: 9, color: "#55503f", fontStyle: "italic" }}>
                +{state.coverage.length - 6} more channels
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "6px 10px", borderRadius: 4, background: "rgba(19,19,23,0.5)" }}>
      <div style={{ fontSize: 8, letterSpacing: 0.4, textTransform: "uppercase", color: "#55503f", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#ede6d3", marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

export default WhyInspector;
