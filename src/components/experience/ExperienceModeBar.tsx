"use client";
import * as React from "react";
import { WM } from "@/lib/design/wmTokens";
import {
  EXPERIENCE_MODES,
  type ExperienceMode,
  type DecisionContextBus,
} from "@/lib/experience/decisionContextBus";
import { useDecisionContext } from "@/lib/experience/useDecisionContext";
import { shellEmphasis } from "@/lib/experience/shellLayout";

/**
 * ExperienceModeBar — the seven human operating states (Founder Phase 1):
 *   PREP · OBSERVE · WAIT · EXECUTE · MANAGE · REVIEW · LEARN
 *
 * The SAME market truth reorganizes around whichever mode is active; this bar
 * makes the current job explicit and lets the human switch it (user intent
 * commits immediately, bypassing hysteresis). The active mode is marked with
 * gold — mode is part of WM IDENTITY/orientation, not a market verdict.
 *
 * Reads/writes the shared DecisionContextBus so every surface agrees on the
 * current job.
 */
export interface ExperienceModeBarProps {
  bus?: DecisionContextBus;
  className?: string;
  /**
   * Render the seven states as ONE named chip instead of seven equal tabs.
   *
   * ── The measured failure this answers ──────────────────────────────────────
   *
   * Measured on the live production build at 1920x840 on 2026-09-17: this bar
   * occupied the entire centre of the masthead on every route at every moment,
   * seven buttons of equal weight, each 44px tall. On the instrument view that
   * is the widest non-price object above the candles.
   *
   * It is also the wrong SENTENCE. The bar's job is to answer "what is the
   * current job?" — and seven equal tabs answer it seven times, once loudly and
   * six times quietly. One chip that says OBSERVE answers it once.
   *
   * ── COLLAPSED IS NOT HIDDEN ────────────────────────────────────────────────
   *
   * A hamburger that hides the answer would be strictly worse than the bar: the
   * human would have to OPEN something to learn what mode they are in. So the
   * collapsed form still NAMES the active mode in its own label, and the other
   * six are one announced click away through aria-expanded/aria-controls.
   *
   * Default `false` — every route that never asked keeps the bar it had.
   */
  collapsed?: boolean;
}

/** The id the collapsed chip points `aria-controls` at. */
export const EXPERIENCE_MODE_GROUP_ID = "wm-experience-modes";

/**
 * THE SECOND COPY OF THE CAPTION TABLE — AND IT HAD ALREADY DRIFTED.
 *
 * `shellLayout` owns one caption per mode and paints it in the masthead of
 * every route. This file kept its own table for the button tooltips, and two
 * copies of one rule agree exactly until one is edited. Both were:
 *
 *     WAIT    shell "Hold the thesis; wait for permission."
 *             here  "Have a thesis; wait for permission"
 *     MANAGE  shell "Steward the open position."
 *             here  "Steward an open position"
 *
 * Not catastrophic on their own — and precisely why they survived. A trader
 * hovering WAIT was told to HAVE a thesis while the masthead told them to HOLD
 * one, which are different instructions about the same job.
 *
 * It also meant the exposure-claim repair in `shellLayout`'s OBSERVE entry
 * would have healed the masthead and left this tooltip still asserting a
 * flatness WM cannot observe. Deleting the table is what makes that repair
 * reach every surface that speaks the caption, now and later.
 *
 * The tooltip drops the trailing period the masthead sentence carries — a
 * title attribute is a label, not a sentence — which is presentation, not a
 * second opinion about what the job IS.
 */
function modeHint(mode: ExperienceMode): string {
  return shellEmphasis(mode).job.replace(/\.$/, "");
}

