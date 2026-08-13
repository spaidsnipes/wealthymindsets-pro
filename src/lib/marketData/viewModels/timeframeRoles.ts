/**
 * timeframeRoles — M23. Timeframe Role Engine.
 *
 * Founder top-down workflow (2026-08-13):
 *
 *   HIGH TIMEFRAME      4H / Daily   → CONTEXT / DIRECTION
 *   MID TIMEFRAME       1H / 15m     → DESTINATION
 *   LOW TIMEFRAME       5m / 2m      → LOCATION
 *   VERY LOW TF / TAPE  1m / tape    → RESPONSE / TRIGGER
 *
 * WM understands WHY a trader is looking at each timeframe. The UI can
 * then visually reinforce roles instead of showing four identical charts.
 *
 * Roles are RELATIVE to the trader's chosen anchor timeframe, not fixed
 * to absolute intervals — a swing trader's "low" is a scalper's "high".
 */

export type TimeframeRole = "CONTEXT" | "DESTINATION" | "LOCATION" | "RESPONSE";

export interface TimeframeSpec {
  /** Canonical timeframe id as used by the chart ("1m","2m","5m","15m","1h","4h","1D","1W"). */
  readonly id: string;
  /** Interval in seconds — the sort key. */
  readonly seconds: number;
  readonly label: string;
}

/** Canonical WM timeframe ladder, ascending. */
export const TIMEFRAME_LADDER: readonly TimeframeSpec[] = [
  { id: "1m",  seconds: 60,      label: "1 minute"  },
  { id: "2m",  seconds: 120,     label: "2 minute"  },
  { id: "5m",  seconds: 300,     label: "5 minute"  },
  { id: "15m", seconds: 900,     label: "15 minute" },
  { id: "30m", seconds: 1800,    label: "30 minute" },
  { id: "1h",  seconds: 3600,    label: "1 hour"    },
  { id: "4h",  seconds: 14400,   label: "4 hour"    },
  { id: "1D",  seconds: 86400,   label: "Daily"     },
  { id: "1W",  seconds: 604800,  label: "Weekly"    },
  { id: "1M",  seconds: 2592000, label: "Monthly"   },
];

export const ROLE_PURPOSE: Record<TimeframeRole, { question: string; uses: readonly string[] }> = {
  CONTEXT: {
    question: "Which way is the larger auction leaning?",
    uses: ["Keltner orientation", "20 EMA relationship", "market model classification", "external structure"],
  },
  DESTINATION: {
    question: "Where is price trying to go?",
    uses: ["Volume Profile", "POC / VAH / VAL", "HVN / LVN", "value migration", "prior structure", "liquidity"],
  },
  LOCATION: {
    question: "Is this a good place to act?",
    uses: ["lower-timeframe model", "HVN / LVN", "order blocks", "structure", "wicks"],
  },
  RESPONSE: {
    question: "Is price actually responding?",
    uses: ["CVD", "Delta", "tape speed", "aggressor evidence", "displacement", "absorption"],
  },
};

export interface TimeframeRoleAssignment {
  readonly timeframe: TimeframeSpec;
  readonly role: TimeframeRole;
  readonly isAnchor: boolean;
  readonly question: string;
  readonly uses: readonly string[];
  /** Steps away from the anchor on the ladder (negative = lower). */
  readonly ladderOffset: number;
}

export interface TimeframeRoleMap {
  readonly anchor: TimeframeSpec;
  readonly assignments: readonly TimeframeRoleAssignment[];
  readonly byRole: Readonly<Record<TimeframeRole, TimeframeSpec | null>>;
  readonly reason?: string;
}

/**
 * Assign roles relative to an anchor timeframe.
 *
 * Convention (matches the Founder's TSLA workflow where anchor = 15m):
 *   anchor + 3 steps → CONTEXT      (15m → 4h)
 *   anchor + 1 step  → DESTINATION  (15m → 30m..1h)
 *   anchor           → LOCATION     (15m)
 *   anchor - 2 steps → RESPONSE     (15m → 2m..1m)
 *
 * The offsets are clamped to the ladder bounds. When a role cannot be
 * satisfied (anchor at an extreme), that role maps to null and the
 * reason explains why — never silently reuses the anchor.
 */
