"use client";

/**
 * ⓘ BEFORE ACTIVATION — Garden 19 §9 "Indicators get an information preview".
 *
 * Every tool row in the Tool Finder, its library, and every ProfilesMenu door
 * (Profiles, Order flow, Reading lenses, the W's Structure and Memory wings)
 * carries an ⓘ. It opens a preview that answers, in trader words:
 * WHAT IT IS · WHAT QUESTION IT ANSWERS · WHAT EVIDENCE IT NEEDS · HOW IT
 * APPEARS ON THE CHART · HOW TO READ IT · WHAT FULL / PARTIAL / DEGRADED MEAN
 * — then what is true on THIS symbol now, and an ADD TO CHART button.
 *
 * Content comes from ONE owner (`inventionEducation`); "what it is" is the
 * catalogue's own sentence; "on this chart now" is the menu compiler's verdict.
 * This file only lays it out.
 *
 * WHERE IT OPENS: inline, directly under the row it explains (an anchored
 * panel inside the drawer, which sits beside the market — never over the
 * newest candles). On a phone (< 640 px) the same panel becomes a bottom
 * sheet. It does NOT portal to <body>: the Tools drawer is aria-modal with a
 * Tab trap, and a portalled panel would be reachable by mouse and not by
 * keyboard (the defect ProfilesMenu's header names).
 *
 * Keyboard: the ⓘ is a real button (Enter/Space); focus moves into the panel;
 * Escape closes the panel only (the drawer stays open) and focus returns to ⓘ.
 */

import React, { useEffect, useRef } from "react";
import { educationFor, type EducationTruth } from "@/lib/chart/inventionEducation";

const GOLD = "#d4af37";
const PEARL = "#E8EAF2";
const MUTED = "#8B8FA8";
const AMBER = "#F0B429";
const GREEN = "#4ADE80";

/** The DOM id of a row's ⓘ — focus returns here when the preview closes. */
export function infoButtonId(scope: string, id: string): string {
  return `wm-edu-${scope}-${id}`.replace(/[^A-Za-z0-9_-]/g, "_");
}

