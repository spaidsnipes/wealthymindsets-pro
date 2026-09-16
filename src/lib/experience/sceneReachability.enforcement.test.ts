import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  SCENES,
  SURFACE_ELEMENTS,
  compileScene,
  type Scene,
  type SceneSignals,
  type SurfaceElement,
} from "./compileScene";

/**
 * SCENE REACHABILITY — the fourth rung of the ladder.
 *
 * "SPECIFIED is not IMPLEMENTED. IMPLEMENTED is not PROVEN. IMPLEMENTED is not
 * REACHABLE."
 *
 * `humilityReach.enforcement.test.ts` caught an element that the OS admitted
 * and no screen painted. This file asks the question one level up, and the
 * answer turned out to be worse:
 *
 *     Which of the ten scenes can this product actually COMPILE, given the
 *     signals its real adapters are capable of emitting?
 *
 * Not "which scenes does the switch statement contain" — all ten, obviously,
 * and `compileScene.test.ts` exercises all ten by constructing signals by hand.
 * Hand-built signals prove the compiler is correct. They prove nothing about
 * whether a human can ever get there.
 *
 * ── What the measurement found, 2026-09-16 ───────────────────────────────────
 *
 * WM Pro has exactly two production signal adapters: `paperSceneSignals` and
 * `deckSceneSignals`. BOTH hardcode `hadCapitalEvent: false` and
 * `receiptWritten: false`, with honest docstrings explaining why — no
 * DECISION_ID scopes the room, so no episode boundary exists, so neither fact
 * can be established (§B1).
 *
 * Those two literals are load-bearing in the cascade:
 *
 *   · RECEIPT requires `hadCapitalEvent && !receiptWritten`. With the first
 *     literal false, RECEIPT IS UNREACHABLE IN THE ENTIRE PRODUCT.
 *   · DONE has two doors. The receipted one requires `receiptWritten`, so it is
 *     shut; only the VALID NO TRADE door opens.
 *
 * §5 STEP 10 says one receipt is owed before the screen is allowed to go quiet.
 * The screen currently goes quiet without one, every time.
 *
 * ── A correction this file made to its own first draft ───────────────────────
 *
 * The draft asserted that RECEIPT_SHEET was therefore orphaned — admitted only
 * by a dead scene. The enumeration disagreed: DONE admits RECEIPT_SHEET as
 * well, and DONE is alive through the VALID NO TRADE door. So the element is
 * reachable and simply unpainted, which is the HUMILITY_PANEL class of defect
 * and a completely different repair from an adapter fix. That correction is the
 * argument for this file existing. Prose about a ten-branch switch is a guess;
 * running it is not.
 *
 * ── Why this file pins the wound instead of closing it ───────────────────────
 *
 * Closing it means giving the ROOM a decision episode, not just the order — and
 * that is Phase 6 work with real design in it (`/paper` already mints a
 * DECISION_ID per submit and stamps it onto orders and fills, so the evidence
 * exists; what is missing is the answer to "which decision is this room in").
 * Inventing that in passing would be worse than naming it.
 *
 * HEALING IS NOT HIDING THE WOUND. What this file refuses to allow is the gap
 * staying invisible. The dead set is enumerated, derived from the compiler
 * rather than asserted in prose, and pinned so that it can only SHRINK. The
 * moment an adapter can produce a capital event, these tests fail and say so.
 */

const ADAPTERS = ["paperSceneSignals.ts", "deckSceneSignals.ts"] as const;

/**
 * Signals no adapter can currently emit.
 *
 * This is the whole premise of the file, so it is READ FROM THE ADAPTERS rather
 * than believed. If someone wires a real episode and deletes one of these
 * literals, the assertion below fails first and points at the ledger entry that
 * has to come out with it.
 */
const FROZEN_FALSE = ["hadCapitalEvent", "receiptWritten"] as const;

/**
 * Every scene the product can compile today, and the ones it cannot.
 *
 * DEAD is a DEBT LEDGER, not a specification. Each entry is a scene the OS can
 * describe, that a trader cannot arrive at.
 */
