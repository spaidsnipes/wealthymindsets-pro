"use client";
import * as React from "react";
import { WM } from "@/lib/design/wmTokens";
import type { ExitRamp } from "@/lib/experience/composeExitRamp";

/**
 * ExitRampCard — the calm Completion Receipt surface.
 *
 * Canon: "ATH/WOW Cognitive Sovereignty Helicopter Audit" (2026-08-29),
 * §Exit Ramp / Completion Receipt: "When a useful stopping point is reached,
 * show a calm exit ramp rather than another dashboard."
 *
 * It is a PURE presentational reflection of a composed {@link ExitRamp}: it
 * renders the receipt (DONE / SAVED / OPEN / NEXT / RETURN / RECAP) and the
 * honest SAFE-TO-LEAVE verdict, and never re-derives the completion truth.
 *
 * §Silence Is A Feature: while there is live, active work (state === "ACTIVE"),
 * the exit ramp stays OUT OF THE WAY — it renders nothing rather than nag a
 * human who is stewarding an open position. The moment a stopping point is
 * genuinely reached, the ramp appears.
 */
export interface ExitRampCardProps {
  readonly ramp: ExitRamp;
  readonly className?: string;
  /** Embed the receipt in an existing NEXT region without creating a card
   * inside a card. The composed truth and all receipt sections are unchanged. */
  readonly presentation?: "card" | "embedded";
}

function Section({
  label,
  items,
  tone,
}: {
  label: string;
  items: readonly string[];
  tone: string;
}) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ ...WM.type.labelSmall, color: WM.text.muted }}>{label}</span>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((item, i) => (
          <li
            key={`${label}-${i}`}
            style={{ ...WM.type.bodySm, color: WM.text.body, display: "flex", gap: 6, alignItems: "baseline" }}
          >
            <span aria-hidden style={{ color: tone, fontSize: 9, lineHeight: 1.6 }}>▪</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExitRampCard({ ramp, className, presentation = "card" }: ExitRampCardProps) {
  // §Silence Is A Feature — no exit ramp while live work remains.
  if (ramp.state === "ACTIVE") return null;

  /**
   * §9 — "No green shield. NO GREEN MEANS SAFE. Verified truth is a sentence."
   *
   * This badge used to render the word SAFE TO LEAVE in `WM.state.ok`
   * (#5cb85c) on `WM.halo.ok` — a green glow behind the literal word "safe".
   * It is hard to build a more exact instance of the thing §9 bans by name,
   * and it survived the repo-wide colour sweep because the token is called
   * `ok` rather than anything a grep for green would have caught.
   *
   * Why it matters beyond the letter of the rule: `safeToLeave` is the
   * conjunction of five completion checks. It is a statement that nothing in
   * the RECEIPT is outstanding — not a statement that the trader's capital is
   * safe, that positions cannot move, or that the market will be kind while
   * they are away. A green shield is read by a human as the second thing. The
   * same reasoning already governs `BROKER-WORKING` on `ProtectionGradeLine`,
   * which is the fully-covered case and still refuses green: a working stop
   * can gap, and a closed session can open against you.
   *
   * So the safe verdict is restrained ivory FACT, and it keeps the hairline
   * border every other state has rather than a halo that glows. The UNSAFE
   * verdict keeps brass, because brass is the one direction this house is
   * allowed to raise its voice in — toward the thing still outstanding.
   */
  const verdictTone = ramp.safeToLeave ? WM.text.hero : WM.state.watch;
  const verdictHalo = ramp.safeToLeave ? WM.halo.none : WM.halo.watch;

  return (
    <section
      className={className}
      aria-label="Exit ramp"
      data-presentation={presentation}
      style={{
        border: presentation === "card" ? `1px solid ${WM.border.line}` : "none",
        borderTop: presentation === "embedded" ? `1px solid ${WM.border.hair}` : undefined,
        borderRadius: presentation === "card" ? WM.radius.xl : 0,
        background: presentation === "card" ? WM.surface.deep : "transparent",
        padding: presentation === "card" ? WM.space.lg : `${WM.space.md}px 0 0`,
        display: "flex",
        flexDirection: "column",
        gap: WM.space.md,
      }}
    >
      {/* Headline + state chip */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: WM.space.sm, flexWrap: "wrap" }}>
        <span style={{ ...WM.type.body, color: WM.text.hero, fontWeight: 700 }}>{ramp.headline}</span>
        <span
          style={{
            ...WM.type.labelSmall,
            color: verdictTone,
            background: verdictHalo,
            border: `1px solid ${WM.border.hair}`,
            borderRadius: WM.radius.sm,
            padding: "2px 6px",
            whiteSpace: "nowrap",
          }}
        >
          {ramp.safeToLeave ? "SAFE TO LEAVE" : ramp.state}
        </span>
      </header>

      {/* DONE is a record of what happened, and a record is a FACT — ivory.
          Green ticks stacked directly beneath a SAFE TO LEAVE badge are read
          together, as one reassurance, which is what §9 refuses. */}
      <Section label="Done" items={ramp.done} tone={WM.text.hero} />
      <Section label="Saved" items={ramp.saved} tone={WM.gold.mark} />
      <Section label="Open" items={ramp.open} tone={WM.state.watch} />

      {ramp.next && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ ...WM.type.labelSmall, color: WM.text.muted }}>Next</span>
          <span style={{ ...WM.type.bodySm, color: WM.text.body }}>{ramp.next}</span>
        </div>
      )}

      {ramp.return && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ ...WM.type.labelSmall, color: WM.text.muted }}>Return when</span>
          <span style={{ ...WM.type.bodySm, color: WM.gold.mark }}>{ramp.return}</span>
        </div>
      )}

      <footer style={{ ...WM.type.labelSmall, fontSize: 11, color: WM.text.muted, borderTop: `1px solid ${WM.border.hair}`, paddingTop: WM.space.sm }}>
        {ramp.recap}
      </footer>
    </section>
  );
}

export default ExitRampCard;
