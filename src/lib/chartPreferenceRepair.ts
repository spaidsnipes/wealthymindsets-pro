/**
 * A STORED PREFERENCE MUST MEAN THE TRADER CHOSE IT.
 *
 * ── THE DEFECT ──────────────────────────────────────────────────────────────
 *
 * `ChartsDashboard` persisted sixteen chart preferences with this shape:
 *
 *     const [x, setX] = useState(() => lsGet("wm_x", false));
 *     useEffect(() => { lsSet("wm_x", x); }, [x]);
 *
 * which reads correctly and is wrong in one specific way: `useEffect` RUNS ON
 * MOUNT. So the very first time anybody opened /charts, all sixteen effects
 * fired and wrote their fallback values into localStorage — before the trader
 * had touched a single control. From that moment the storage layer could no
 * longer tell "the trader switched this off" from "the trader has never seen
 * this control", because both are the literal `false`.
 *
 * ── WHY THIS IS WORSE THAN AN UNTIDY WRITE ──────────────────────────────────
 *
 * It silently voids every future change of default. `lsGet` prefers the stored
 * value, and the stored value is now always present, so a default is consulted
 * exactly once in a browser's lifetime — on a visit that already happened for
 * every existing user. A developer who changes a fallback from `false` to
 * `true`, runs the tests, sees them pass, deploys, and watches the serving site
 * not change is looking at this.
 *
 * That happened today. The absorption-anatomy default was flipped to ON in
 * a7cd8b2c for good reasons, the whole suite went green, it deployed — and it
 * was INERT for every browser that had ever loaded the page. A code change that
 * cannot reach a user is not a shipped change, and the only reason it was
 * caught is that somebody asked "what does this actually do in the Founder's
 * browser" instead of "do the tests pass".
 *
 * ── THE TWO PARTS OF THE FIX ────────────────────────────────────────────────
 *
 * 1. STOP INVENTING PREFERENCES. The persist effect now skips its first run, so
 *    a key is written only when a value actually CHANGES — i.e. only when the
 *    trader did something. That is the durable fix and it covers all sixteen
 *    keys. It does not repair the past: the keys are already written.
 *
 * 2. REPAIR THE ONE KEY WHOSE MEANING WE NEED BACK. This module. It runs once
 *    per browser, removes the polluted `wm_absorptionAnatomy` entry so the new
 *    default can finally be consulted, and leaves a stamp so it never runs
 *    again.
 *
 * ── THE COST, STATED PLAINLY ────────────────────────────────────────────────
 *
 * The mount-write destroyed the distinction it needed, so this repair CANNOT
 * tell a deliberate "off" from a never-touched "off". A trader who really had
 * switched absorption off loses that one choice, one time. They can switch it
 * off again and — because of part 1 — it will stick honestly from then on.
 *
 * That trade is worth making for exactly one key and is not a precedent. It is
 * scoped to `wm_absorptionAnatomy` on purpose: that is the only key whose
 * default changed, so it is the only key where the stored value is actively
 * suppressing a decision the product has since made. Every other preference
 * keeps whatever is stored. WIDENING THIS LIST IS NOT A FREE ACTION — each
 * addition silently discards a real trader choice, and needs its own reason.
 */

/** Bumped only if a future repair must run again on browsers already stamped. */
export const PREFERENCE_REPAIR_VERSION = 1;

/** The stamp proving this browser has already been repaired. */
export const PREFERENCE_REPAIR_KEY = "wm_prefRepair";

/**
 * The keys whose stored value is discarded once, so a changed default can be
 * consulted. See the cost note above before adding to this list.
 */
export const KEYS_TO_REPAIR: readonly string[] = ["wm_absorptionAnatomy"];

/**
 * Should the repair run in a browser carrying this stamp?
 *
 * Pure, so the decision is testable without a DOM. `stamp` is the raw string
 * read from storage, or null when absent.
 */
export function needsRepair(stamp: string | null): boolean {
  if (stamp == null) return true;
  // A stamp we cannot parse is treated as absent rather than as "done".
  // Failing toward running the repair once more is recoverable; failing toward
  // skipping it forever is the bug this module exists to end.
  const parsed = Number.parseInt(stamp, 10);
  if (!Number.isFinite(parsed)) return true;
  return parsed < PREFERENCE_REPAIR_VERSION;
}

/**
 * Run the one-time repair. Safe to call on every mount: it checks the stamp
 * first and does nothing once stamped. No-ops outside the browser.
 *
 * Returns the keys it actually removed, so a caller (or a test) can see what
 * happened rather than trusting that it happened.
 */
export function repairChartPreferences(): readonly string[] {
  if (typeof window === "undefined") return [];

  let stamp: string | null = null;
  try {
    stamp = window.localStorage.getItem(PREFERENCE_REPAIR_KEY);
  } catch {
    // Storage unavailable (private mode, blocked cookies). Nothing to repair
    // and nowhere to record that we tried — leave silently rather than throw
    // inside a render pass.
    return [];
  }

  if (!needsRepair(stamp)) return [];

  const removed: string[] = [];
  try {
    for (const key of KEYS_TO_REPAIR) {
      if (window.localStorage.getItem(key) != null) {
        window.localStorage.removeItem(key);
        removed.push(key);
      }
    }
    // Stamp LAST. If removal throws halfway, the browser stays unstamped and
    // the repair retries next load rather than recording a job it did not do.
    window.localStorage.setItem(
      PREFERENCE_REPAIR_KEY,
      String(PREFERENCE_REPAIR_VERSION),
    );
  } catch {
    return removed;
  }

  return removed;
}
