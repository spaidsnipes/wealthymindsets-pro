"use client";

/**
 * SceneAdmits — the gate that makes admission REAL.
 *
 * ── The defect this closes ───────────────────────────────────────────────────
 *
 * `compileScene` shipped, and `SceneAdmissionPanel` rendered its verdict, and
 * for exactly one commit /command-deck was a self-contradicting screen: in a
 * CLOSED session the compiler withheld ONE_STORY, the panel printed
 * "Withheld · One story", and the One Story strip rendered anyway, thirteen
 * lines above the panel that claimed it was refused.
 *
 * That is worse than not having a compiler. A panel that reports refusals
 * nothing honours is not disclosure, it is decoration — and §H19 calls
 * decoration dead vocabulary. The compiler was right; the surface simply was
 * not listening.
 *
 * ── Why a component and not an inline ternary ────────────────────────────────
 *
 * An inline `{admits.includes("ONE_STORY") && <OneStoryStrip/>}` would work
 * once and rot immediately: every surface would grow its own copy, each free to
 * drift, and admission would stop being a single authority (§24). Routing every
 * gate through one component means there is exactly one place where "may this
 * be on screen" is answered, and a sentinel can find every caller.
 *
 * ── Why withholding is silent ────────────────────────────────────────────────
 *
 * This renders `null`. It does not leave a "hidden by scene" stub behind,
 * because a stub is just the surface with extra steps — §10 says a scene
 * changes what is ADMITTED, not what is collapsed.
 *
 * Silence here is honest rather than sneaky ONLY because `SceneAdmissionPanel`
 * discloses the full withheld list on the same screen. The gate removes; the
 * panel accounts for what was removed. Neither is complete alone. If a surface
 * ever adopts this gate WITHOUT also mounting the panel, the trader loses the
 * ability to tell "WM has nothing to say" from "WM is refusing to say it" —
 * and those are very different claims.
 *
 * Presentation only. Decides no facts; asks the compiler and obeys.
 */

import React from "react";

import type { SceneCompilation, SurfaceElement } from "@/lib/experience/compileScene";

export interface SceneAdmitsProps {
  /** The compiled scene. The single authority on what may be on screen. */
  readonly compilation: SceneCompilation;
  /** The surface element being gated. */
  readonly element: SurfaceElement;
  readonly children: React.ReactNode;
  /**
   * One sentence to leave in place of the refused surface.
   *
   * ── Why this is `string` and not `React.ReactNode` ─────────────────────────
   *
   * A `ReactNode` fallback would defeat the gate on the first busy afternoon:
   * a developer under pressure would pass a "lightweight" version of the same
   * card, and admission would quietly become a style prop. You cannot smuggle
   * a chart, a shortlist or a flatten button through a `string`. The type IS
   * the lock.
   *
   * ── Why it is allowed at all ───────────────────────────────────────────────
   *
   * The file doc below argues withholding must be silent BECAUSE
   * `SceneAdmissionPanel` accounts for it on the same screen. That holds when
   * the panel is next to the surface. It stops holding when the refused
   * surface is a numbered section a thousand lines further down, inside a
   * collapsed drawer: the trader opens "Deep read", finds section 2 missing
   * between 1 and 3, and has no way to know whether WM refused it or broke.
   * "Missing with no explanation" reads as a bug, and a product that looks
   * broken teaches people to distrust the parts that are working.
   *
   * So: optional, one line, muted, and never the surface itself.
   */
  readonly withheldNote?: string;
}

/**
 * Render `children` only if the compiled scene admits `element`.
 *
 * Note this deliberately takes the whole `compilation` rather than a bare
 * `admits` array. Passing the array would let a caller hand in a hand-built
 * list and call it admission; taking the compilation means the value can only
 * have come from `compileScene`.
 */
export function SceneAdmits({
  compilation,
  element,
  children,
  withheldNote,
}: SceneAdmitsProps): React.ReactElement | null {
  if (!compilation.admits.includes(element)) {
    if (withheldNote === undefined) return null;
    return (
      <p
        role="note"
        style={{
          margin: "8px 0",
          fontSize: 11,
          lineHeight: 1.6,
          color: "#8a8271",
          borderLeft: "2px solid rgba(212,175,55,0.28)",
          paddingLeft: 10,
        }}
      >
        {withheldNote}
      </p>
    );
  }
  return <>{children}</>;
}

export interface SceneAdmitsAmbientProps {
  readonly compilation: SceneCompilation;
  readonly children: React.ReactNode;
}

/**
 * SceneAdmitsAmbient — §9 INTERRUPTION LAW, made binding.
 *
 * ── The third instance of the same defect ────────────────────────────────────
 *
 * §9 is a sentence with teeth: "Only capital truth and material invalidation
 * may take the room. Academy may not. Nectar may not. A beautiful card may
 * not."
 *
 * `compileScene` has computed `admitsAmbient` since it shipped, and
 * `SceneAdmissionPanel` prints a sentence about it in every scene. A grep for
 * readers of that field found the panel, the compiler's own tests — and nothing
 * else. The verdict was announced by one surface and obeyed by none.
 *
 * That is exactly the shape twice closed already: the One Story strip rendering
 * while the panel said it was withheld, and the panel counting refusals it had
 * no power to enforce. Same defect, third location, and this one carries a named
 * law rather than a build-order preference.
 *
 * ── Scope: inert on /command-deck, LOAD-BEARING on /paper ────────────────────
 *
 * This gate shipped inert and was honest about it. /command-deck has no broker
 * panel, so its capital column is permanently `POSITION UNCONFIRMED /
 * UNOBSERVED` with no intent and no working orders; `capitalIsAtRisk` is false
 * in all four scenes that route can reach (PREGAME, WAIT, PERMISSION, CLOSED),
 * `admitsAmbient` is true in all four, and nothing is withheld there to this
 * day. It was shipped anyway so the panel's WARN-coloured sentence — "Ambient
 * surfaces are withheld" — would not first render on a screen with money
 * exposed and be false there.
 *
 * That day arrived. /paper adopted the compiler, and /paper has a real book:
 * open positions, working orders, a persistence disposition that can say the
 * last write did not survive. The Academy Challenge banner on that route had
 * been rendering unconditionally — §9's own named example ("Academy may not")
 * violated by the literal surface the law names, on the one route in WM Pro
 * where a position can actually exist. This gate now removes it the moment a
 * position is open, the moment a working order can still open exposure, and
 * the moment the ledger cannot prove its own last write.
 *
 * Keep both facts in view when reading this file: a gate can be correct and
 * still be inert on the route you happen to be looking at. Inert is not dead.
 * It is a lock installed before the door is ever used.
 *
 * ── Why a sibling and not a second organism (§24) ────────────────────────────
 *
 * "Is this element admitted" and "may ambient surfaces take the room" are two
 * different questions with two different answers on the same compilation, so
 * one component cannot answer both without a mode flag. They live in one file
 * because they are one authority: both take the whole `SceneCompilation`, both
 * render `null` on refusal, and both are found by the same sentinel.
 *
 * Presentation only. Decides no facts; asks the compiler and obeys.
 */
export function SceneAdmitsAmbient({
  compilation,
  children,
}: SceneAdmitsAmbientProps): React.ReactElement | null {
  if (!compilation.admitsAmbient) return null;
  return <>{children}</>;
}

export default SceneAdmits;
