/**
 * capitalReach — HOW FAR does the capital column we just published actually
 * travel?
 *
 * ── The hole this closes ─────────────────────────────────────────────────────
 *
 * Known Holes Owned, H16 SHARED STORE GAP, and BUILD ORDER §22A say the same
 * thing in the same words:
 *
 *   "paper / position state held in per-device localStorage. That is NOT
 *    cross-device truth… if no shared store exists, status is CROSS-DEVICE
 *    BLOCKED, not simulated parity."
 *
 * That was true before this file and it is still true after it. This module
 * does not fix the gap — no module can, the fix is a server-side Decision /
 * Position authority keyed by DECISION_ID, and that is P0 work that needs a
 * migration. What this module fixes is that the gap was SILENT.
 *
 * ── Why it became urgent ─────────────────────────────────────────────────────
 *
 * The previous atom (1ea809e) made the app shell reduce the navigation rail
 * when `capitalAtRisk` is true. That is the canon behaviour and it works. But
 * it silently inherited the scope of the store underneath it:
 *
 *   Open a paper position on the desktop → the rail reduces, correctly.
 *   Pick up the iPad → the rail does NOT reduce, and NOTHING SAYS WHY.
 *
 * The trader is left to conclude one of two things, and both are wrong: that
 * the position closed, or that the iPad is broken. The real answer — "that
 * book lives in the other browser's localStorage and this device has never
 * heard of it" — is nowhere on the screen.
 *
 * The Master Index parity law names this exact failure:
 *
 *   "If one surface cannot support a capability, the limitation must be
 *    explicit, intentional and canonically owned — not accidental drift."
 *
 * It was accidental drift. Making a limitation explicit is not a consolation
 * prize for failing to remove it; §9 is built on the distinction between
 * reduced capability (allowed) and increased certainty (never).
 *
 * ── Why reach is DERIVED and not DECLARED ────────────────────────────────────
 *
 * The obvious API is `reach: "ALL_DEVICES"` as a field a route fills in. That
 * API is a lie generator: the day someone writes a Supabase table and wires
 * half of it, the literal string gets flipped and the UI starts promising a
 * parity nobody proved. It is the same defect class this shift has now closed
 * five times — a verdict announced by a module that never checked.
 *
 * So `selectCapitalReach` takes FACTS about the store and computes the verdict.
 * There is no input combination that yields ALL_DEVICES without a named server
 * authority, and there is a test asserting exactly that. To claim parity you
 * have to produce the thing that would make it true.
 *
 * PURE MODULE — no React, no I/O, no clock, no store import.
 */

export const CAPITAL_REACH_VERSION = "wm.capital-reach.v1" as const;

/**
 * How far the published capital column reaches.
 *
 * Deliberately NOT a boolean `isShared`. THIS_BROWSER_ONLY and UNKNOWN are
 * different findings — the first is a known, owned, documented limitation; the
 * second is a store that claims sharing it cannot evidence — and a boolean
 * would collapse them toward the reassuring answer. §14.1.
 */
export type CapitalReach =
  /** localStorage or equivalent. Other tabs of this browser may see it. No other device can. */
  | "THIS_BROWSER_ONLY"
  /** A named server authority holds the book. Every signed-in surface projects the same record. */
  | "ALL_DEVICES"
  /** The store says it is shared but cannot name its authority. Not provable, so not claimed. */
  | "UNKNOWN";

/**
 * What is actually true about the store that produced the capital column.
 *
 * These are facts a store knows about ITSELF, which is why the paper ledger
 * exports its own — see PAPER_STORE_FACTS in paperTrade.ts, sitting next to the
 * `window.localStorage` calls that make them true. When that store grows a
 * server authority, the facts and the code change in the same edit.
 */
