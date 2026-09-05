/**
 * compileScene — BUILD ORDER §10: "SCENE COMPILER, NOT PAGES".
 *
 * ── Why this file is the difference between an app and an operating system ────
 *
 * The Build Order names the failure precisely:
 *
 *     A regular app shows many panels. It lets each panel keep its own state.
 *     It makes the trader assemble the truth in their head. It looks busy when
 *     the correct action is wait. It looks finished when the broker has not
 *     spoken.
 *
 * WM Pro has, until this file, been that app. Every surface decided for itself
 * whether to render. Nothing in the codebase could answer the one question an
 * operating system must answer: GIVEN THE STATE, WHAT IS ALLOWED ON THE SCREEN?
 *
 * §10 answers it with one mechanism: "Implement one live route. A scene
 * variable changes what is admitted to the surface. Same market state
 * underneath. Different admission."
 *
 * This is ADMISSION, not emphasis, and the distinction is the whole point:
 *
 *   - `shellEmphasis` (existing) decides how much room the rail gets. Every
 *     surface still renders; one is merely larger.
 *   - `compileScene` (this file) decides whether a surface renders AT ALL.
 *
 * ── Why this is not a seventh owner (§24) ────────────────────────────────────
 *
 * §24 forbids answering a new hole with a new organism. This module stores
 * nothing, fetches nothing and decides no facts. It is a PROJECTION of truths
 * that other owners already hold — Capital Protection (`selectPositionTruth`),
 * Execution Truth (broker intent state), Market Truth (session), Decision
 * (`decisionPermissionCompiler`). If it disagrees with an owner, the owner is
 * right and this file has a bug.
 *
 * ── The law that makes it worth having ───────────────────────────────────────
 *
 * §9 INTERRUPTION: "Only capital truth and material invalidation may take the
 * room. Academy may not. Nectar may not. A beautiful card may not."
 *
 * That sentence was unenforceable before this file, because nothing in the
 * system knew when capital was live. Now `admitsAmbient` does, and it is false
 * in every scene where the trader's money is exposed or unaccounted for.
 *
 * ── The rule that reverses WM's most expensive habit ─────────────────────────
 *
 * §9: "A failure may reduce capability. It may not increase certainty."
 *
 * On 2026-09-03 the Alpaca panel rendered "No open positions" when its fetch
 * FAILED — the failure made the screen more confident, not less. The precedence
 * cascade below refuses that shape structurally: an unconfirmed book while
 * capital could be exposed compiles to DEGRADED, and DEGRADED cannot be
 * out-prioritised by any prettier scene beneath it.
 *
 * PURE — no React, no I/O, no clock, no store, no provider knowledge.
 */

import type { PositionConfidence, PositionLabel } from "../positionTruth";
import type { RightOfWay } from "../marketData/viewModels/decisionPermissionCompiler";

export const SCENE_COMPILER_VERSION = "wm.scene.v1" as const;

/** The ten scenes named by BUILD ORDER §10. No eleventh scene. */
export type Scene =
  /** Nothing has resolved yet. The quiet room before the session has anything to say. */
  | "PREGAME"
  /** A thesis exists and right-of-way is withheld. Holding is the action. */
  | "WAIT"
  /** Right-of-way is earned. The expression shortlist may appear. */
  | "PERMISSION"
  /** The human is composing an order. The ticket owns the room. */
  | "EXECUTE"
  /** An intent has left the building and the broker has not answered. */
  | "PENDING"
  /** A confirmed open position exists. It is stewarded, not admired. */
  | "MANAGE"
  /** Capital may be exposed and the truth about it is not verified. */
  | "DEGRADED"
  /** The session is closed. Candles remain; nothing streams. */
  | "CLOSED"
  /** Flat is confirmed after a capital event and the one receipt is owed. */
  | "RECEIPT"
  /** Nothing is exposed, nothing is working, and the day's answer is in. */
  | "DONE";