export function InventionInfoButton({ scope, id, label, open, onToggle, compact = false }: {
  scope: string;
  id: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  /** Library chips: the glyph stays small; touch screens get the 44 px slop. */
  compact?: boolean;
}) {
  if (!educationFor(id)) return null;
  return (
    <button
      type="button"
      id={infoButtonId(scope, id)}
      data-testid={`edu-info-${id}`}
      aria-label={`About ${label}`}
      aria-expanded={open}
      aria-haspopup="dialog"
      title={`What ${label} is and how to read it`}
      onClick={e => { e.stopPropagation(); onToggle(); }}
      className={compact
        ? "wm-tap-slop inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"
        : "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
    >
      <span aria-hidden className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[11px] font-bold italic"
        style={{ border: `1px solid ${open ? GOLD : "rgba(212,175,55,0.55)"}`, color: GOLD, background: open ? "rgba(212,175,55,0.16)" : "transparent", fontFamily: "Georgia, serif" }}>
        i
      </span>
    </button>
  );
}

const VERDICT_COLOR: Record<EducationTruth["verdict"], string> = {
  "CAN DRAW HERE": GREEN,
  WAITING: MUTED,
  "UNAVAILABLE HERE": AMBER,
  "STATE NOT REPORTED": MUTED,
};

export function InventionPreview({ scope, id, label, what, familyWord, symbol, truth, active, gestureNote, onAdd, onClose }: {
  scope: string;
  id: string;
  label: string;
  /** The catalogue's own one-line "what it is" — quoted, never re-authored. */
  what: string;
  familyWord?: string;
  symbol?: string;
  truth: EducationTruth;
  active: boolean;
  /** "drag a box on the chart to choose the range" — the DRAW gesture's own words. */
  gestureNote?: string;
  onAdd: () => void;
  onClose: () => void;
}) {
  const edu = educationFor(id);
  const ref = useRef<HTMLDivElement>(null);
  // Focus moves into the panel when it opens, so a keyboard user lands on it.
  useEffect(() => { ref.current?.focus({ preventScroll: false }); }, [id]);
  if (!edu) return null;
  const close = () => {
    onClose();
    // Focus returns to the ⓘ that opened it.
    if (typeof document !== "undefined") {
      const btn = document.getElementById(infoButtonId(scope, id));
      setTimeout(() => btn?.focus({ preventScroll: true }), 0);
    }
  };
  const headId = `${infoButtonId(scope, id)}-title`;
  const row = (k: string, v: string, testId?: string) => (
    <div className="mt-2" data-testid={testId}>
      <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: MUTED }}>{k}</div>
      <div className="mt-0.5 text-[12px] leading-snug" style={{ color: PEARL }}>{v}</div>
    </div>
  );
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={headId}
      tabIndex={-1}
      data-testid={`edu-preview-${id}`}
      data-edu-verdict={truth.verdict}
      onKeyDown={e => {
        // Escape closes THIS panel only — the drawer around it stays open.
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
      }}
      onClick={e => e.stopPropagation()}
      className={[
        "wm-edu-preview col-span-full my-1 rounded-lg p-3 text-left shadow-2xl outline-none",
        // Phone: a bottom sheet over the drawer's own lower edge.
        "max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-[260] max-sm:my-0 max-sm:max-h-[78vh] max-sm:overflow-y-auto max-sm:rounded-b-none max-sm:pb-[calc(12px+env(safe-area-inset-bottom))]",
      ].join(" ")}
      style={{ background: "linear-gradient(180deg, #17181f 0%, #121318 100%)", border: "1px solid rgba(212,175,55,0.38)" }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {familyWord ? (
            <div className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: MUTED }}>{familyWord}</div>
          ) : null}
          <div id={headId} className="text-[14px] font-bold leading-tight" style={{ color: GOLD }}>{label}</div>
        </div>
        <button type="button" onClick={close} aria-label={`Close about ${label}`} data-testid="edu-preview-close"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[18px] leading-none hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"
          style={{ color: MUTED, background: "none", border: "none", cursor: "pointer", marginTop: -8, marginRight: -8 }}>
          ×
        </button>
      </div>

      <div className="mt-2 rounded-md px-2 py-1.5" data-testid="edu-truth"
        style={{ background: "rgba(255,255,255,0.03)", borderLeft: `2px solid ${VERDICT_COLOR[truth.verdict]}` }}>
        <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: VERDICT_COLOR[truth.verdict] }}>
          {symbol ? `On ${symbol} now · ` : "On this chart now · "}{truth.verdict}
        </div>
        {truth.lines.map((l, i) => (
          <div key={i} className="mt-0.5 text-[11.5px] leading-snug" style={{ color: PEARL }}>{l}</div>
        ))}
      </div>

      {row("What it is", what.charAt(0).toUpperCase() + what.slice(1) + (/[.!?]$/.test(what) ? "" : "."), "edu-what")}
      {row("The question it answers", edu.question, "edu-question")}
      {row("What it needs", edu.evidence, "edu-evidence")}
      {row("On the chart", edu.appears, "edu-appears")}
      {row("How to read it", edu.grammar, "edu-grammar")}

      <div className="mt-2" data-testid="edu-ladder">
        <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: MUTED }}>Evidence quality</div>
        {([["FULL", edu.full, GREEN], ["PARTIAL", edu.partial, GOLD], ["DEGRADED", edu.degraded, AMBER]] as const).map(([k, v, c]) => (
          <div key={k} className="mt-1 flex gap-2 text-[11.5px] leading-snug">
            <span className="w-[62px] shrink-0 text-[9px] font-bold uppercase tracking-[0.12em] pt-[2px]" style={{ color: c }}>{k}</span>
            <span style={{ color: PEARL }}>{v}</span>
          </div>
        ))}
      </div>

      {/* A taught concept carries its Academy lesson (CONCEPT_EDUCATION, e.g. FVG → fvg-1). */}
      {"academy" in edu && (edu as { academy?: { href: string; title: string } }).academy ? (
        <a href={(edu as { academy: { href: string } }).academy.href} data-testid="edu-academy"
          className="mt-2 inline-block text-[11.5px] font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"
          style={{ color: GOLD }}>
          Academy · {(edu as { academy: { title: string } }).academy.title} ›
        </a>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <button type="button" data-testid="edu-add" aria-pressed={active}
          onClick={() => { onAdd(); close(); }}
          className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-lg px-4 text-[12px] font-bold uppercase tracking-[0.12em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
          style={active
            ? { background: "transparent", color: GOLD, border: `1px solid ${GOLD}`, cursor: "pointer" }
            : { background: GOLD, color: "#14110a", border: `1px solid ${GOLD}`, cursor: "pointer" }}>
          {active ? "On the chart · turn off" : "Add to chart"}
        </button>
        {!active && gestureNote ? (
          <span className="text-[10.5px] leading-snug" style={{ color: MUTED }}>Then {gestureNote}.</span>
        ) : null}
      </div>
    </div>
  );
}
