/**
 * PROP EVALUATION — the arithmetic of a funded-account evaluation (Founder order §7, 2026-10-09). PURE.
 *
 * A desk inside the Journal for ONE person's own evaluation account. It is not a market brain and
 * not a forecast: it does the rule arithmetic a firm's dashboard does, from numbers the trader types
 * in, and says plainly what it cannot know.
 *
 * LAWS
 *   · MONEY IS INTEGER CENTS. A required profit is rounded UP to the cent (a rule met by rounding
 *     down is a rule not met).
 *   · NOTHING IS DIVIDED BY A NET THAT IS NOT ABOVE ZERO. The best-day share is then UNDEFINED, said.
 *   · A TRAILING DRAWDOWN FLOOR IS NEVER GUESSED. Headroom is read only from a floor the trader gives,
 *     or — for a STATIC drawdown — from starting balance minus the maximum drawdown. Otherwise UNKNOWN.
 *   · EVERY INPUT IS UNVERIFIED until the trader stamps "read back from the firm's dashboard"
 *     (`verifiedAtMs`). A verdict over unverified inputs is "cannot say", never "satisfies".
 *   · SCENARIOS ARE ILLUSTRATIVE ARITHMETIC, NOT A TARGET. No amount here is something to make on any
 *     day, and nothing promises that an evaluation will be passed.
 *
 * THE CONSISTENCY RULE (as firms state it): the largest profitable day may be at most `limit` of the
 * total net profit. So the net profit REQUIRED is the larger of the original target and
 * largest ÷ limit — a new best day raises the requirement.
 *
 * No IO, no clock, no storage. No account numbers and no balances live in this file.
 */

export type Cents = number;

export const DRAWDOWN_METHODS = ["INTRADAY_TRAILING", "END_OF_DAY_TRAILING", "STATIC", "UNKNOWN"] as const;
export type DrawdownMethod = (typeof DRAWDOWN_METHODS)[number];
export const DRAWDOWN_METHOD_LABEL: Readonly<Record<DrawdownMethod, string>> = {
  INTRADAY_TRAILING: "Intraday trailing",
  END_OF_DAY_TRAILING: "End-of-day trailing",
  STATIC: "Static",
  UNKNOWN: "Not known yet",
};

export const DEFAULT_CONSISTENCY_LIMIT = 0.3;
export const PROP_SCENARIO_LABEL = "ILLUSTRATIVE ARITHMETIC — NOT A TARGET";
export const PROP_DEVICE_LINE = "Kept on this device only.";
export const PROP_UNVERIFIED = "UNVERIFIED";
export const PROP_VERIFY_ACTION = "Read back from the firm's dashboard";

export interface PropDay {
  /** The trader's own date for the day, as typed (YYYY-MM-DD). */
  readonly date: string;
  readonly netCents: Cents;
}

export interface PropInputs {
  readonly nickname: string;
  readonly firm: string;
  readonly program: string;
  readonly startingBalanceCents: Cents | null;
  readonly currentBalanceCents: Cents | null;
  readonly profitTargetCents: Cents | null;
  /** Largest profitable day ÷ net profit may be at most this (0 < limit ≤ 1). */
  readonly consistencyLimit: number;
  readonly days: readonly PropDay[];
  /**
   * Where the daily list came from when it was read from a file ("imported file · <name> · as of <time> · …"),
   * shown beside the list; null / absent when the trader typed the days. A hand edit of a day clears it.
   */
  readonly daysSource?: string | null;
  readonly maxDrawdownCents: Cents | null;
  readonly drawdownMethod: DrawdownMethod;
  /** The floor the firm's dashboard shows right now, when the trader has read it. */
  readonly drawdownFloorCents: Cents | null;
  readonly contractLimit: number | null;
  readonly minTradingDays: number | null;
  /** Optional commissions per traded day; when given, the daily results are taken as BEFORE commissions. */
  readonly commissionsPerDayCents: Cents | null;
  /** When the trader stamped the inputs as read back from the firm's dashboard; null = UNVERIFIED. */
  readonly verifiedAtMs: number | null;
}