export const SCENES: readonly Scene[] = [
  "PREGAME",
  "WAIT",
  "PERMISSION",
  "EXECUTE",
  "PENDING",
  "MANAGE",
  "DEGRADED",
  "CLOSED",
  "RECEIPT",
  "DONE",
] as const;

/**
 * The components §10 names. A scene admits a subset; everything else is not
 * merely de-emphasised, it is absent.
 */
export type SurfaceElement =
  | "MARKET_CANVAS"
  | "THESIS_GEOMETRY"
  | "EXPRESSION_CARD"
  | "ONE_STORY"
  | "PROTECTION_GRADE"
  | "PENDING_BANNER"
  | "HOT_PATH_REMOTE"
  | "FLATTEN_CONFIRM"
  | "HUMILITY_PANEL"
  | "FIDELITY_CHIPS"
  | "RECEIPT_SHEET"
  /** The escape hatch. §9 DEGRADED: "Keep OPEN BROKER." Never withheld once capital is live. */
  | "OPEN_BROKER";

export const SURFACE_ELEMENTS: readonly SurfaceElement[] = [
  "MARKET_CANVAS",
  "THESIS_GEOMETRY",
  "EXPRESSION_CARD",
  "ONE_STORY",
  "PROTECTION_GRADE",
  "PENDING_BANNER",
  "HOT_PATH_REMOTE",
  "FLATTEN_CONFIRM",
  "HUMILITY_PANEL",
  "FIDELITY_CHIPS",
  "RECEIPT_SHEET",
  "OPEN_BROKER",
] as const;

/**
 * Signals the compiler reads. Deliberately small, concrete and producible —
 * every field has a real owner today. §H19 forbids adding vocabulary with no
 * producer behind it, so nothing here is aspirational.
 */
export interface SceneSignals {
  /** Canonical capital truth — the `label` from `selectPositionTruth`. */
  readonly position: PositionLabel;
  /** Canonical capital confidence — the `confidence` from `selectPositionTruth`. */
  readonly positionConfidence: PositionConfidence;
  /** An order intent has left the building with no terminal broker answer yet. */
  readonly intentInFlight: boolean;
  /**
   * Working orders that could INCREASE exposure (§21 flatten/working-order
   * race). A count, not a boolean, because §21's grammar names the number:
   * "FLAT POSITION · WORKING BUY 1 · POTENTIAL EXPOSURE 1 · NOT DONE".
   */
  readonly exposureIncreasingWorkingOrders: number;
  /** Is the broker/data link currently verified? `null` means not yet known. */
  readonly linkVerified: boolean | null;
  /** Is the trading session open? `null` means not yet known. */
  readonly sessionOpen: boolean | null;
  /** The compiled right-of-way verdict, if the Decision owner has one. */
  readonly rightOfWay: RightOfWay | null;
  /** The human has the order ticket open and is composing an intent. */
  readonly composingIntent: boolean;
  /** A fill occurred at some point on this decision — real capital moved. */
  readonly hadCapitalEvent: boolean;
  /** The one receipt (§5 STEP 10) has been written for the closed decision. */
  readonly receiptWritten: boolean;
}

export interface SceneCompilation {
  readonly version: typeof SCENE_COMPILER_VERSION;
  readonly scene: Scene;
  /** One sentence naming the single signal that selected this scene. §9: sentences, not badges. */
  readonly reason: string;
  /** What may render. Everything absent from this list is withheld, not shrunk. */
  readonly admits: readonly SurfaceElement[];
  /**
   * Whether non-capital surfaces (Academy, Nectar, Genome, Calendar,
   * celebration) may take the room. §9 INTERRUPTION + §H11 NOTIFICATIONS.
   * False in every scene where money is exposed or unaccounted for.
   */
  readonly admitsAmbient: boolean;
  /**
   * True when this scene exists because something FAILED rather than because
   * the trader progressed. §9: a failure may reduce capability, never increase
   * certainty — a surface reading this must not add confidence here.
   */
  readonly degraded: boolean;
  /** True when capital is exposed, in flight, or unaccounted for. */
  readonly capitalAtRisk: boolean;
}

