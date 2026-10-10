"use client";

/**
 * RoomStatePlaque — the house's one empty / reading / unavailable plaque
 * (house pass 2026-10-10).
 *
 * Measured across every room: there was no shared state family. Each room
 * hand-rolled its own empty line — a centred grey sentence under a 15%-opacity
 * icon (Backtest), a filter glyph over muted text (News), an inline-styled card
 * (Research Heat) — so the moments a trader meets most often between real
 * readings were the least finished pixels in the product.
 *
 * Three kinds, and only three:
 *   empty        nothing has been recorded or chosen yet. Not a failure.
 *   reading      a read is in flight. `role="status"` + `aria-busy`.
 *   unavailable  a source did not answer. The kicker is the canon failure word
 *                UNAVAILABLE (failureStateGrammar), never ERROR / OFFLINE.
 *
 * Each kind carries a WORD as well as a colour, so the state never rides on
 * hue alone. Colours come from the canonical owner only.
 */
import React from "react";
import { WM } from "@/lib/design/wmTokens";

export type RoomStateKind = "empty" | "reading" | "unavailable";

const KIND: Record<RoomStateKind, { word: string; rule: string }> = {
  empty:       { word: "NOTHING HERE YET", rule: WM.gold.line },
  reading:     { word: "READING",          rule: WM.gold.mark },
  unavailable: { word: "UNAVAILABLE",      rule: WM.state.warn },
};

export interface RoomStatePlaqueProps {
  readonly kind: RoomStateKind;
  readonly title: React.ReactNode;
  readonly children?: React.ReactNode;
  /** Optional glyph, drawn quietly beside the kicker. */
  readonly icon?: React.ReactNode;
  readonly testId?: string;
  /** "center" for a plaque standing alone in an empty pane. */
  readonly align?: "start" | "center";
  readonly className?: string;
}

export function RoomStatePlaque({ kind, title, children, icon, testId, align = "start", className }: RoomStatePlaqueProps): React.ReactElement {
  const k = KIND[kind];
  return (
    <section
      role={kind === "empty" ? undefined : "status"}
      aria-busy={kind === "reading" ? true : undefined}
      data-testid={testId}
      data-room-state={kind}
      className={className}
      style={{
        position: "relative",
        maxWidth: 520,
        width: "100%",
        margin: align === "center" ? "0 auto" : undefined,
        padding: "16px 18px 16px 20px",
        borderRadius: WM.radius.lg,
        background: WM.surface.mid,
        border: `1px solid ${WM.border.line}`,
        boxShadow: `inset 3px 0 0 ${k.rule}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: kind === "unavailable" ? WM.state.warn : WM.gold.mark }}>
        {icon ? <span aria-hidden="true" style={{ display: "inline-flex", opacity: 0.8 }}>{icon}</span> : null}
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" }}>{k.word}</span>
      </div>
      <div style={{ color: WM.text.hero, fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{title}</div>
      {children ? (
        <div style={{ marginTop: 4, color: WM.text.body, fontSize: 12.5, lineHeight: 1.55 }}>{children}</div>
      ) : null}
    </section>
  );
}

export default RoomStatePlaque;
