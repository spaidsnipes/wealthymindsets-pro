/**
 * DecisionContextBus — the single owner of "what is the human trying to do
 * right now." The WM Experience Shell (P24) reorganizes the SAME market truth
 * around this mode; the chart, viewport and meaning persist while emphasis
 * shifts.
 *
 *   PREP → OBSERVE → WAIT → EXECUTE → MANAGE → REVIEW → LEARN
 *
 * Two founder laws are encoded here:
 *
 *  · INTERFACE HYSTERESIS (P29): MarketState can change every second; the
 *    workspace mode must NOT. Market-derived mode proposals are gated behind
 *    N consecutive confirmations before they commit, so a transient blip cannot
 *    thrash PREP→WAIT→EXECUTE→WAIT. User intent bypasses hysteresis (a human
 *    choosing REVIEW commits instantly).
 *
 *  · QUESTION ROUTER SEED (P26): the bus also carries the current lens question
 *    ("Is continuation healthy?", "Do I have permission?") so surfaces render
 *    the evidence relevant to that question rather than every permanent panel.
 *
 * PURE MODULE — no React, no I/O. The React binding lives in
 * useDecisionContext.ts. Deterministic and fully unit-testable.
 */

export const DECISION_CONTEXT_SCHEMA_VERSION = "wm.decision-context.v1" as const;

export type ExperienceMode =
  | "PREP"
  | "OBSERVE"
  | "WAIT"
  | "EXECUTE"
  | "MANAGE"
  | "REVIEW"
  | "LEARN";

export const EXPERIENCE_MODES: readonly ExperienceMode[] = [
  "PREP",
  "OBSERVE",
  "WAIT",
  "EXECUTE",
  "MANAGE",
  "REVIEW",
  "LEARN",
] as const;

/** What drove the current committed mode — for honest provenance in the shell. */
export type ModeSource = "default" | "user" | "market";

export interface DecisionContext {
  readonly schemaVersion: typeof DECISION_CONTEXT_SCHEMA_VERSION;
  readonly mode: ExperienceMode;
  /** The current lens question this workspace is answering. */
  readonly question: string;
  /** Epoch ms when the current mode committed. */
  readonly since: number;
  readonly source: ModeSource;
}

export type ProposeStatus = "COMMITTED" | "PENDING" | "NOOP";

export interface ProposeResult {
  readonly status: ProposeStatus;
  readonly context: DecisionContext;
  /** When PENDING: how many more confirmations are needed to commit. */
  readonly remaining: number;
}

const DEFAULT_QUESTION = "What is the highest-leverage decision I can make right now?";
const DEFAULT_CONFIRMATIONS = 3;

export interface DecisionContextBusOptions {
  /** Consecutive market proposals required before a mode transition commits. */
  readonly confirmationsRequired?: number;
  readonly initialMode?: ExperienceMode;
  readonly initialQuestion?: string;
  /** Injectable clock for deterministic tests. */
  readonly now?: () => number;
}

export class DecisionContextBus {
  private context: DecisionContext;
  private readonly listeners = new Set<() => void>();
  private readonly confirmationsRequired: number;
  private readonly now: () => number;
  private pending: { mode: ExperienceMode; count: number } | null = null;

  constructor(opts: DecisionContextBusOptions = {}) {
    this.confirmationsRequired = Math.max(1, opts.confirmationsRequired ?? DEFAULT_CONFIRMATIONS);
    this.now = opts.now ?? (() => Date.now());
    this.context = {
      schemaVersion: DECISION_CONTEXT_SCHEMA_VERSION,
      mode: opts.initialMode ?? "OBSERVE",
      question: opts.initialQuestion?.trim() || DEFAULT_QUESTION,
      since: this.now(),
      source: "default",
    };
  }

  getContext(): DecisionContext {
    return this.context;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private commit(next: Partial<DecisionContext> & { mode: ExperienceMode; source: ModeSource }): void {
    this.pending = null;
    this.context = {
      ...this.context,
      ...next,
      since: this.now(),
    };
    for (const l of this.listeners) l();
  }

  /**
   * User-driven mode change — commits IMMEDIATELY (human intent is authoritative
   * and bypasses hysteresis). Optionally sets the lens question at the same time.
   */
  setMode(mode: ExperienceMode, question?: string): DecisionContext {
    if (mode === this.context.mode && (question === undefined || question.trim() === this.context.question)) {
      this.pending = null;
      return this.context;
    }
    this.commit({
      mode,
      source: "user",
      ...(question !== undefined && question.trim() ? { question: question.trim() } : {}),
    });
    return this.context;
  }

  /** Set the lens question without changing mode. */
  setQuestion(question: string): DecisionContext {
    const q = question.trim();
    if (!q || q === this.context.question) return this.context;
    this.context = { ...this.context, question: q };
    for (const l of this.listeners) l();
    return this.context;
  }

  /**
   * Market-derived mode proposal — HYSTERESIS-GATED. Requires N consecutive
   * identical proposals before committing. A proposal for a different mode
   * resets the counter. Proposing the already-committed mode is a NOOP and
   * clears any pending transition (the market "changed its mind back").
   */
  proposeMode(mode: ExperienceMode): ProposeResult {
    if (mode === this.context.mode) {
      this.pending = null;
      return { status: "NOOP", context: this.context, remaining: 0 };
    }
    if (!this.pending || this.pending.mode !== mode) {
      this.pending = { mode, count: 1 };
    } else {
      this.pending.count += 1;
    }
    if (this.pending.count >= this.confirmationsRequired) {
      this.commit({ mode, source: "market" });
      return { status: "COMMITTED", context: this.context, remaining: 0 };
    }
    return {
      status: "PENDING",
      context: this.context,
      remaining: this.confirmationsRequired - this.pending.count,
    };
  }

  /** Testing/inspection: the currently pending (unconfirmed) transition, if any. */
  peekPending(): Readonly<{ mode: ExperienceMode; count: number }> | null {
    return this.pending ? { ...this.pending } : null;
  }
}

/** App-wide singleton. Surfaces share ONE decision context. */
export const decisionContextBus = new DecisionContextBus();
