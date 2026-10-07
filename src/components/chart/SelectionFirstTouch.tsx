"use client";

/**
 * FIRST TOUCH — Garden 19 §10 "Active object education".
 *
 * Selecting a WM Pro mark on the market (a shelf, a wall, a ghost, a print,
 * a profile row, a swing) puts ONE plain sentence beside the market saying
 * what the trader just touched — from the same record as that tool's ⓘ
 * preview (`inventionEducation`). "How to read it" opens on request; the
 * evidence itself stays in Inspect, which this card can open.
 *
 * Placement: the bottom-left of the chart pane — the OLDEST bars' corner,
 * never over the newest candles or the price axis, and clear of Inspect's
 * right wall. "Got it" retires the card for that tool in this browser (a
 * per-viewer convenience; a proof scene never writes it).
 *
 * PHONE (< 640 px): the card is one line and two small buttons (Inspect ›,
 * Got it) — "How to read it" is Inspect's job there. While Inspect is open on
 * a phone the card does not stand beside it: the same line rides inside
 * Inspect's header (`InspectFirstTouchLine`, fed by `InspectFirstTouchContext`).
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { educationFor, firstTouchFor, type EducationKey } from "@/lib/chart/inventionEducation";
import { proofSceneHoldsWrites } from "@/lib/chart/proofScene";

const GOLD = "#d4af37";
const PEARL = "#E8EAF2";
const MUTED = "#8B8FA8";

const learnedKey = (id: string) => `wm:edu:firstTouch:${id}`;

function readLearned(id: string): boolean {
  if (proofSceneHoldsWrites()) return false;
  try { return localStorage.getItem(learnedKey(id)) === "1"; } catch { return false; }
}

/** The selected mark's education id + menu label, for Inspect's header on a phone. */
export const InspectFirstTouchContext = createContext<{ id: EducationKey; label: string; objectId?: string | null } | null>(null);

/**
 * Inside Inspect's header, phone only: "Brick Walls — Brick wall — a strike…".
 * Desktop and tablet keep the separate card beside the market, so this renders
 * nothing there (CSS-hidden; the DOM stays one owner's words).
 */
export function InspectFirstTouchLine() {
  const ctx = useContext(InspectFirstTouchContext);
  const edu = ctx ? educationFor(ctx.id) : null;
  if (!ctx || !edu) return null;
  return (
    <div data-testid="inspect-first-touch" data-first-touch-id={ctx.id}
      className="hidden max-sm:block mt-1 text-[11px] leading-snug" style={{ color: PEARL }}>
      <span className="font-bold" style={{ color: GOLD }}>{ctx.label}</span>
      <span style={{ color: MUTED }}> · </span>{firstTouchFor(ctx.id, ctx.objectId)}
    </div>
  );
}

export function SelectionFirstTouch({ id, label, objectId, inspectOpen, onOpenInspect }: {
  id: EducationKey | null;
  /** The selected market object's id, when the selection is one (zone vs swing wording). */
  objectId?: string | null;
  /** The tool's name as its menu prints it. */
  label: string;
  inspectOpen: boolean;
  onOpenInspect: () => void;
}) {
  const [learned, setLearned] = useState(false);
  const [more, setMore] = useState(false);
  useEffect(() => { setMore(false); setLearned(id ? readLearned(id) : false); }, [id]);
  const edu = id ? educationFor(id) : null;
  if (!id || !edu || learned) return null;
  return (
    <aside
      data-testid="selection-first-touch"
      data-first-touch-id={id}
      aria-live="polite"
      aria-label={`${label}: ${firstTouchFor(id, objectId)}`}
      data-inspect-open={inspectOpen ? "true" : "false"}
      className={`absolute bottom-14 left-2 z-[76] rounded-lg p-2.5 shadow-2xl max-sm:bottom-12 max-sm:p-2 ${inspectOpen ? "max-sm:hidden" : ""}`}
      style={{
        width: "min(320px, calc(100% - 120px))",
        background: "linear-gradient(180deg, rgba(23,24,31,0.97) 0%, rgba(18,19,24,0.97) 100%)",
        border: "1px solid rgba(212,175,55,0.38)",
      }}
    >
      <div className="text-[9px] font-bold uppercase tracking-[0.16em] max-sm:hidden" style={{ color: MUTED }}>You selected</div>
      <div className="text-[12.5px] font-bold leading-tight max-sm:hidden" style={{ color: GOLD }}>{label}</div>
      <div className="mt-1 text-[12px] leading-snug max-sm:mt-0 max-sm:text-[11.5px]" style={{ color: PEARL }} data-testid="first-touch-line">
        <span className="hidden max-sm:inline font-bold" style={{ color: GOLD }}>{label} · </span>{firstTouchFor(id, objectId)}
      </div>
      {more ? (
        <div className="mt-1.5 text-[11.5px] leading-snug max-sm:hidden" style={{ color: PEARL }} data-testid="first-touch-more">
          <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: MUTED }}>How to read it</div>
          {edu.grammar}
        </div>
      ) : null}
      <div className="mt-1.5 flex flex-wrap items-center gap-1 max-sm:mt-1 max-sm:flex-nowrap max-sm:gap-3">
        {!more ? (
          <button type="button" onClick={() => setMore(true)} data-testid="first-touch-read"
            className="max-sm:hidden wm-tap-slop inline-flex h-11 items-center rounded-md px-2 text-[11px] font-semibold max-sm:h-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"
            style={{ color: GOLD, background: "none", border: "1px solid rgba(212,175,55,0.35)", cursor: "pointer" }}>
            How to read it
          </button>
        ) : null}
        {!inspectOpen ? (
          <button type="button" onClick={onOpenInspect} data-testid="first-touch-inspect"
            className="wm-tap-slop inline-flex h-11 items-center rounded-md px-2 text-[11px] font-semibold max-sm:h-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"
            style={{ color: GOLD, background: "none", border: "1px solid rgba(212,175,55,0.35)", cursor: "pointer" }}>
            Inspect the evidence ›
          </button>
        ) : null}
        <button type="button" data-testid="first-touch-got-it"
          onClick={() => {
            setLearned(true);
            if (!proofSceneHoldsWrites()) { try { localStorage.setItem(learnedKey(id), "1"); } catch { /* storage refused */ } }
          }}
          className="wm-tap-slop ml-auto inline-flex h-11 items-center rounded-md px-2 text-[11px] max-sm:h-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"
          style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}>
          Got it
        </button>
      </div>
    </aside>
  );
}
