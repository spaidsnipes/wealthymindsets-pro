"use client";

/**
 * HumilityPanel — the first renderer `HUMILITY_PANEL` has ever had.
 *
 * `compileScene` admits this element in all ten scenes and a law in
 * `compileScene.test.ts` forbids any scene from withholding it. Until this
 * file, nothing in the repo painted it. The OS guaranteed the trader a
 * disclosure that no screen delivered.
 *
 * ── Why it is not a card ─────────────────────────────────────────────────────
 *
 * The Founder audit (2026-09-13) named SCENE_FRAGMENTATION: a bordered, tinted
 * box reads as an "app alert" and walls itself off from the room.
 * `SceneAdmissionPanel` was repaired by replacing its box with a left-edge
 * accent, and this follows that cure rather than re-opening it.
 *
 * The accent is `WM.text.muted`, NOT gold and NOT warn-red. §9: "GOLD is
 * identity metal only" — gold here would read as importance-by-metal and put a
 * list of blind spots on the same footing as a confirmed fact. Red would make
 * a permanent structural limit look like an incident every time the screen
 * loaded, which is how a real alarm gets trained away.
 *
 * ── Why nothing here is `WM.text.dim` ────────────────────────────────────────
 *
 * Every line in this panel states an ABSENCE, and this shift measured what the
 * product had been doing with those: `dim` fails AA on all five surfaces
 * (2.53:1 at best). `muted` is the documented floor for absence prose — see
 * TEXT_ON_SURFACE in wmTokens.ts. A panel whose entire subject is "what we do
 * not know", rendered unreadably, would be the §14.1 failure at full strength.
 *
 * ── Why it is not admission-gated ────────────────────────────────────────────
 *
 * Callers render this unconditionally and do NOT list HUMILITY_PANEL in their
 * `governed` array. Admission cannot withhold an element that every scene
 * admits, so wrapping it in `<SceneAdmits>` would raise the §10 governed count
 * without the OS gaining any power over the screen — the exact overclaim
 * SceneAdmissionPanel's docstring was written to kill.
 *
 * Presentation only. Decides no facts; every sentence comes from
 * `selectHumility`.
 */

import React from "react";

import type { HumilityItem } from "@/lib/experience/selectHumility";
import { selectHumilityStrip } from "@/lib/experience/selectHumilityStrip";
import { WM } from "@/lib/design/wmTokens";

export interface HumilityPanelProps {
  readonly items: readonly HumilityItem[];
  /**
   * §18 "the screen gets quiet" — DONE and the other quiet scenes still admit
   * this panel, they just do not let it take the room. Quiet is a VOLUME, not
   * an omission, so the compact form shrinks the panel and never empties it.
   */
  readonly compact?: boolean;
}

export function HumilityPanel({ items, compact = false }: HumilityPanelProps): React.ReactElement | null {
  // `selectHumility` cannot return an empty list, but this component may also
  // be handed one by a future caller. Rendering nothing is the correct response
  // to being given nothing — silently printing a reassuring heading over an
  // empty list is the failure mode. The selector's own law is the real guard.
  if (items.length === 0) return null;

  /**
   * "9 · 3 structural" and "9 · 8 structural" are four characters apart and
   * describe very different products. The strip ranks them before either
   * number is read. Compiled, never counted here — same three facts, no
   * second arithmetic.
   */
  const strip = selectHumilityStrip(items);
  const structural = strip ? strip.structural : 0;

  return (
    <section
      aria-label="What we do not know"
      style={{
        borderLeft: `3px solid ${WM.text.muted}`,
        background: "transparent",
        padding: compact ? "6px 12px 6px 14px" : "10px 14px 10px 18px",
      }}
    >
      <div
        style={{
          ...WM.type.label,
          color: WM.text.muted,
          marginBottom: compact ? 4 : 7,
        }}
      >
        What we do not know · {items.length}
        {/* The structural count is the number that should not comfort anyone.
            Observational gaps close as sources connect; these do not close
            until someone ships something, so they are counted separately
            rather than averaged into a single reassuring total. */}
        {structural > 0 && (
          <span style={{ color: WM.text.muted, opacity: 0.75 }}>
            {" "}· {structural} structural
          </span>
        )}
      </div>

      {/* ONE MARK PER GAP, PERMANENT ONES FIRST.
          §9 requires the difference between a gap that may close and one that
          will not to survive on a greyscale screen and for a colour-blind
          reader, so the two are distinguished by FILL — solid for structural,
          hollow for a gap a connecting source can close — and by nothing else.
          Both marks keep their width: a strip that shrank as gaps closed would
          let the denominator quietly shrink with it, and the point of this
          panel is that the gaps in hand are the gaps in hand. */}
      {strip && (
        <div
          data-testid="humility-strip"
          data-total={strip.total}
          data-structural={strip.structural}
          aria-hidden="true"
          style={{ display: "flex", gap: 3, marginBottom: compact ? 5 : 8 }}
        >
          {strip.marks.map(mark => (
            <span
              key={mark.id}
              data-testid="humility-mark"
              data-permanent={mark.permanent ? "true" : "false"}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                height: 4,
                borderRadius: 1,
                background: mark.permanent ? WM.text.muted : "transparent",
                boxShadow: mark.permanent ? "none" : `inset 0 0 0 1px ${WM.text.muted}`,
              }}
            />
          ))}
        </div>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: compact ? 4 : 8 }}>
        {items.map(item => (
          <li key={item.id}>
            <div
              style={{
                ...WM.type.bodySm,
                color: WM.text.body,
                fontWeight: 600,
              }}
            >
              {item.title}
              {/* A non-colour cue, per §9 — the tone difference between a gap
                  that may close and one that will not must survive on a
                  greyscale screen and for a colour-blind reader. */}
              {item.kind === "STRUCTURAL" && (
                <span
                  style={{ ...WM.type.labelSmall, color: WM.text.muted, marginLeft: 6 }}
                  title="A limit of this build, not a source that has yet to answer."
                >
                  structural
                </span>
              )}
            </div>
            {!compact && (
              <p style={{ ...WM.type.bodySm, color: WM.text.muted, margin: "2px 0 0" }}>
                {item.detail}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default HumilityPanel;