export function assignTimeframeRoles(
  anchorId: string,
  ladder: readonly TimeframeSpec[] = TIMEFRAME_LADDER,
): TimeframeRoleMap {
  const anchorIdx = ladder.findIndex((t) => t.id === anchorId);
  if (anchorIdx === -1) {
    const fallback = ladder[Math.floor(ladder.length / 2)];
    return {
      anchor: fallback,
      assignments: [],
      byRole: { CONTEXT: null, DESTINATION: null, LOCATION: null, RESPONSE: null },
      reason: `Anchor timeframe "${anchorId}" is not on the ladder — cannot assign roles`,
    };
  }

  const anchor = ladder[anchorIdx];
  const OFFSETS: Record<TimeframeRole, number> = {
    CONTEXT: 3,
    DESTINATION: 1,
    LOCATION: 0,
    RESPONSE: -2,
  };

  const assignments: TimeframeRoleAssignment[] = [];
  const byRole: Record<TimeframeRole, TimeframeSpec | null> = {
    CONTEXT: null, DESTINATION: null, LOCATION: null, RESPONSE: null,
  };
  const unavailable: string[] = [];

  for (const role of Object.keys(OFFSETS) as TimeframeRole[]) {
    const targetIdx = anchorIdx + OFFSETS[role];
    if (targetIdx < 0 || targetIdx >= ladder.length) {
      unavailable.push(`${role} (would need ${OFFSETS[role] > 0 ? "higher" : "lower"} than the ladder allows)`);
      continue;
    }
    const tf = ladder[targetIdx];
    byRole[role] = tf;
    assignments.push({
      timeframe: tf,
      role,
      isAnchor: targetIdx === anchorIdx,
      question: ROLE_PURPOSE[role].question,
      uses: ROLE_PURPOSE[role].uses,
      ladderOffset: OFFSETS[role],
    });
  }

  return {
    anchor,
    assignments: assignments.sort((a, b) => b.timeframe.seconds - a.timeframe.seconds),
    byRole,
    reason: unavailable.length > 0
      ? `Roles unavailable at this anchor: ${unavailable.join("; ")}`
      : undefined,
  };
}

/**
 * Given an arbitrary timeframe and an anchor, what role does it play?
 * Used by the chart header to label the timeframe the user just clicked.
 */
export function roleForTimeframe(
  timeframeId: string,
  anchorId: string,
  ladder: readonly TimeframeSpec[] = TIMEFRAME_LADDER,
): { role: TimeframeRole | null; reason?: string } {
  const map = assignTimeframeRoles(anchorId, ladder);
  const hit = map.assignments.find((a) => a.timeframe.id === timeframeId);
  if (hit) return { role: hit.role };

  const tfIdx = ladder.findIndex((t) => t.id === timeframeId);
  const anchorIdx = ladder.findIndex((t) => t.id === anchorId);
  if (tfIdx === -1 || anchorIdx === -1) {
    return { role: null, reason: "Timeframe or anchor is not on the ladder" };
  }
  const offset = tfIdx - anchorIdx;
  // Nearest role by offset — but say so honestly
  if (offset >= 3)  return { role: "CONTEXT",     reason: `${offset} steps above anchor — treated as context` };
  if (offset >= 1)  return { role: "DESTINATION", reason: `${offset} step(s) above anchor — treated as destination` };
  if (offset === 0) return { role: "LOCATION" };
  if (offset >= -2) return { role: "RESPONSE",    reason: `${Math.abs(offset)} step(s) below anchor — treated as response` };
  return { role: "RESPONSE", reason: `${Math.abs(offset)} steps below anchor — far below the response band; readings may be noise` };
}
