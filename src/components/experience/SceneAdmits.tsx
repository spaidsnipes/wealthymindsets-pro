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
}: SceneAdmitsProps): React.ReactElement | null {
  if (!compilation.admits.includes(element)) return null;
  return <>{children}</>;
}

export default SceneAdmits;