export interface CapitalStoreFacts {
  /** The persistence medium. BROWSER_LOCAL can never be cross-device, by construction. */
  readonly medium: "BROWSER_LOCAL" | "SERVER_SHARED";
  /**
   * Does a second TAB of the same browser learn about a write?
   *
   * Recorded because it is true and useful, and pinned by a test because it
   * must never widen the verdict: cross-tab is a fact about one browser
   * profile on one machine. A trader holding a phone is not another tab.
   */
  readonly crossTabInvalidation: boolean;
  /**
   * The named shared authority — a table, endpoint or service that holds the
   * book for every device. `null` when none exists.
   *
   * This is the evidence requirement. ALL_DEVICES is unreachable without it.
   */
  readonly serverAuthority: string | null;
}

export interface CapitalReachVerdict {
  readonly version: typeof CAPITAL_REACH_VERSION;
  readonly reach: CapitalReach;
  /** Canon status word from H16. True whenever `reach !== "ALL_DEVICES"`. */
  readonly crossDeviceBlocked: boolean;
  /**
   * The full sentence for the surface that OWNS the book (e.g. /paper).
   * Always present — a reach worth computing is a reach worth saying.
   */
  readonly deviceNote: string;
  /**
   * The short clause for the app shell, which is already saying something
   * about the reduction and must not turn into a paragraph. `null` when reach
   * is ALL_DEVICES, because then there is nothing to warn about and a shell
   * that narrates the happy path is noise.
   */
  readonly shellClause: string | null;
}

/**
 * Compute how far this capital column reaches.
 *
 * The whole point is the asymmetry: BROWSER_LOCAL is decided by the medium
 * alone and no other field can rescue it, while SERVER_SHARED still has to
 * produce a named authority before it is believed.
 */