const DEAD_SCENES: readonly Scene[] = ["RECEIPT"] as const;

/**
 * Surface elements with no reachable scene that admits them.
 *
 * Same ledger, one level down. An element here is guaranteed-invisible no
 * matter how many renderers someone writes for it.
 *
 * EMPTY, and the emptiness is the point — it is the correction to the first
 * draft of this file, which assumed RECEIPT_SHEET was orphaned because RECEIPT
 * is dead. The compiler said otherwise: DONE admits RECEIPT_SHEET too, and DONE
 * is reachable through the VALID NO TRADE door. So every one of the twelve
 * elements has a live scene behind it. That makes RECEIPT_SHEET's missing
 * renderer an ordinary reach defect (the HUMILITY_PANEL class) and not an
 * adapter problem — which is a materially different repair, and is exactly the
 * kind of thing prose would have gotten wrong and enumeration got right.
 */
const UNREACHABLE_ELEMENTS: readonly SurfaceElement[] = [] as const;

/** Enumerate every signal combination an adapter could actually produce. */
let ADAPTER_SIGNALS: SceneSignals[] | null = null;
function adapterReachableSignals(): SceneSignals[] {
  if (ADAPTER_SIGNALS) return ADAPTER_SIGNALS;
  const out: SceneSignals[] = [];
  const positions = ["FLAT", "LONG", "SHORT", "POSITION UNCONFIRMED"] as const;
  const confidences = ["CONFIRMED", "UNCONFIRMED", "UNOBSERVED"] as const;
  const links = [true, false, null] as const;
  const sessions = [true, false, null] as const;
  const rows = ["ACTION", "WAIT", "CAUTION", "NO TRADE", null] as const;

  for (const position of positions)
    for (const positionConfidence of confidences)
      for (const linkVerified of links)
        for (const sessionOpen of sessions)
          for (const rightOfWay of rows)
            for (const working of [0, 1])
              for (const intentInFlight of [false, true])
                for (const composingIntent of [false, true])
                  out.push({
                    position,
                    positionConfidence,
                    intentInFlight,
                    exposureIncreasingWorkingOrders: working,
                    linkVerified,
                    composingIntent,
                    // THE CONSTRAINT. Not a simplification — the literal value
                    // both production adapters emit.
                    hadCapitalEvent: false,
                    receiptWritten: false,
                    sessionOpen,
                    rightOfWay,
                  } as SceneSignals);
  ADAPTER_SIGNALS = out;
  return out;
}

const REACHED: ReadonlySet<Scene> = new Set(
  adapterReachableSignals().map(s => compileScene(s).scene),
);

const ADMITTED_SOMEWHERE_REACHABLE: ReadonlySet<SurfaceElement> = new Set(
  adapterReachableSignals().flatMap(s => {
    const out = compileScene(s);
    return REACHED.has(out.scene) ? [...out.admits] : [];
  }),
);

