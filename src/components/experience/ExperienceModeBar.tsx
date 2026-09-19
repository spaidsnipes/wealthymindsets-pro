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
          aria-controls={EXPERIENCE_MODE_GROUP_ID}
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
            }}
            aria-pressed={active}
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