export function ExperienceModeBar({ bus, className, collapsed = false }: ExperienceModeBarProps) {
  const { context, setMode } = useDecisionContext(bus);
  const [open, setOpen] = React.useState(false);
  const chipRef = React.useRef<HTMLButtonElement | null>(null);

  // Re-seed when the route changes what the bar is FOR. Without this, expanding
  // the chip on the chart and then walking to a room that renders the full bar
  // would leave a stale `open` behind the next collapse.
  const seeded = React.useRef(collapsed);
  if (seeded.current !== collapsed) {
    seeded.current = collapsed;
    setOpen(false);
  }

  /**
   * ESCAPE IS THE THIRD WAY OUT, AND IT WAS THE ONE THAT WAS MISSING.
   *
   * MEASURED 2026-09-19 on live /charts at 1920 wide. Opening the chip gave
   * `aria-expanded="true"` and a seven-button panel hung over the candles;
   * pressing Escape left it reading `"true"` with the panel still up.
   *
   * The choose-handler below already states the law — "Leaving it open would
   * put a 7-button panel back over the candles" — and enforces it for exactly
   * one of the three ways a human leaves a disclosure. The other two were
   * unhandled, so the law held only for the person who picked something. A
   * trader who opened the panel to LOOK, decided against switching, and pressed
   * the key every disclosure on earth answers to, kept the panel.
   *
   * That is the same shape as the defect this file already records at the
   * minHeight note: a comment asserting a care the code never delivered.
   *
   * Focus goes back to the chip deliberately. Escape that closes the panel and
   * drops focus wherever the panel used to be strands a keyboard user in the
   * document with no announced position — dismissing the trap by opening a
   * quieter one. The chip is where they were standing before they opened it.
   *
   * Listener only exists while the panel is actually up: a document-level
   * keydown bound for the life of the masthead would run on every keystroke the
   * trader types into the symbol search.
   */
  React.useEffect(() => {
    if (!collapsed || !open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      chipRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [collapsed, open]);

  const expanded = !collapsed || open;

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}
    >
      {!collapsed ? null : (
        <button
          type="button"
          ref={chipRef}
          data-testid="experience-mode-chip"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          // The chip is only ever rendered when `collapsed`, and in that mode
          // the seven-button nav below is rendered only when `open`. So an
          // unconditional `aria-controls` named a node that does not exist for
          // the whole time the panel is shut — which is the whole time before
          // anyone presses this. Same defect, same day, as the pair in
          // WMOperatingSystem: a reference that dangles is followed, not
          // ignored, and lands the human nowhere.
          aria-controls={open ? EXPERIENCE_MODE_GROUP_ID : undefined}
          // The active mode is IN the name on purpose. A control called only
          // "Experience mode" would make a screen-reader user open the group to
          // learn something the sighted chip states outright.
          aria-label={`Experience mode: ${context.mode}. Choose another`}
          title={modeHint(context.mode)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minHeight: 32,
            padding: "5px 10px",
            borderRadius: WM.radius.md,
            border: `1px solid ${WM.border.strong}`,
            background: WM.halo.gold,
            color: WM.gold.hero,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {context.mode}
          <span aria-hidden style={{ fontSize: 9, opacity: 0.7 }}>{open ? "▴" : "▾"}</span>
        </button>
      )}
      {!expanded ? null : (
    <nav
      className={className}
      id={EXPERIENCE_MODE_GROUP_ID}
      aria-label="Experience mode"
      style={{
        display: "flex",
        alignItems: "center",
        // Wrap gracefully on narrow (mobile) widths: the seven states must stay
        // fully visible — never overflow their container and collide with the
        // adjacent job descriptor. On desktop everything fits on one row, so
        // wrap never triggers and the layout is unchanged.
        flexWrap: "wrap",
        gap: 2,
        background: WM.surface.deep,
        border: `1px solid ${WM.border.hair}`,
        borderRadius: WM.radius.lg,
        padding: 3,
        // Collapsed, the seven live in a panel hung UNDER the chip rather than
        // in the masthead row. Applied last so it wins over the base row above.
        ...(collapsed
          ? {
              position: "absolute" as const,
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 40,
              flexWrap: "nowrap" as const,
              background: WM.surface.raised,
              border: `1px solid ${WM.border.strong}`,
              boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
            }
          : null),
      }}
    >
      {EXPERIENCE_MODES.map((mode) => {
        const active = mode === context.mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setMode(mode);
              // Choosing is the whole reason the panel opened. Leaving it open
              // would put a 7-button panel back over the candles.
              setOpen(false);
              // AND THE HAND THAT CHOSE HAS TO LAND SOMEWHERE.
              //
              // MEASURED 2026-09-19 on live /charts at 1920: focus this button,
              // press it, and `document.activeElement` is `BODY`. The line above
              // unmounts the panel this button lives in, so the keyboard user who
              // just made a choice is dropped into the document with no announced
              // position — they have to Tab from the top of the page to get back
              // to where they were standing.
              //
              // That is the identical stranding the Escape handler at the head of
              // this component was written to prevent, and whose law it states in
              // its own words: dismissing a trap by opening a quieter one. The
              // handler covered the person who CHANGED THEIR MIND and left the
              // person who DECIDED stranded — so the law held for the two ways out
              // that were noticed and not for the one the control exists for.
              //
              // The chip is where they were standing before they opened it, and
              // its accessible name carries the mode they just chose, so landing
              // there also announces the outcome. `?.` is the whole guard: the ref
              // is only ever populated in `collapsed`, which is the only mode in
              // which anything is unmounted here.
              chipRef.current?.focus();
            }}
            // A MODE IS NOT A TOGGLE, AND `aria-pressed` SAYS IT IS.
            //
            // MEASURED 2026-09-19 on live /charts at 1920: OBSERVE reported
            // `aria-pressed="true"`; pressing it again left it `"true"`. The
            // control described itself as pressed and could not be un-pressed.
            //
            // This repo has already ruled on that exact shape, in
            // `roomAdoptsEquipment.sentinel.test.ts` — "a control rendering
            // `aria-pressed` promises a reversal; re-requesting is not one" — and
            // there the honest repair was to BUILD the reversal, because a piece
            // of equipment can genuinely be put down. A mode cannot. There are
            // always exactly seven and exactly one is current; un-choosing OBSERVE
            // is not a state this application has. So the attribute is not
            // under-implemented here, it is the wrong attribute: no amount of
            // handler work can make a single-select set reversible.
            //
            // `aria-current` is the sentence that is actually true — "the current
            // item within a set of related items" — and it promises nothing this
            // control cannot do. The other six now carry NOTHING rather than
            // `aria-pressed="false"`, which is the correct default and also the
            // shape this file's own header argues for: seven equal tabs "answer it
            // seven times, once loudly and six times quietly."
            //
            // Note what is NOT done here: `aria-pressed` is not merely DELETED.
            // The rail comment in `WMOperatingSystem` names that as the cheap
            // direction — it would trade a screen reader's only source of "which
            // job am I on" for the silence that makes the defect invisible. The
            // claim is replaced, not dropped.
            //
            // Nor is this promoted to `role="radiogroup"`/`aria-checked`, which is
            // the other correct widget for single-select: that role carries a
            // keyboard contract (roving tabindex, arrow-key selection, Home/End)
            // and claiming it without building it would swap a control that lies
            // about reversal for one that lies about navigation — the quieter and
            // therefore more expensive kind. It would also cost the `<nav>`
            // landmark below, which a Founder audit names by role.
            aria-current={active ? "true" : undefined}
            title={modeHint(mode)}
            style={{
              flex: "1 1 auto",
              // Keep each tap target readable when the bar wraps on mobile;
              // ignored on desktop where flex-grow spreads them across one row.
              minWidth: 52,
              // MEASURED 2026-09-13 at 390x844 by scripts/audit-phone-parity.mjs:
              // all seven buttons rendered 23px tall. minWidth alone had been
              // standing in for "tap target" since this bar was written, and the
              // comment above it asserted a care the code never delivered — a
              // comment is not a gate. This bar IS the navigation of the new
              // room, so on a phone it is the first thing a thumb reaches.
              // 44px is the binding floor.
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              padding: "5px 8px",
              borderRadius: WM.radius.md,
              border: `1px solid ${active ? WM.border.strong : "transparent"}`,
              color: active ? WM.gold.hero : WM.text.muted,
              background: active ? WM.halo.gold : "transparent",
              cursor: "pointer",
              transition: "color 120ms, background 120ms, border-color 120ms",
              whiteSpace: "nowrap",
            }}
          >
            {mode}
          </button>
        );
      })}
    </nav>
      )}
    </div>
  );
}

export default ExperienceModeBar;