export function selectCapitalReach(facts: CapitalStoreFacts): CapitalReachVerdict {
  // A browser-local store cannot become cross-device by any other property it
  // reports. `crossTabInvalidation` is read nowhere in this branch ON PURPOSE:
  // it describes tabs, and tabs are one machine.
  if (facts.medium === "BROWSER_LOCAL") {
    return {
      version: CAPITAL_REACH_VERSION,
      reach: "THIS_BROWSER_ONLY",
      crossDeviceBlocked: true,
      deviceNote:
        "This book is held in this browser only. Your phone and tablet cannot see it, " +
        "so they will not reduce navigation for it. CROSS-DEVICE: BLOCKED — no shared " +
        "position authority exists yet.",
      shellClause: "Held in this browser only — your other devices do not see this position.",
    };
  }

  // SERVER_SHARED without a named authority is a claim, not a fact. Refusing
  // it here is what makes ALL_DEVICES mean something when it finally appears.
  if (facts.serverAuthority === null || facts.serverAuthority.trim() === "") {
    return {
      version: CAPITAL_REACH_VERSION,
      reach: "UNKNOWN",
      crossDeviceBlocked: true,
      deviceNote:
        "This store reports shared persistence but names no authority holding the book, " +
        "so WM cannot confirm your other devices see this position. CROSS-DEVICE: UNKNOWN.",
      shellClause: "Reach unconfirmed — WM cannot tell whether your other devices see this position.",
    };
  }

  return {
    version: CAPITAL_REACH_VERSION,
    reach: "ALL_DEVICES",
    crossDeviceBlocked: false,
    deviceNote: `This book is held by ${facts.serverAuthority}. Every signed-in device projects the same position.`,
    shellClause: null,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
 * CROSS-DEVICE PROGRESS — the second sentence the reach note could not say.
 *
 * `selectCapitalReach` ends the SILENCE. It does not end the DEAD END. Today
 * the trader reads "CROSS-DEVICE: BLOCKED — no shared position authority
 * exists yet" and has no way to know whether that is a permanent property of
 * the product, a thing someone is building, or a switch nobody threw. All
 * three read identically, and the third one is the one he could fix in a
 * minute.
 *
 * The shared authority now EXISTS in the repo (sharedPositionAuthority.ts,
 * /api/decision-position, and a migration). Existing in the repo is not
 * existing. So this selector takes an OBSERVATION — what the authority route
 * actually answered on this device, just now — and turns the flat limitation
 * into an ordered account of which step is done, which is not, and exactly
 * what the next dependency is.
 *
 * WHY IT LIVES HERE AND NOT IN A NEW MODULE (H21). This answers the same
 * question `selectCapitalReach` answers — "how far does this book reach" —
 * one turn further down. A second module would be a second place where the
 * word ALL_DEVICES is decided, and the first one would stop being true.
 *
 * THE RULE THIS MUST NOT BREAK: an observed authority is NOT parity. The
 * table answering proves a shared record exists; it does not prove THIS book
 * is written to it. Step 2 below is therefore derived from the reach verdict,
 * never from the observation — so a reachable authority can never, by itself,
 * light up "your devices see this position".
 * ═════════════════════════════════════════════════════════════════════════ */

/** What this device actually learned by asking the authority route. */
export interface SharedAuthorityObservation {
  /**
   * UNOBSERVED is a first-class answer, not a loading spinner rendered as a
   * fact. Before the probe returns, WM knows nothing, and saying nothing is
   * different from saying no.
   */
  readonly status: "UNOBSERVED" | "SIGNED_OUT" | "OBSERVED";
  /** The authority the route named, or null when it named none. */
  readonly authority: string | null;
  /** The route's own sentence about why, passed through rather than rewritten. */
  readonly note: string | null;
}

export type ProgressState = "DONE" | "NOT_YET" | "UNOBSERVED";

export interface CrossDeviceStep {
  readonly label: string;
  readonly state: ProgressState;
  readonly detail: string;
}

export interface CrossDeviceProgress {
  readonly version: typeof CAPITAL_REACH_VERSION;
  readonly steps: readonly CrossDeviceStep[];
  /**
   * The one thing that has to happen next, in the founder's words, or null
   * when nothing is outstanding. This is the field that turns a dead end into
   * an instruction.
   */
  readonly nextDependency: string | null;
}

export function selectCrossDeviceProgress(
  verdict: CapitalReachVerdict,
  observation: SharedAuthorityObservation,
): CrossDeviceProgress {
  const authorityNamed =
    observation.status === "OBSERVED" &&
    observation.authority !== null &&
    observation.authority.trim() !== "";

  const authorityStep: CrossDeviceStep =
    observation.status === "UNOBSERVED"
      ? {
          label: "A shared record every device can read",
          state: "UNOBSERVED",
          detail: "WM has not asked yet.",
        }
      : observation.status === "SIGNED_OUT"
        ? {
            label: "A shared record every device can read",
            state: "UNOBSERVED",
            detail:
              "WM cannot check without a signed-in session — a shared book is per-trader, "
              + "so there is nothing to look up until WM knows whose book it is.",
          }
        : authorityNamed
          ? {
              label: "A shared record every device can read",
              state: "DONE",
              detail: `${observation.authority} answered on this device.`,
            }
          : {
              label: "A shared record every device can read",
              state: "NOT_YET",
              detail: observation.note ?? "The authority did not answer on this device.",
            };

  // DERIVED FROM THE REACH VERDICT, NEVER FROM THE OBSERVATION. See the header:
  // a reachable table does not mean this book is written to it.
  const bookStep: CrossDeviceStep =
    verdict.reach === "ALL_DEVICES"
      ? {
          label: "This book written to that record",
          state: "DONE",
          detail: "Every signed-in device projects the same position.",
        }
      : {
          label: "This book written to that record",
          state: "NOT_YET",
          detail:
            "This book is still held in this browser. Nothing here is written where "
            + "your phone could read it.",
        };

  const steps = [authorityStep, bookStep] as const;

  const nextDependency =
    authorityStep.state === "UNOBSERVED"
      ? null
      : authorityStep.state === "NOT_YET"
        ? "The shared position table has not been created on this database yet. "
          + "That is one migration, and it is the only thing standing between here "
          + "and your phone seeing this position."
        : bookStep.state === "NOT_YET"
          ? "The shared record exists. The paper book is not written to it yet — "
            + "that is the next build step, not a setting."
          : null;

  return { version: CAPITAL_REACH_VERSION, steps, nextDependency };
}