describe("scene reachability — the OS can describe scenes the product cannot reach", () => {
  it("the premise holds: both production adapters still freeze the receipt signals", () => {
    for (const file of ADAPTERS) {
      const src = readFileSync(resolve(__dirname, file), "utf8");
      for (const field of FROZEN_FALSE) {
        expect(
          new RegExp(`${field}:\\s*false`).test(src),
          `${file} no longer hardcodes ${field}: false. That is GOOD NEWS and ` +
            `this file is now stale — recompute DEAD_SCENES and ` +
            `UNREACHABLE_ELEMENTS and remove what you just brought back to life.`,
        ).toBe(true);
      }
    }
  });

  it("enumerates the scenes no trader can arrive at", () => {
    const dead = SCENES.filter(s => !REACHED.has(s));
    expect(
      [...dead].sort(),
      "the set of unreachable scenes changed. If it GREW, a shipped scene just " +
        "died and the cause is upstream in an adapter. If it SHRANK, delete the " +
        "entry from DEAD_SCENES — do not widen the ledger to match the code.",
    ).toEqual([...DEAD_SCENES].sort());
  });

  it("names the consequence: RECEIPT is dead, so §5 STEP 10 never runs", () => {
    // Stated as its own test because the list above is easy to read past. The
    // product currently lets every episode end without the receipt §5 says is
    // OWED before the screen may go quiet.
    expect(REACHED.has("RECEIPT")).toBe(false);

    // And the reachable DONE is only ever the refused-setup door, never the
    // traded-and-receipted one. A trader who actually moved capital cannot get
    // a completed loop out of this product today.
    const doneReasons = new Set(
      adapterReachableSignals()
        .map(s => compileScene(s))
        .filter(c => c.scene === "DONE")
        .map(c => c.reason),
    );
    expect(doneReasons.size).toBeGreaterThan(0);
    for (const reason of doneReasons) {
      expect(
        reason,
        "DONE became reachable for a reason other than VALID NO TRADE. If a " +
          "receipt door opened, RECEIPT should be alive too — check the ledger.",
      ).toContain("NO TRADE");
    }
  });

  it("enumerates the surface elements guaranteed invisible by that", () => {
    const orphaned = SURFACE_ELEMENTS.filter(e => !ADMITTED_SOMEWHERE_REACHABLE.has(e));
    expect(
      [...orphaned].sort(),
      "an element is admitted only in scenes the product cannot reach. Writing " +
        "a renderer for it would be theatre — no signal path can put it on a " +
        "screen. Fix the adapter, not the component.",
    ).toEqual([...UNREACHABLE_ELEMENTS].sort());
  });

  it("the ledger is honest in both directions: nothing dead is also claimed alive", () => {
    // A guard against the lazy repair — parking an element in the unreachable
    // ledger when some LIVE scene would have admitted it anyway. This one check
    // deliberately drops the adapter constraint and asks the compiler directly,
    // because the question is about the switch, not about today's plumbing.
    // Vacuous while the ledger is empty, and deliberately kept: the moment
    // someone adds an entry, this is the check that makes them justify it.
    for (const element of UNREACHABLE_ELEMENTS as readonly SurfaceElement[]) {
      const admitting = new Set<Scene>();
      for (const signals of unconstrainedSignals()) {
        const out = compileScene(signals);
        if (out.admits.includes(element)) admitting.add(out.scene);
      }
      expect(
        admitting.size,
        `${element} is admitted by no scene at all — that is dead vocabulary ` +
          `(§H19), a different and worse defect than unreachability.`,
      ).toBeGreaterThan(0);
      for (const scene of admitting) {
        expect(
          DEAD_SCENES,
          `${element} is admitted by ${scene}, which is NOT in DEAD_SCENES. ` +
            `Then it is reachable and does not belong in UNREACHABLE_ELEMENTS.`,
        ).toContain(scene);
      }
    }
  });

  it("most of the vocabulary IS alive, so the ledger is a debt and not a verdict", () => {
    // Sanity, and a guard against a future refactor that quietly kills the
    // whole switch and makes every assertion above vacuously true.
    expect(REACHED.size).toBe(SCENES.length - DEAD_SCENES.length);
    expect(ADMITTED_SOMEWHERE_REACHABLE.size).toBe(
      SURFACE_ELEMENTS.length - UNREACHABLE_ELEMENTS.length,
    );
    expect(REACHED.size).toBeGreaterThan(5);
  });
});

/**
 * The same enumeration WITHOUT the adapter constraint.
 *
 * Used by exactly one test, and only to ask what the switch statement says —
 * never to claim a trader could get there. `compileScene` is pure, so feeding
 * it signals nothing produces is legitimate interrogation of the compiler and
 * illegitimate as evidence about the product. Keeping the two enumerations
 * separately named is what stops that line being crossed by accident.
 */
function unconstrainedSignals(): SceneSignals[] {
  return adapterReachableSignals().flatMap(base => [
    base,
    { ...base, hadCapitalEvent: true },
    { ...base, hadCapitalEvent: true, receiptWritten: true },
  ]);
}