export const EMPTY_PROP_INPUTS: PropInputs = {
  nickname: "", firm: "", program: "",
  startingBalanceCents: null, currentBalanceCents: null, profitTargetCents: null,
  consistencyLimit: DEFAULT_CONSISTENCY_LIMIT, days: [],
  maxDrawdownCents: null, drawdownMethod: "UNKNOWN", drawdownFloorCents: null,
  contractLimit: null, minTradingDays: null, commissionsPerDayCents: null, verifiedAtMs: null,
};

/* ── money ─────────────────────────────────────────────────────────────────── */

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);

/** "1,000.50" / "-250" / "$3,333.34" → integer cents, or null when it is not a plain money amount. */
export function parseMoneyToCents(raw: string): Cents | null {
  const s = raw.trim().replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  if (!/^[-+]?(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(s)) return null;
  const neg = s.startsWith("-");
  const [whole, frac = ""] = s.replace(/^[-+]/, "").split(".");
  const cents = Number(whole || "0") * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents)) return null;
  return neg ? -cents : cents;
}

/** Integer cents → "$3,333.34" / "−$250.00". */
export function formatCents(c: Cents): string {
  const a = Math.abs(c);
  const whole = Math.floor(a / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${c < 0 ? "−" : ""}$${whole}.${String(a % 100).padStart(2, "0")}`;
}

/** The limit as parts per million, so every division is integer arithmetic. Null when unusable. */
function limitPpm(limit: number): number | null {
  if (!Number.isFinite(limit) || limit <= 0 || limit > 1) return null;
  return Math.round(limit * 1_000_000);
}

/** ceil(amount ÷ limit) in cents — the net profit at which `amount` is exactly `limit` of it, rounded UP. */
export function requiredForLargestCents(largestCents: Cents, limit: number): Cents | null {
  const ppm = limitPpm(limit);
  if (ppm === null || !isInt(largestCents) || largestCents <= 0) return null;
  return Math.ceil((largestCents * 1_000_000) / ppm);
}

/* ── the reading ───────────────────────────────────────────────────────────── */

export type Known<T> = { readonly known: true; readonly value: T } | { readonly known: false; readonly why: string };
const known = <T,>(value: T): Known<T> => ({ known: true, value });
const unknown = <T,>(why: string): Known<T> => ({ known: false, why });

export interface PropReading {
  readonly verified: boolean;
  /** What the net profit was read from. */
  readonly netBasis: "BALANCES" | "DAILY_RESULTS" | "NONE";
  readonly netProfitCents: Known<Cents>;
  /** Sum of the daily results as typed. */
  readonly daysSumCents: Cents;
  readonly feesCents: Cents;
  /** Balance-based net minus the daily results after fees, when both exist — a gap means a missing day or fee. */
  readonly balanceVsDaysGapCents: Cents | null;
  readonly daysTraded: number;
  /** The largest PROFITABLE day; 0 when no day was profitable. */
  readonly largestDayCents: Cents;
  readonly largestDayDate: string | null;
  /** largest ÷ net profit, 0–1+, or why it is undefined. */
  readonly bestDayShare: Known<number>;
  /** max(original target, largest ÷ limit), rounded UP to the cent. */
  readonly requiredNetProfitCents: Known<Cents>;
  /** The part of the requirement that comes from the consistency rule alone (largest ÷ limit). */
  readonly requiredByConsistencyCents: Cents | null;
  /** True when the consistency rule, not the original target, sets the requirement. */
  readonly targetRaisedByBestDay: boolean;
  readonly remainingCents: Known<Cents>;
  readonly drawdownFloorCents: Known<Cents>;
  readonly drawdownHeadroomCents: Known<Cents>;
  readonly minDaysRemaining: Known<number>;
  /**
   * The smallest number of further profitable days that can meet the requirement IF NO FUTURE DAY
   * EXCEEDS THE CURRENT LARGEST (so the requirement does not rise). Arithmetic only — not a plan.
   */
  readonly minimumFurtherProfitableDays: Known<number>;
  /** The smallest number of further days under ANY plan (a new, larger best day allowed — it raises the requirement). */
  readonly minimumFurtherDaysAnyPlan: Known<number>;
}

function largestProfitableDay(days: readonly PropDay[]): { cents: Cents; date: string | null } {
  let cents = 0; let date: string | null = null;
  for (const d of days) if (isInt(d.netCents) && d.netCents > cents) { cents = d.netCents; date = d.date; }
  return { cents, date };
}

/**
 * Is there ANY set of `n` further days that meets both the target and the consistency rule?
 *   A — no day above the current largest L: n·L must cover what remains of max(T, L ÷ limit);
 *   B — a new best day x > L: every future day ≤ x, total N + n·x must reach max(T, x ÷ limit).
 * Real arithmetic on cents; `limit` is the rule's own fraction.
 */
function feasibleIn(n: number, netCents: Cents, largestCents: Cents, targetCents: Cents, limit: number): boolean {
  if (n <= 0) return false;
  // A: no day above the current largest.
  if (largestCents > 0) {
    const reqA = Math.max(targetCents, requiredForLargestCents(largestCents, limit) ?? targetCents);
    if (netCents + n * largestCents >= reqA) return true;
  }
  // B: a new best day x > L. The share rule N + n·x ≥ x ÷ limit  ⇔  x·(1/limit − n) ≤ N.
  const k = 1 / limit - n;
  if (k < -1e-9) return true;                 // more days than 1/limit: equal days of any size keep the share under the limit
  if (k <= 1e-9) return netCents >= 0;        // exactly 1/limit days: equal days work only when the net so far is not negative
  if (netCents <= 0) return false;
  const xMax = netCents / k;
  return xMax > Math.max(largestCents, 0) && netCents + n * xMax >= targetCents;
}

export function readPropEvaluation(x: PropInputs): PropReading {
  const days = x.days.filter(d => isInt(d.netCents));
  const daysSumCents = days.reduce((s, d) => s + d.netCents, 0);
  const daysTraded = days.length;
  const feesCents = isInt(x.commissionsPerDayCents) && x.commissionsPerDayCents! > 0 ? x.commissionsPerDayCents! * daysTraded : 0;
  const byBalances = isInt(x.startingBalanceCents) && isInt(x.currentBalanceCents) ? x.currentBalanceCents! - x.startingBalanceCents! : null;
  const byDays = daysTraded ? daysSumCents - feesCents : null;
  const netBasis: PropReading["netBasis"] = byBalances !== null ? "BALANCES" : byDays !== null ? "DAILY_RESULTS" : "NONE";
  const net = byBalances ?? byDays;
  const netProfitCents: Known<Cents> = net === null ? unknown("Enter the starting and current balance, or the daily results.") : known(net);
  const { cents: largestDayCents, date: largestDayDate } = largestProfitableDay(days);

  const bestDayShare: Known<number> =
    net === null ? unknown("No net profit to compare with yet.")
    : !daysTraded ? unknown("Enter the daily results to find the largest day.")
    : net <= 0 ? unknown("Undefined — the net profit is not above zero, so there is nothing to take a share of.")
    : known(largestDayCents / net);

  const ppm = limitPpm(x.consistencyLimit);
  const requiredByConsistencyCents = ppm === null ? null : requiredForLargestCents(largestDayCents, x.consistencyLimit) ?? 0;
  const target = isInt(x.profitTargetCents) && x.profitTargetCents! > 0 ? x.profitTargetCents! : null;
  const requiredNetProfitCents: Known<Cents> =
    ppm === null ? unknown("The consistency limit must be above 0 and at most 1 (0.30 means 30%).")
    : target === null && !requiredByConsistencyCents ? unknown("Enter the original profit target.")
    : known(Math.max(target ?? 0, requiredByConsistencyCents ?? 0));
  const targetRaisedByBestDay = requiredNetProfitCents.known && target !== null && (requiredByConsistencyCents ?? 0) > target;
  const remainingCents: Known<Cents> =
    !requiredNetProfitCents.known ? unknown(requiredNetProfitCents.why)
    : net === null ? unknown("No net profit yet.")
    : known(Math.max(0, requiredNetProfitCents.value - net));

  // Drawdown: a floor the trader read, or the STATIC arithmetic. A trailing floor is never guessed.
  const drawdownFloorCents: Known<Cents> =
    isInt(x.drawdownFloorCents) ? known(x.drawdownFloorCents!)
    : x.drawdownMethod === "STATIC" && isInt(x.startingBalanceCents) && isInt(x.maxDrawdownCents) ? known(x.startingBalanceCents! - x.maxDrawdownCents!)
    : x.drawdownMethod === "UNKNOWN" ? unknown("UNKNOWN — the drawdown method is not known yet.")
    : x.drawdownMethod === "STATIC" ? unknown("UNKNOWN — a static floor needs the starting balance and the maximum drawdown.")
    : unknown("UNKNOWN — a trailing floor moves with the account; enter the floor the firm's dashboard shows. It is not guessed here.");
  const drawdownHeadroomCents: Known<Cents> =
    !drawdownFloorCents.known ? unknown(drawdownFloorCents.why)
    : !isInt(x.currentBalanceCents) ? unknown("UNKNOWN — enter the current balance.")
    : known(x.currentBalanceCents! - drawdownFloorCents.value);

  const minDaysRemaining: Known<number> =
    isInt(x.minTradingDays) && x.minTradingDays! >= 0 ? known(Math.max(0, x.minTradingDays! - daysTraded)) : unknown("The minimum number of trading days is not entered.");

  let minimumFurtherProfitableDays: Known<number>;
  let minimumFurtherDaysAnyPlan: Known<number>;
  if (!remainingCents.known || net === null || !requiredNetProfitCents.known) {
    minimumFurtherProfitableDays = unknown(!remainingCents.known ? remainingCents.why : "No net profit yet.");
    minimumFurtherDaysAnyPlan = minimumFurtherProfitableDays;
  } else {
    minimumFurtherProfitableDays =
      remainingCents.value === 0 ? known(0)
      : largestDayCents > 0 ? known(Math.ceil(remainingCents.value / largestDayCents))
      : unknown("No profitable day yet — any further profitable day becomes the largest, so this count does not apply.");
    const T = target ?? requiredNetProfitCents.value;
    let any: number | null = null;
    for (let n = 0; n <= 400 && any === null; n++) {
      if (n === 0 ? remainingCents.value === 0 : feasibleIn(n, net, largestDayCents, T, x.consistencyLimit)) any = n;
    }
    minimumFurtherDaysAnyPlan = any === null ? unknown("No number of further days up to 400 meets the rule from here.") : known(any);
  }

  return {
    verified: x.verifiedAtMs !== null, netBasis, netProfitCents, daysSumCents, feesCents,
    balanceVsDaysGapCents: byBalances !== null && byDays !== null ? byBalances - byDays : null,
    daysTraded, largestDayCents, largestDayDate, bestDayShare, requiredNetProfitCents, requiredByConsistencyCents, targetRaisedByBestDay,
    remainingCents, drawdownFloorCents, drawdownHeadroomCents, minDaysRemaining, minimumFurtherProfitableDays, minimumFurtherDaysAnyPlan,
  };
}

/** Can the requirement be met in exactly `days` further days? Arithmetic only. */
export type PlanDays = "POSSIBLE" | "IMPOSSIBLE" | "CANNOT_SAY";
export function planDaysVerdict(x: PropInputs, days: number): { readonly verdict: PlanDays; readonly words: string } {
  const r = readPropEvaluation(x);
  if (!Number.isInteger(days) || days < 0) return { verdict: "CANNOT_SAY", words: "Enter a whole number of days." };
  if (!r.minimumFurtherDaysAnyPlan.known) return { verdict: "CANNOT_SAY", words: r.minimumFurtherDaysAnyPlan.why };
  const floorDays = Math.max(r.minimumFurtherDaysAnyPlan.value, r.minDaysRemaining.known ? r.minDaysRemaining.value : 0);
  if (days < floorDays) {
    return { verdict: "IMPOSSIBLE", words: `IMPOSSIBLE in ${days} further day${days === 1 ? "" : "s"} — the rule arithmetic needs at least ${floorDays}. This is arithmetic, not a plan.` };
  }
  return { verdict: "POSSIBLE", words: `Arithmetically possible in ${days} further day${days === 1 ? "" : "s"} (at least ${floorDays} are needed). This is arithmetic, not a plan and not a promise.` };
}

/* ── the scenario lab ──────────────────────────────────────────────────────── */

export type ConditionState = "MET" | "NOT_MET" | "CANNOT_SAY";
export interface PropCondition {
  readonly id: "TARGET" | "CONSISTENCY" | "DRAWDOWN" | "MIN_DAYS";
  readonly label: string;
  readonly state: ConditionState;
  readonly words: string;
}

export interface PropScenario {
  readonly label: typeof PROP_SCENARIO_LABEL;
  readonly rows: number;
  readonly rowsSumCents: Cents;
  readonly feesCents: Cents;
  /** The account's reading before the illustrative rows. */
  readonly before: PropReading;
  /** The reading with the illustrative rows added as further days. */
  readonly after: PropReading;
  /** A row became the new largest day — the requirement rose. */
  readonly newBestDay: boolean;
  readonly requiredRoseByCents: Cents | null;
  /** The lowest balance the rows would pass through, when a current balance is known. */
  readonly lowestBalanceCents: Cents | null;
  readonly conditions: readonly PropCondition[];
  readonly verdict: "SATISFIES_VERIFIED" | "DOES_NOT" | "CANNOT_SAY";
  readonly verdictLine: string;
}

/**
 * The account with illustrative rows added as further days (profits and losses, in order). The rows
 * are the trader's own what-if numbers; nothing here suggests one.
 */
export function readPropScenario(x: PropInputs, rowsCents: readonly Cents[]): PropScenario {
  const rows = rowsCents.filter(isInt);
  const before = readPropEvaluation(x);
  const rowsSumCents = rows.reduce((s, v) => s + v, 0);
  const perDay = isInt(x.commissionsPerDayCents) && x.commissionsPerDayCents! > 0 ? x.commissionsPerDayCents! : 0;
  const feesCents = perDay * rows.length;
  const after = readPropEvaluation({
    ...x,
    days: [...x.days, ...rows.map((netCents, i) => ({ date: `scenario day ${i + 1}`, netCents }))],
    currentBalanceCents: isInt(x.currentBalanceCents) ? x.currentBalanceCents! + rowsSumCents - feesCents : x.currentBalanceCents,
    // A floor read from the dashboard is the floor NOW; for a trailing method it would move, so it is not carried forward.
    drawdownFloorCents: x.drawdownMethod === "STATIC" ? x.drawdownFloorCents : null,
  });
  const newBestDay = after.largestDayCents > before.largestDayCents && rows.some(v => v === after.largestDayCents);
  const requiredRoseByCents = before.requiredNetProfitCents.known && after.requiredNetProfitCents.known
    ? Math.max(0, after.requiredNetProfitCents.value - before.requiredNetProfitCents.value) : null;
  let lowestBalanceCents: Cents | null = null;
  if (isInt(x.currentBalanceCents)) {
    let bal = x.currentBalanceCents!; lowestBalanceCents = bal;
    for (const v of rows) { bal += v - perDay; if (bal < lowestBalanceCents) lowestBalanceCents = bal; }
  }

  const conditions: PropCondition[] = [];
  const target = isInt(x.profitTargetCents) && x.profitTargetCents! > 0 ? x.profitTargetCents! : null;
  const net = after.netProfitCents.known ? after.netProfitCents.value : null;
  conditions.push(
    target === null || net === null
      ? { id: "TARGET", label: "Original profit target", state: "CANNOT_SAY", words: target === null ? "cannot say — the original profit target is not entered" : "cannot say — no net profit to compare" }
      : net >= target
        ? { id: "TARGET", label: "Original profit target", state: "MET", words: `net ${formatCents(net)} is at or above the target ${formatCents(target)}` }
        : { id: "TARGET", label: "Original profit target", state: "NOT_MET", words: `net ${formatCents(net)} is below the target ${formatCents(target)}` },
  );
  const byC = after.requiredByConsistencyCents;
  conditions.push(
    net === null || byC === null
      ? { id: "CONSISTENCY", label: "Consistency rule", state: "CANNOT_SAY", words: byC === null ? "cannot say — the consistency limit is not usable" : "cannot say — no net profit to compare" }
      : after.largestDayCents === 0
        ? { id: "CONSISTENCY", label: "Consistency rule", state: "CANNOT_SAY", words: "cannot say — no profitable day in these numbers" }
        : net >= byC
          ? { id: "CONSISTENCY", label: "Consistency rule", state: "MET", words: `largest day ${formatCents(after.largestDayCents)} is within ${pct(x.consistencyLimit)} of net ${formatCents(net)}` }
          : { id: "CONSISTENCY", label: "Consistency rule", state: "NOT_MET", words: `largest day ${formatCents(after.largestDayCents)} is more than ${pct(x.consistencyLimit)} of net ${formatCents(net)} — net must reach ${formatCents(byC)}` },
  );
  const staticFloor = x.drawdownMethod === "STATIC" && after.drawdownFloorCents.known ? after.drawdownFloorCents.value : null;
  conditions.push(
    x.drawdownMethod === "UNKNOWN"
      ? { id: "DRAWDOWN", label: "Drawdown", state: "CANNOT_SAY", words: "cannot say — the drawdown method is not known" }
      : x.drawdownMethod !== "STATIC"
        ? { id: "DRAWDOWN", label: "Drawdown", state: "CANNOT_SAY", words: "cannot say — a trailing floor moves as the balance moves; these rows are not run against a guessed floor" }
        : staticFloor === null || lowestBalanceCents === null
          ? { id: "DRAWDOWN", label: "Drawdown", state: "CANNOT_SAY", words: "cannot say — a static floor needs the starting balance, the maximum drawdown and the current balance" }
          : lowestBalanceCents > staticFloor
            ? { id: "DRAWDOWN", label: "Drawdown", state: "MET", words: `the lowest balance on these rows, ${formatCents(lowestBalanceCents)}, stays above the static floor ${formatCents(staticFloor)} (end-of-day figures only; moves inside a day are not in these numbers)` }
            : { id: "DRAWDOWN", label: "Drawdown", state: "NOT_MET", words: `the balance would reach ${formatCents(lowestBalanceCents)}, at or below the static floor ${formatCents(staticFloor)}` },
  );
  conditions.push(
    !after.minDaysRemaining.known
      ? { id: "MIN_DAYS", label: "Minimum trading days", state: "CANNOT_SAY", words: "cannot say — the minimum number of trading days is not entered" }
      : after.minDaysRemaining.value === 0
        ? { id: "MIN_DAYS", label: "Minimum trading days", state: "MET", words: `${after.daysTraded} days traded, minimum ${x.minTradingDays}` }
        : { id: "MIN_DAYS", label: "Minimum trading days", state: "NOT_MET", words: `${after.daysTraded} days traded, minimum ${x.minTradingDays} — ${after.minDaysRemaining.value} more needed` },
  );

  const failed = conditions.find(c => c.state === "NOT_MET");
  const unsaid = conditions.find(c => c.state === "CANNOT_SAY");
  const verdict: PropScenario["verdict"] = failed ? "DOES_NOT" : !before.verified || unsaid ? "CANNOT_SAY" : "SATISFIES_VERIFIED";
  const verdictLine =
    failed ? `These numbers do not satisfy the rules as entered — ${failed.label.toLowerCase()}: ${failed.words}.`
    : !before.verified ? `Cannot say — the rules are ${PROP_UNVERIFIED}. Stamp them as read back from the firm's dashboard first.`
    : unsaid ? `Cannot say — ${unsaid.label.toLowerCase()}: ${unsaid.words.replace(/^cannot say — /, "")}.`
    : "These numbers satisfy every VERIFIED condition entered here. The firm's own dashboard decides; this is arithmetic.";
  return { label: PROP_SCENARIO_LABEL, rows: rows.length, rowsSumCents, feesCents, before, after, newBestDay, requiredRoseByCents, lowestBalanceCents, conditions, verdict, verdictLine };
}

export const pct = (fraction: number): string => `${(Math.round(fraction * 1000) / 10).toString().replace(/\.0$/, "")}%`;

/* ── storage shape (the desk reads and writes it; this module only validates) ─ */

export const PROP_STORAGE_KIND = "WM_PROP_EVALUATION" as const;
export interface PropStored {
  readonly kind: typeof PROP_STORAGE_KIND;
  readonly version: 1;
  readonly inputs: PropInputs;
  /** The scenario lab's illustrative rows, kept apart from the account's own days. */
  readonly scenarioRowsCents: readonly Cents[];
}

const centsOrNull = (v: unknown): Cents | null => (isInt(v) && Math.abs(v as number) <= 1e13 ? (v as number) : null);
const text = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");

/** A stored desk, or null. Anything malformed is dropped whole — never half a record. */
export function readPropStored(raw: unknown): PropStored | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.kind !== PROP_STORAGE_KIND || o.version !== 1 || !o.inputs || typeof o.inputs !== "object") return null;
  const i = o.inputs as Record<string, unknown>;
  if (!Array.isArray(i.days) || i.days.length > 400 || !Array.isArray(o.scenarioRowsCents) || o.scenarioRowsCents.length > 60) return null;
  const days: PropDay[] = [];
  for (const d of i.days) {
    if (!d || typeof d !== "object") return null;
    const r = d as Record<string, unknown>;
    if (typeof r.date !== "string" || !isInt(r.netCents)) return null;
    days.push({ date: r.date.slice(0, 20), netCents: r.netCents as number });
  }
  if (!o.scenarioRowsCents.every(isInt)) return null;
  const limit = typeof i.consistencyLimit === "number" && limitPpm(i.consistencyLimit) !== null ? i.consistencyLimit : DEFAULT_CONSISTENCY_LIMIT;
  const method = (DRAWDOWN_METHODS as readonly unknown[]).includes(i.drawdownMethod) ? (i.drawdownMethod as DrawdownMethod) : "UNKNOWN";
  const count = (v: unknown) => (isInt(v) && (v as number) >= 0 && (v as number) <= 10_000 ? (v as number) : null);
  return {
    kind: PROP_STORAGE_KIND, version: 1,
    inputs: {
      nickname: text(i.nickname, 40), firm: text(i.firm, 60), program: text(i.program, 60),
      startingBalanceCents: centsOrNull(i.startingBalanceCents), currentBalanceCents: centsOrNull(i.currentBalanceCents), profitTargetCents: centsOrNull(i.profitTargetCents),
      consistencyLimit: limit, days,
      ...(typeof i.daysSource === "string" && i.daysSource ? { daysSource: i.daysSource.slice(0, 240) } : {}),
      maxDrawdownCents: centsOrNull(i.maxDrawdownCents), drawdownMethod: method, drawdownFloorCents: centsOrNull(i.drawdownFloorCents),
      contractLimit: count(i.contractLimit), minTradingDays: count(i.minTradingDays), commissionsPerDayCents: centsOrNull(i.commissionsPerDayCents),
      verifiedAtMs: typeof i.verifiedAtMs === "number" && Number.isFinite(i.verifiedAtMs) ? i.verifiedAtMs : null,
    },
    scenarioRowsCents: o.scenarioRowsCents as number[],
  };
}

