/**
 * activeSceneBus — the one channel a ROUTE uses to tell the SHELL what it
 * compiled.
 *
 * ── The problem this exists to solve ─────────────────────────────────────────
 *
 * `compileScene` produces a `capitalAtRisk` boolean. Before this file, that
 * boolean had exactly ONE consumer in the entire product —
 * `SceneAdmissionPanel.tsx:261` — and that consumer only PRINTS A SENTENCE
 * ABOUT IT. Nothing in WM Pro behaved differently when money was live.
 *
 * That matters because the canon names the behaviour explicitly:
 *
 *   "THE MOMENT CAPITAL IS LIVE, WM SHOULD REDUCE NAVIGATION."
 *
 * and because a second module, `selectNavEmphasis`, had already been written to
 * express it — eight passing tests, a version stamp, a written law about
 * right-of-way — and was imported by nothing at all. A verdict computed by one
 * module, announced by a second, and obeyed by none is the exact defect this
 * shift keeps finding. This is the fifth instance.
 *
 * ── Why a bus and not a prop ─────────────────────────────────────────────────
 *
 * The scene is compiled INSIDE a route (`/paper` owns a real book; the compiler
 * needs that book). The navigation lives in the app SHELL, which mounts above
 * every route and cannot see route state. There is no prop path between them.
 * The alternatives were:
 *
 *   - Hoist compilation into the shell. Rejected: the shell has no broker, no
 *     book, and no business owning capital truth. That creates a second owner
 *     of the capital column, which §24 forbids.
 *   - Put `capitalAtRisk` on the DecisionContextBus. Rejected for the same
 *     reason: that bus owns "what job is the human doing", which is a
 *     PREFERENCE the human can click. Capital truth is a FACT they cannot.
 *     Merging them would let a human clear a risk warning by changing tabs.
 *
 * So: a transport, and only a transport. This module computes nothing. It
 * holds the `SceneCompilation` its owner already produced and hands the same
 * object to whoever asks. The compiler remains the single owner.
 *
 * ── The honest default is SILENCE, not SAFETY ────────────────────────────────
 *
 * `getActiveScene()` returns `null` when no route has published. `null` means
 * "no route on screen owns a capital column" — it does NOT mean "you are flat".
 * §14.1: FLAT is a finding, never a default. Callers must treat `null` as
 * UNOBSERVED and neither reduce navigation nor claim the trader is safe.
 *
 * This is why `/command-deck` deliberately does NOT publish. It has no broker
 * panel, so its capital column is permanently UNOBSERVED, and publishing
 * `capitalAtRisk: false` from it would be asserting a safety it cannot check.
 * The behaviour would be identical — but the claim would be a lie, and a lie
 * that costs nothing today is the one that gets copied tomorrow.
 *
 * ── Why publication is TOKEN-CLAIMED ─────────────────────────────────────────
 *
 * React unmounts the OLD route after mounting the NEW one. A naive
 * `release() { current = null }` therefore wipes the incoming route's
 * publication a tick after it arrives — navigation would silently stop
 * reducing the moment you moved between two capital-owning routes, which is
 * precisely when it matters most. Each publisher holds a token and can only
 * clear a claim it still owns.
 *
 * PURE MODULE — no React, no I/O, no clock. The React binding is in
 * useActiveScene.ts, mirroring decisionContextBus / useDecisionContext.
 */

import type { SceneCompilation } from "./compileScene";
import type { CapitalReachVerdict } from "./capitalReach";

export const ACTIVE_SCENE_BUS_VERSION = "wm.active-scene.v1" as const;

/** Opaque publisher identity. Only the holder can release its own claim. */
export type SceneClaimToken = { readonly id: number };

export interface ActiveScenePublication {
  readonly version: typeof ACTIVE_SCENE_BUS_VERSION;
  /** The compilation the owning route produced. Never synthesised here. */
  readonly compilation: SceneCompilation;
  /** Which route published it — for provenance in the shell and in tests. */
  readonly route: string;
  /**
   * HOW FAR the published capital column travels — see capitalReach.ts.
   *
   * Required, not optional, and that is the entire point. A route that owns a
   * book knows what medium holds it; a route that cannot answer "does the
   * trader's other device see this?" has no business steering the shell.
   * Making the field optional would have let /paper keep publishing exactly as
   * it did before and left the iPad divergence silent forever, which is the
   * failure this field exists to end.
   */
  readonly reach: CapitalReachVerdict;
}

export class ActiveSceneBus {
  private publication: ActiveScenePublication | null = null;
  private holder: SceneClaimToken | null = null;
  private readonly listeners = new Set<() => void>();
  private nextId = 1;

  /** Mint a publisher identity. One per mounted route instance. */
  claim(): SceneClaimToken {
    return { id: this.nextId++ };
  }

  /**
   * Publish the compilation this route owns. Idempotent: republishing an
   * identical compilation from the same holder does not notify, so a route
   * re-rendering every tick cannot thrash the shell.
   */
  publish(
    token: SceneClaimToken,
    route: string,
    compilation: SceneCompilation,
    reach: CapitalReachVerdict,
  ): void {
    if (
      this.holder === token &&
      this.publication !== null &&
      this.publication.compilation === compilation &&
      this.publication.route === route &&
      // Compared BY VALUE, not by identity: `selectCapitalReach` is pure and
      // returns a fresh object on every call, so an identity check would make
      // the idempotence guard dead code and every route re-render would emit.
      // `deviceNote` is included because it carries the authority NAME — two
      // different servers both yielding ALL_DEVICES is a real change.
      this.publication.reach.reach === reach.reach &&
      this.publication.reach.deviceNote === reach.deviceNote
    ) {
      return;
    }
    this.holder = token;
    this.publication = { version: ACTIVE_SCENE_BUS_VERSION, compilation, route, reach };
    this.emit();
  }

  /**
   * Drop this route's claim. A no-op if someone else has since published —
   * see the unmount-ordering note in the header.
   */
  release(token: SceneClaimToken): void {
    if (this.holder !== token) return;
    this.holder = null;
    this.publication = null;
    this.emit();
  }

  /** `null` = UNOBSERVED. It is not a statement that capital is safe. */
  getActiveScene(): ActiveScenePublication | null {
    return this.publication;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Test-only reset. Never called by product code. */
  resetForTests(): void {
    this.publication = null;
    this.holder = null;
    this.listeners.clear();
    this.nextId = 1;
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const activeSceneBus = new ActiveSceneBus();

export default activeSceneBus;