/**
 * Capital is "at risk" whenever money could be exposed — including when we
 * simply do not know.
 *
 * `POSITION UNCONFIRMED` counts ONLY if something happened that could have
 * created exposure. A trader who has never connected a broker also has an
 * unconfirmed book, and shouting DEGRADED at them forever would be crying
 * wolf — noise trains people to stop reading labels, which is exactly how a
 * real warning gets missed later.
 */
function capitalIsAtRisk(s: SceneSignals): boolean {
  if (s.position === "LONG" || s.position === "SHORT") return true;
  if (s.intentInFlight) return true;
  if (s.exposureIncreasingWorkingOrders > 0) return true;
  if (s.hadCapitalEvent && !s.receiptWritten) return true;
  return false;
}

/** Flatness that was actually OBSERVED, per §14.1. Never a default. */
function flatConfirmed(s: SceneSignals): boolean {
  return s.position === "FLAT" && s.positionConfidence === "CONFIRMED";
}

/**
 * Compile the scene.
 *
 * The cascade is ordered by CONSEQUENCE, not by narrative. The most dangerous
 * true statement wins, so no happier scene can ever mask it.
 */
export function compileScene(signals: SceneSignals): SceneCompilation {
  const atRisk = capitalIsAtRisk(signals);
  const working = Math.max(0, Math.trunc(signals.exposureIncreasingWorkingOrders || 0));

  // ── 1. DEGRADED ────────────────────────────────────────────────────────────
  // Capital could be exposed and we cannot prove what is true about it. This
  // outranks everything because every scene below it would state something with
  // more confidence than the evidence supports.
  if (atRisk && signals.linkVerified === false) {
    return build(
      "DEGRADED",
      "The broker link is not verified while capital may be exposed — nothing below this is provable right now.",
      signals,
      { atRisk },
    );
  }
  if (atRisk && signals.positionConfidence !== "CONFIRMED") {
    return build(
      "DEGRADED",
      `Capital may be exposed and the book is ${signals.positionConfidence} — this is not a confirmation that you are flat.`,
      signals,
      { atRisk },
    );
  }
  // The LABEL can say unconfirmed even when the CONFIDENCE field does not — the
  // two are separate facts in `positionTruth`, and only the label answers "what
  // do you hold". Found by the exhaustive property test on 2026-09-05: without
  // this branch, an unreceipted capital event on an unconfirmed book fell all
  // the way through to CLOSED or PREGAME — a quiet screen while money was
  // unaccounted for. §14.1: FLAT is a finding, never a default.
  if (atRisk && signals.position === "POSITION UNCONFIRMED") {
    return build(
      "DEGRADED",
      "Capital may be exposed and the book has not been read — WM cannot tell you what you hold right now.",
      signals,
      { atRisk },
    );
  }

  // ── 2. PENDING ─────────────────────────────────────────────────────────────
  // The broker has not answered. This outranks MANAGE deliberately: an
  // unanswered intent is the moment the screen is most tempted to guess, and
  // §5 STEP 6 forbids showing FILLED because WM wished it. The position card is
  // still admitted inside PENDING, so nothing is lost by putting the silence
  // first.
  if (signals.intentInFlight) {
    return build(
      "PENDING",
      "An intent has been sent and the broker has not answered yet.",
      signals,
      { atRisk },
    );
  }
  // §21 flatten/working-order race: flat is NOT done while a working order can
  // reopen exposure. This is the exact case that made "DONE FOR NOW" a lie.
  if (working > 0 && !(signals.position === "LONG" || signals.position === "SHORT")) {
    return build(
      "PENDING",
      `FLAT POSITION · WORKING BUY ${working} · POTENTIAL EXPOSURE ${working} · NOT DONE`,
      signals,
      { atRisk },
    );
  }

  // ── 3. MANAGE ──────────────────────────────────────────────────────────────
  if (signals.position === "LONG" || signals.position === "SHORT") {
    return build(
      "MANAGE",
      `${signals.position} position is open and confirmed — steward it.`,
      signals,
      { atRisk },
    );
  }

  // ── 4. RECEIPT ─────────────────────────────────────────────────────────────
  // §5 STEP 10: when the broker is at zero and recon says FLAT CONFIRMED, one
  // receipt is owed. It is owed BEFORE the screen is allowed to go quiet.
  if (flatConfirmed(signals) && signals.hadCapitalEvent && !signals.receiptWritten) {
    return build(
      "RECEIPT",
      "FLAT CONFIRMED after a capital event — one receipt is owed before this closes.",
      signals,
      { atRisk },
    );
  }

  // ── 5. DONE ────────────────────────────────────────────────────────────────
  // §21: "DONE FOR NOW requires zero effective position AND no unintended
  // exposure-increasing working order." Reachable two honest ways: the receipt
  // was written after a trade, or the engine refused the setup outright — §18
  // is explicit that a refused day is also success.
  if (flatConfirmed(signals) && working === 0) {
    if (signals.receiptWritten) {
      return build("DONE", "FLAT CONFIRMED, nothing working, receipt written.", signals, { atRisk });
    }
    if (signals.rightOfWay === "NO TRADE" && !signals.hadCapitalEvent) {
      return build("DONE", "VALID NO TRADE — permission was not earned and nothing was risked.", signals, { atRisk });
    }
  }

  // ── 6. CLOSED ──────────────────────────────────────────────────────────────
  // Below capital, above decision. Holding risk into a closed session is still
  // MANAGE (handled above); with nothing at stake, the session is the truth.
  // §8 forbids DELAYED when the session is merely closed — these are different
  // facts and this is where they separate.
  if (signals.sessionOpen === false) {
    return build("CLOSED", "SESSION CLOSED — LAST VERIFIED. Nothing is streaming.", signals, { atRisk });
  }

  // ── 7. EXECUTE ─────────────────────────────────────────────────────────────
  if (signals.composingIntent) {
    return build("EXECUTE", "You are composing an intent — the ticket owns the room.", signals, { atRisk });
  }

  // ── 8. PERMISSION ──────────────────────────────────────────────────────────
  if (signals.rightOfWay === "ACTION") {
    return build("PERMISSION", "PERMISSION EARNED — the expression shortlist may open.", signals, { atRisk });
  }

  // ── 9. WAIT ────────────────────────────────────────────────────────────────
  // NO TRADE is deliberately NOT routed here. Waiting implies something is
  // pending; a rejected thesis is not deferred, it is answered. When NO TRADE
  // cannot reach DONE (because the book is not confirmed flat), it falls
  // through to PREGAME rather than claiming a decision state it has not earned.
  if (signals.rightOfWay === "WAIT" || signals.rightOfWay === "CAUTION") {
    return build("WAIT", "Right-of-way is withheld — holding is the action.", signals, { atRisk });
  }

  // ── 10. PREGAME ────────────────────────────────────────────────────────────
  return build("PREGAME", "Nothing has resolved yet — prepare.", signals, { atRisk });
}