/** Changing any input makes the whole account UNVERIFIED again — a stamp covers exactly what was read. */
export function editInputs(prev: PropInputs, patch: Partial<Omit<PropInputs, "verifiedAtMs">>): PropInputs {
  return { ...prev, ...patch, verifiedAtMs: null };
}

/** The stamp: the trader says these inputs were read back from the firm's dashboard at `nowMs`. */
export function stampVerified(prev: PropInputs, nowMs: number): PropInputs {
  return { ...prev, verifiedAtMs: nowMs };
}

/** A synthetic account for the proof scene and tests — round sample numbers, no one's account. */
export function propSampleInputs(): PropInputs {
  return {
    nickname: "SAMPLE", firm: "Sample Firm", program: "Sample 50K evaluation",
    startingBalanceCents: 5_000_000, currentBalanceCents: 5_100_000, profitTargetCents: 300_000,
    consistencyLimit: DEFAULT_CONSISTENCY_LIMIT,
    days: [{ date: "2026-01-05", netCents: 100_000 }, { date: "2026-01-06", netCents: -25_000 }, { date: "2026-01-07", netCents: 25_000 }],
    maxDrawdownCents: 200_000, drawdownMethod: "END_OF_DAY_TRAILING", drawdownFloorCents: null,
    contractLimit: 5, minTradingDays: 5, commissionsPerDayCents: null, verifiedAtMs: null,
  };
}