/**
 * Admission per scene.
 *
 * Read this as the answer to "what is allowed on screen", not "what looks
 * good". Two invariants are load-bearing and are locked by tests:
 *
 *   1. OPEN_BROKER is admitted in every scene where capital is at risk. §9 and
 *      §H6 both require the escape hatch to survive a failure; a degraded
 *      screen that hides the way out is worse than no screen.
 *   2. FLATTEN_CONFIRM is admitted wherever a position can be closed. §9 PHONE
 *      law: "Academy, journal, nectar, animations may not block those controls."
 */
function admissionFor(scene: Scene, atRisk: boolean): readonly SurfaceElement[] {
  switch (scene) {
    case "PREGAME":
      return ["MARKET_CANVAS", "FIDELITY_CHIPS", "HUMILITY_PANEL"];
    case "WAIT":
      // §9 MOTION: "WAIT and CLOSED do not pulse." The room is quiet on purpose.
      return ["MARKET_CANVAS", "THESIS_GEOMETRY", "ONE_STORY", "FIDELITY_CHIPS", "HUMILITY_PANEL"];
    case "PERMISSION":
      return ["MARKET_CANVAS", "THESIS_GEOMETRY", "ONE_STORY", "EXPRESSION_CARD", "FIDELITY_CHIPS", "HUMILITY_PANEL"];
    case "EXECUTE":
      return ["MARKET_CANVAS", "THESIS_GEOMETRY", "EXPRESSION_CARD", "ONE_STORY", "FIDELITY_CHIPS", "HUMILITY_PANEL", "OPEN_BROKER"];
    case "PENDING":
      return ["MARKET_CANVAS", "THESIS_GEOMETRY", "EXPRESSION_CARD", "PENDING_BANNER", "PROTECTION_GRADE", "HOT_PATH_REMOTE", "FLATTEN_CONFIRM", "FIDELITY_CHIPS", "HUMILITY_PANEL", "OPEN_BROKER"];
    case "MANAGE":
      return ["MARKET_CANVAS", "THESIS_GEOMETRY", "EXPRESSION_CARD", "ONE_STORY", "PROTECTION_GRADE", "HOT_PATH_REMOTE", "FLATTEN_CONFIRM", "FIDELITY_CHIPS", "HUMILITY_PANEL", "OPEN_BROKER"];
    case "DEGRADED":
      // Capability is reduced — the shortlist and the story are withheld
      // because neither can be trusted. What survives is the way OUT and the
      // admission that we do not know.
      return atRisk
        ? ["MARKET_CANVAS", "PROTECTION_GRADE", "HOT_PATH_REMOTE", "FLATTEN_CONFIRM", "FIDELITY_CHIPS", "HUMILITY_PANEL", "OPEN_BROKER"]
        : ["MARKET_CANVAS", "FIDELITY_CHIPS", "HUMILITY_PANEL", "OPEN_BROKER"];
    case "CLOSED":
      // §9 CLOSED: "Candles remain. Last verified time remains. No fake stream."
      return ["MARKET_CANVAS", "FIDELITY_CHIPS", "HUMILITY_PANEL"];
    case "RECEIPT":
      // OPEN_BROKER survives here on purpose. RECEIPT is WM asserting "you are
      // flat after a trade" — a claim about the trader's money made moments
      // after it moved. That is precisely when the source of truth must stay one
      // tap away; withholding it would be the exact failure invariant 1 exists
      // to prevent.
      return ["MARKET_CANVAS", "RECEIPT_SHEET", "FIDELITY_CHIPS", "HUMILITY_PANEL", "OPEN_BROKER"];
    case "DONE":
      // §18: "The screen gets quiet."
      return ["MARKET_CANVAS", "RECEIPT_SHEET", "FIDELITY_CHIPS"];
  }
}

function build(
  scene: Scene,
  reason: string,
  signals: SceneSignals,
  ctx: { atRisk: boolean },
): SceneCompilation {
  const capitalAtRisk = ctx.atRisk;
  const admitted = admissionFor(scene, capitalAtRisk);
  // STRUCTURAL BACKSTOP — not a convenience.
  //
  // Invariant 1 (the escape hatch) is enforced HERE rather than trusted to ten
  // separate case arms, because it must survive every future scene edit made by
  // someone who has not read this file. A screen that cannot prove what your
  // money is doing must never also be the screen that hides the way to check.
  const admits =
    capitalAtRisk && !admitted.includes("OPEN_BROKER")
      ? [...admitted, "OPEN_BROKER" as const]
      : admitted;
  return {
    version: SCENE_COMPILER_VERSION,
    scene,
    reason,
    admits,
    // §9 INTERRUPTION + §H11: ambient surfaces never take the room while money
    // is live. DEGRADED also excludes them even when nothing is exposed — a
    // screen that cannot prove the basics has not earned the right to teach.
    admitsAmbient: !capitalAtRisk && scene !== "DEGRADED" && scene !== "PENDING",
    degraded: scene === "DEGRADED",
    capitalAtRisk,
  };
}

export default compileScene;
