/**
 * THE QUESTION LENS — one active question, asked of the camera itself.
 *
 * Child: QUESTION LENS (evidence question + measured debt + noise quieted).
 * Parent: F13 Semantic Zoom / Question Lenses; F16 Evidence Debt. Class:
 * LENS. House surface: /charts — "Questions reorganize emphasis without
 * routing away." Plates: the Founder's "IS BUYER EFFORT BEING ABSORBED?" and
 * "Question-Driven Mode" mockups (2026-09-24).
 *
 * The question machinery used to live on the Command Deck — a second market.
 * This compiles the question FROM THE CAMERA'S OWN READINGS, so asking it
 * never leaves the chart and never mints a second truth:
 *
 *   newest ABSORPTION zone  → "Is effort being absorbed at <zone>?"
 *   newest EXHAUSTION mark  → "Is this push exhausted at <price>?"
 *   (whichever ended later wins; none → no question, nothing quieted)
 *
 * Side is named ONLY on a delta basis: on VOLUME the tape never said who the
 * aggressor was, so the question says "effort", not "buyer effort".
 *
 * ── THE DEBT IS MEASURED, ITEM BY ITEM ─────────────────────────────────────
 *
 * Absorption question (the plate's own four "MISSING" rows):
 *   CLEAR DISPLACEMENT   — after the zone, price moved ≥ 2 median bar ranges
 *                          away from it.
 *   SUSTAINED AGGRESSION — effort after the zone stayed ≥ the zone's own
 *                          mean effort (the pressure did not vanish).
 *                          Worded SUSTAINED EFFORT on a VOLUME basis: volume
 *                          is effort, but nothing on that tape says it was
 *                          aggressive (initiated), so the word may not either.
 *   STRUCTURE CONFIRMATION — a confirmed swing pivot formed after the zone,
 *                          at a price inside the zone band.
 *   VOLUME ACCEPTANCE    — the Living Profile's POC sits inside the zone band.
 * Exhaustion question:
 *   FOLLOW-THROUGH LOST  — paid when the exhaustion's FT reads 0/3.
 *   STRUCTURE BREAK      — a close back beyond the push's origin.
 *   AGGRESSION DECLINE   — paid when aggression < 75% (always true when the
 *                          mark exists; listed so the chain is complete).
 *
 * Unpaid items are the debt. Any debt → the lens says WAIT: "let the market
 * pay." No probability, no confidence bar — the plate's "confidence read"
 * is deliberately NOT built: nothing measures one.
 *
 * ── ASKED QUESTIONS (Founder correction: "continuation healthy? · trap? ·
 * hold?") ─────────────────────────────────────────────────────────────────
 * The trader may ASK instead of taking AUTO. Each asked question is compiled
 * from the same bars and confirmed swings; when the camera holds nothing the
 * question could be asked of, the lens says so (`refusal`) — it never picks
 * a level or a move to make the question answerable.
 *   CONTINUATION — "Is the <up/down> move still healthy?" on the leg from the
 *     last opposite confirmed swing: NEW EXTREME (in the last 5 bars) ·
 *     EFFORT SUPPORTS (second-half effort ≥ 80% of first) · PULLBACK SHALLOW
 *     (< 50% of the leg) · NO EXHAUSTION (no exhaustion mark on the leg).
 *     Its FIRST item is the continuation owner's own verdict, verbatim
 *     (STRUCTURE + REGIME AGREE ⇔ selectContinuationHealth says COHERENT).
 *   TRAP — "Was the break of <swing> a trap?" on the newest confirmed swing
 *     traded through in the last 30 bars: CLOSE BACK INSIDE (≤ 3 bars) · NO
 *     ACCEPTANCE (< 2 closes beyond) · FOLLOW-THROUGH FAILED (no extension of
 *     1 median range past the break bar, ≥ 3 bars later) · EFFORT FADED.
 *   HOLD — "Is <swing> holding?" on the nearest confirmed swing on the far
 *     side of price: TESTED (traded within ¼ median range) · REJECTED (a
 *     close 1 median range away after the last test) · NO CLOSE BEYOND ·
 *     DEFENDED TWICE (two separate tests).
 * For TRAP and HOLD a paid item is evidence FOR the question's "yes".
 *   WHAT CHANGED? — the last CHANGE_WINDOW_BARS bars against everything
 *     before: NEW SWING CONFIRMED · SWING TRADED THROUGH · NEW ABSORPTION
 *     ZONE · NEW EXHAUSTION MARK · RANGE EXPANDED (window mean ≥ 1.5× the
 *     median). Ledger CHANGES: CHANGED / SAME, nothing owed.
 *
 * ── ON PRICE (GP12 §67, 2026-09-26) ───────────────────────────────────────
 * "These may reorganize emphasis. They do not create another chart / route /
 * Decision_ID." Each question also names WHERE ON PRICE its evidence sits —
 * `marks`, in price × time, read from the same bars, swings, zones and marks
 * the debt was measured on. The chart projects them; it never finds a bar
 * itself. Plates: UI-04 (Absorbed?: zone band + rings on the tested highs +
 * "DECREASING … EFFORT" / "NO CONVINCING DISPLACEMENT" + dotted effort
 * columns rising into the zone + the aggressor's own band), UI-15
 * (Continuing?: the leg, its extreme and half-leg levels, "HIGHER LOW HELD",
 * the close beyond the prior swing), UI-07 (✓ PAID / ✗ UNPAID per item).
 *   TRAP — ring on the swing, the break bar bracketed, a return arrow from the
 *     break extreme to the close back inside, ✓/✗ on the bar that paid or
 *     refused each item.
 *   HOLD — ring on the swing, a defense wedge on every test, ✓ at the
 *     rejection close, ✗ at a close beyond.
 *   WHAT CHANGED — the window lit; each changed object outlined.
 *   EXHAUSTED — ring on the extreme, the push origin level, ✓/✗ per
 *     follow-through bar, ✓ at the close back beyond the origin.
 *   PERMISSION — one ✓/✗ per compiler item on the ledger's event bar (the
 *     H-101 debt tag's bar); none on camera → named silence.
 * Where an owner has nothing to anchor a mark to, the question says so in
 * `silences` (painted as a muted word) — it never places a guess.
 *
 * PURE. DETERMINISTIC.
 */

import type { AbsorptionAnatomyVM } from "@/lib/marketData/selectAbsorptionAnatomy";
import type { ExhaustionVM } from "./selectExhaustion";

export const QUESTION_LENS_VERSION = 1;
export const DISPLACEMENT_RANGES = 2;

export interface DebtItem {
  readonly label: string;
  readonly paid: boolean;
  /** The measured fact behind the verdict, in one line. */
  readonly evidence: string;
}

export interface QuestionLensVM {
  readonly version: number;
  readonly active: boolean;
  readonly kind: "ABSORPTION" | "EXHAUSTION" | "CONTINUATION" | "TRAP" | "HOLD" | "WHAT_CHANGED" | "PERMISSION" | null;
  /**
   * DEBT — items are evidence owed (PAID / MISSING). CHANGES — WHAT CHANGED?
   * items are measured differences (CHANGED / SAME); nothing is owed.
   */
  readonly ledger: "DEBT" | "CHANGES";
  /** What was asked (AUTO when the camera chose). */
  readonly choice: QuestionChoice;
  /** Set when the asked question has nothing on this camera to be asked of. */
  readonly refusal: string | null;
  readonly question: string | null;
  readonly focus: string | null;
  /** Price band the question is about (for the on-price band). */
  readonly bandLow: number | null;
  readonly bandHigh: number | null;
  readonly bandStart: number | null;
  readonly debt: readonly DebtItem[];
  readonly openDebt: number;
  /** "WAIT · LET THE MARKET PAY" while any item is unpaid. */
  readonly posture: string | null;
  /** The next question the plate asks, when the current one is answered. */
  readonly nextQuestion: string | null;
  /**
   * MOCK 3's "AGGRESSION vs DISPLACEMENT — who is in control?" pair, read
   * from the zone's own bars: mean effort and mean displacement (0..1 of the
   * window's peaks), and the verdict the plate prints under them. Absorption
   * questions only; null otherwise.
   */
  readonly control: {
    readonly aggression: number;
    readonly displacement: number;
    /** AGGRESSION only on a delta basis; on VOLUME the same number is EFFORT. */
    readonly effortWord: "AGGRESSION" | "EFFORT";
    readonly verdict: "EFFORT ABSORBED" | "AGGRESSION PAID" | "EFFORT PAID";
  } | null;
  /**
   * Where on price the question's evidence sits (see ON PRICE above). Always
   * set by this selector; optional so a VM built by hand (a rail fixture)
   * without on-price geometry still types.
   */
  readonly marks?: readonly LensMark[];
  /** Geometry the question would draw but no owner can anchor — named, never guessed. */
  readonly silences?: readonly string[];
}

/**
 * One piece of the question's on-price geometry, in price × time.
 *   LEVEL     — a horizontal rule at `price` from `time` to `time2` (null = the live edge)
 *   BAND      — rows `price`…`price2` from `time` to `time2` (null = the live edge)
 *   RING      — a ring on a bar at `price`
 *   PAID/OWED — ✓ / ✗ on the bar that paid (or refused) debt item `item`
 *   ARROW     — from (`time`,`price`) to (`time2`,`price2`)
 *   LEG       — a line from (`time`,`price`) to (`time2`,`price2`)
 *   BREAK_BAR — the bar that broke a level: `price` its extreme, `price2` the level
 *   EFFORT    — a dotted column on a bar, `strength` = effortNorm, ending at
 *               `price` and pointing `dir` (UP = rising into the zone from below)
 *   DEFENSE   — a wedge under (`dir` UP) or over (DOWN) a bar that tested a level
 *   WINDOW    — the span `time` → `time2` (null = the live edge)
 */
export type LensMarkKind = "LEVEL" | "BAND" | "RING" | "PAID" | "OWED" | "ARROW" | "LEG" | "BREAK_BAR" | "EFFORT" | "DEFENSE" | "WINDOW";
export interface LensMark {
  readonly kind: LensMarkKind;
  readonly time: number;
  readonly price: number;
  readonly time2?: number | null;
  readonly price2?: number;
  readonly strength?: number;
  readonly dir?: "UP" | "DOWN";
  /** ASKED — the question's subject; SIDE — the aggressor's own band; CHANGED — a WHAT CHANGED? object. */
  readonly tone?: "ASKED" | "SIDE" | "CHANGED";
  /** The plate's leader word — at most one per mark; everything else stays in the rail. */
  readonly word?: string;
  /** The debt item a PAID / OWED mark evidences. */
  readonly item?: string;
}

export type QuestionChoice = "AUTO" | "ABSORPTION" | "EXHAUSTION" | "CONTINUATION" | "TRAP" | "HOLD" | "WHAT_CHANGED" | "PERMISSION";
export const QUESTION_CHOICES: readonly { readonly id: QuestionChoice; readonly label: string }[] = [
  { id: "AUTO", label: "Auto" },
  { id: "ABSORPTION", label: "Absorbed?" },
  { id: "EXHAUSTION", label: "Exhausted?" },
  { id: "CONTINUATION", label: "Continuing?" },
  { id: "TRAP", label: "Trap?" },
  { id: "HOLD", label: "Holding?" },
  { id: "WHAT_CHANGED", label: "What changed?" },
  { id: "PERMISSION", label: "Permission?" },
];
/** WHAT CHANGED? looks back this many bars (one hour on a 5m camera). */
export const CHANGE_WINDOW_BARS = 12;
export const NEW_EXTREME_BARS = 5;
export const TRAP_WINDOW_BARS = 30;

export interface QuestionLensInput {
  readonly absorption: AbsorptionAnatomyVM | null;
  readonly exhaustion: ExhaustionVM | null;
  /** Living Profile POC, when drawn. */
  readonly livingPoc: number | null;
  /** Confirmed structure pivots (time + price; kind when the owner states it). */
  readonly pivots: readonly { readonly time: number; readonly price: number; readonly kind?: "HIGH" | "LOW" }[];
  /** What the trader asked. Omitted → AUTO. */
  readonly choice?: QuestionChoice;
  /**
   * The ONE continuation owner's verdict (selectContinuationHealth), carried
   * verbatim. Continuing? never mints a second continuation verdict — this is
   * its first item, word for word; the lens only adds the leg's own facts.
   */
  readonly continuation?: { readonly health: "COHERENT" | "CONTESTED" | "ROTATING" | "UNREADABLE"; readonly reason: string } | null;
  /** The market's own decimals (pricePrecision.ts). Omitted → 2. */
  readonly priceDp?: number;
  /**
   * PERMISSION? — the Decision Permission Compiler's own reading, carried
   * verbatim (right of way + its evidence debt). The lens QUOTES it on the
   * camera; it never grants, weighs or re-derives permission.
   */
  readonly permission?: {
    readonly rightOfWay: string;
    readonly detail: string;
    readonly debt: {
      readonly payable: number;
      readonly resolved: number;
      readonly missingLabels: readonly string[];
      readonly warnLabels: readonly string[];
    } | null;
    /**
     * The bar the ledger was read at (the H-101 debt tag's event bar, epoch
     * seconds) — where PERMISSION?'s items sit on price. Null → no event bar
     * (the compiler is not waiting on one): the marks are a named silence.
     */
    readonly eventBarTime?: number | null;
  } | null;
}

const NONE: QuestionLensVM = {
  version: QUESTION_LENS_VERSION, active: false, kind: null, ledger: "DEBT", choice: "AUTO", refusal: null, question: null, focus: null,
  bandLow: null, bandHigh: null, bandStart: null, debt: [], openDebt: 0, posture: null, nextQuestion: null,
  control: null, marks: [], silences: [],
};

/**
 * Prices print at the MARKET's decimals (GP12 §27), set per call from
 * `priceDp` — 2 was the old fixed rule, and it read USDJPY 150.123 as 150.12.
 * Module-scoped because every helper formats prices; `selectQuestionLens` is
 * synchronous and sets it on entry, so no call can see another's value.
 */
let PRICE_DP = 2;
const f2 = (n: number) => n.toFixed(PRICE_DP);

const refuse = (choice: QuestionChoice, why: string): QuestionLensVM => ({ ...NONE, choice, refusal: why });

export function selectQuestionLens(input: QuestionLensInput): QuestionLensVM {
  PRICE_DP = Number.isInteger(input.priceDp) && (input.priceDp as number) >= 0 && (input.priceDp as number) <= 10 ? (input.priceDp as number) : 2;
  const choice = input.choice ?? "AUTO";
  // PERMISSION? reads the decision, not the bars — asked before the bar check.
  if (choice === "PERMISSION") return permissionLens(input);
  const a = input.absorption;
  const bars = a?.measured ? a.bars : [];
  if (bars.length === 0) return choice === "AUTO" ? NONE : refuse(choice, "no measured bars on this camera yet");

  const ranges = bars.map(b => b.high - b.low).filter(r => r > 0).sort((x, y) => x - y);
  const med = ranges.length ? ranges[Math.floor(ranges.length / 2)] : 0;
  if (choice === "WHAT_CHANGED") return whatChanged(bars, med, input);
  if (choice === "CONTINUATION" || choice === "TRAP" || choice === "HOLD") {
    const vm = askStructural(choice, bars, med, input);
    return vm;
  }

  const zone = a!.zones.at(-1) ?? null;
  const ex = input.exhaustion?.marks.at(-1) ?? null;
  if (choice === "ABSORPTION" && !zone) return refuse(choice, "no absorption zone on this camera to ask about");
  if (choice === "EXHAUSTION" && !ex) return refuse(choice, "no exhausted push on this camera to ask about");
  if (!zone && !ex) return NONE;

  const useExhaustion = choice === "EXHAUSTION" || (choice === "AUTO" && ex && (!zone || ex.time > zone.endTime));

  if (!useExhaustion && zone) {
    const after = bars.filter(b => b.time > zone.endTime);
    const inZone = bars.filter(b => b.time >= zone.startTime && b.time <= zone.endTime);
    const zoneEffort = inZone.length ? inZone.reduce((s, b) => s + b.effortNorm, 0) / inZone.length : 0;
    const afterEffort = after.length ? after.reduce((s, b) => s + b.effortNorm, 0) / after.length : 0;
    const farthest = after.reduce((m, b) => Math.max(m, b.high - zone.priceHi, zone.priceLo - b.low), 0);
    const displaced = med > 0 && farthest >= DISPLACEMENT_RANGES * med;
    const pivot = input.pivots.find(p => p.time > zone.endTime && p.price >= zone.priceLo && p.price <= zone.priceHi);
    const accepted = input.livingPoc != null && input.livingPoc >= zone.priceLo && input.livingPoc <= zone.priceHi;
    const delta = a!.basis === "SIGNED_DELTA" || a!.basis === "INFERRED_DELTA";
    const zDelta = inZone.reduce((s, b) => s + (b.delta ?? 0), 0);
    const who = delta ? (zDelta >= 0 ? "buyer effort" : "seller effort") : "effort";
    const debt: DebtItem[] = [
      { label: "CLEAR DISPLACEMENT", paid: displaced,
        evidence: after.length === 0 ? "no bars after the zone yet"
          : `farthest move away ${f2(farthest)} vs ${DISPLACEMENT_RANGES}× median range ${f2(DISPLACEMENT_RANGES * med)}` },
      { label: delta ? "SUSTAINED AGGRESSION" : "SUSTAINED EFFORT", paid: after.length > 0 && afterEffort >= zoneEffort,
        evidence: after.length === 0 ? "no bars after the zone yet"
          : `effort after ${Math.round(afterEffort * 100)}% vs in zone ${Math.round(zoneEffort * 100)}%` },
      { label: "STRUCTURE CONFIRMATION", paid: !!pivot,
        evidence: pivot ? `swing confirmed at ${f2(pivot.price)} inside the zone` : "no confirmed swing inside the zone since it formed" },
      { label: "VOLUME ACCEPTANCE", paid: accepted,
        evidence: input.livingPoc == null ? "Living Profile not drawn — POC unknown"
          : accepted ? `Living POC ${f2(input.livingPoc)} inside the zone` : `Living POC ${f2(input.livingPoc)} outside the zone` },
    ];
    const open = debt.filter(d => !d.paid).length;
    const zoneDisp = inZone.length ? inZone.reduce((t, b) => t + b.displacementNorm, 0) / inZone.length : 0;
    // UI-04 ON PRICE. The TESTED edge: on a delta basis the side's own push
    // (buyers push into the high, sellers into the low); on VOLUME, the edge
    // price is on the far side of — below the zone it was a ceiling.
    const last = bars[bars.length - 1];
    const testedHigh = delta ? zDelta >= 0 : last.close <= (zone.priceLo + zone.priceHi) / 2;
    const edgeOf = (b: Bar) => (testedHigh ? b.high : b.low);
    const marks: LensMark[] = [];
    const silences: string[] = [];
    const peak = inZone.reduce<Bar | null>((m, b) => (!m || (testedHigh ? b.high > m.high : b.low < m.low) ? b : m), null);
    // Retests: after the zone, a bar that re-entered the band from the tested
    // side and was a local extreme (≥ its neighbours), ≥ 4 bars apart; last 2.
    const retests: Bar[] = [];
    after.forEach((b, i) => {
      const inBand = testedHigh ? b.high >= zone.priceLo : b.low <= zone.priceHi;
      const prev = after[i - 1], next = after[i + 1];
      const localExt = (!prev || (testedHigh ? b.high >= prev.high : b.low <= prev.low)) && (!next || (testedHigh ? b.high >= next.high : b.low <= next.low));
      if (!inBand || !localExt) return;
      const lastR = retests[retests.length - 1];
      if (lastR && bars.indexOf(b) - bars.indexOf(lastR) < 4) {
        if (testedHigh ? b.high > lastR.high : b.low < lastR.low) retests[retests.length - 1] = b;
      } else retests.push(b);
    });
    const shownRetests = retests.slice(-2);
    const effortWord = after.length > 0 && afterEffort < zoneEffort ? `DECREASING ${who.toUpperCase()}` : undefined;
    const noDisp = zoneDisp <= 0.35 ? "NO CONVINCING DISPLACEMENT" : undefined;
    // The plate's two leader words: DECREASING … EFFORT on the peak, NO
    // CONVINCING DISPLACEMENT (the control verdict) on the last retest. With
    // no retest the peak carries the verdict — one word per mark.
    if (peak) marks.push({ kind: "RING", time: peak.time, price: edgeOf(peak), tone: "ASKED", word: shownRetests.length ? effortWord : (noDisp ?? effortWord) });
    shownRetests.forEach((b, i) => marks.push({ kind: "RING", time: b.time, price: edgeOf(b), tone: "ASKED",
      word: i === shownRetests.length - 1 ? noDisp ?? (peak ? undefined : effortWord) : undefined }));
    // Dotted effort columns rising (or falling) into the zone, one per zone bar.
    for (const b of inZone) {
      if (b.effortNorm > 0) marks.push({ kind: "EFFORT", time: b.time, price: testedHigh ? zone.priceLo : zone.priceHi, strength: b.effortNorm, dir: testedHigh ? "UP" : "DOWN" });
    }
    // The aggressor's own band (UI-04's blue buyer band): only when the tape
    // names a side — the pre-zone bar with the largest same-side delta.
    if (!delta) silences.push("SIDE BAND · VOLUME BASIS — SIDE UNKNOWN");
    else {
      const sign = zDelta >= 0 ? 1 : -1;
      const src = bars.filter(b => b.time < zone.startTime && b.delta != null && Math.sign(b.delta) === sign)
        .reduce<Bar | null>((m, b) => (!m || Math.abs(b.delta!) > Math.abs(m.delta!) ? b : m), null);
      if (src) marks.push({ kind: "BAND", time: src.time, price: src.low, price2: src.high, time2: null, tone: "SIDE" });
      else silences.push(`SIDE BAND · NO PRIOR ${sign > 0 ? "BUYER" : "SELLER"} EFFORT IN VIEW`);
    }
    return {
      marks, silences,
      version: QUESTION_LENS_VERSION,
      active: true,
      kind: "ABSORPTION",
      ledger: "DEBT",
      choice,
      refusal: null,
      question: `Is ${who} being absorbed at ${f2(zone.priceLo)}–${f2(zone.priceHi)}?`,
      focus: `Absorption of ${who}${delta ? "" : " (volume basis — side unknown)"}`,
      bandLow: zone.priceLo,
      bandHigh: zone.priceHi,
      bandStart: zone.startTime,
      debt,
      openDebt: open,
      posture: open > 0 ? "WAIT · LET THE MARKET PAY" : "DEBT PAID · READ THE ANSWER",
      nextQuestion: "Is the opposite side's effort being rewarded?",
      control: (() => {
        const disp = zoneDisp;
        const effortWord = delta ? "AGGRESSION" as const : "EFFORT" as const;
        return {
          aggression: zoneEffort,
          displacement: disp,
          effortWord,
          // The anatomy owner's own weak-displacement gate (0.35).
          verdict: disp <= 0.35 ? "EFFORT ABSORBED" as const : delta ? "AGGRESSION PAID" as const : "EFFORT PAID" as const,
        };
      })(),
    };
  }

  // EXHAUSTION question
  const m = ex!;
  // The push's origin is the exhaustion owner's own (the bar before the push:
  // its low UP, its high DOWN). Rebuilding it backwards from the extreme was a
  // second owner that disagreed whenever the extreme was not the push's last bar.
  const origin: number | null = Number.isFinite(m.originPrice) ? m.originPrice : null;
  const after = bars.filter(b => b.time > m.time);
  const broke = origin != null && after.some(b => (m.direction === "UP" ? b.close < origin : b.close > origin));
  const debt: DebtItem[] = [
    { label: "FOLLOW-THROUGH LOST", paid: m.followThrough === 0,
      evidence: m.followThrough == null ? "fewer than 3 bars since the extreme" : `${m.followThrough}/3 bars made a new extreme` },
    { label: input.exhaustion?.basis === "SIGNED_DELTA" || input.exhaustion?.basis === "INFERRED_DELTA" ? "AGGRESSION DECLINE" : "EFFORT DECLINE", paid: m.aggressionLevel != null && m.aggressionLevel < 0.75,
      evidence: m.aggressionLevel == null
        ? m.effortUnreportedBars > 0
          ? `effort not reported on ${m.effortUnreportedBars} bar${m.effortUnreportedBars === 1 ? "" : "s"} of the push`
          : "no first-half effort to decline from"
        : `second-half effort ${Math.round(m.aggressionLevel * 100)}% of first half` },
    { label: "STRUCTURE BREAK", paid: broke,
      evidence: origin == null ? "push origin unknown" : broke ? `closed back beyond the push origin ${f2(origin)}` : `no close back beyond the push origin ${f2(origin)}` },
  ];
  const open = debt.filter(d => !d.paid).length;
  // ON PRICE: a ring on the extreme, the push origin as a level, ✓/✗ on each
  // follow-through bar (✓ = it did NOT make a new extreme), ✓ at the first
  // close back beyond the origin.
  const marks: LensMark[] = [{ kind: "RING", time: m.time, price: m.price, tone: "ASKED" }];
  const silences: string[] = [];
  if (origin != null) marks.push({ kind: "LEVEL", time: m.pushStartTime, price: origin, time2: null, tone: "ASKED", word: "PUSH ORIGIN" });
  else silences.push("PUSH ORIGIN UNKNOWN");
  for (const fb of m.followBars) marks.push({ kind: fb.beyond ? "OWED" : "PAID", time: fb.time, price: fb.reach, item: "FOLLOW-THROUGH LOST" });
  const brokeBar = origin == null ? undefined : after.find(b => (m.direction === "UP" ? b.close < origin : b.close > origin));
  if (brokeBar) marks.push({ kind: "PAID", time: brokeBar.time, price: brokeBar.close, item: "STRUCTURE BREAK" });
  return {
    marks, silences,
    version: QUESTION_LENS_VERSION,
    active: true,
    kind: "EXHAUSTION",
    ledger: "DEBT",
    choice,
    refusal: null,
    question: `Is this ${m.direction === "UP" ? "up" : "down"}-push exhausted at ${f2(m.price)}?`,
    focus: "Exhaustion of the push",
    bandLow: m.price,
    bandHigh: m.price,
    bandStart: m.time,
    debt,
    openDebt: open,
    posture: open > 0 ? "WAIT · LET THE MARKET PAY" : "DEBT PAID · READ THE ANSWER",
    nextQuestion: m.direction === "UP" ? "Is seller effort now being rewarded?" : "Is buyer effort now being rewarded?",
    control: null,
  };
}


type Bar = AbsorptionAnatomyVM["bars"][number];

function askStructural(choice: "CONTINUATION" | "TRAP" | "HOLD", bars: readonly Bar[], med: number, input: QuestionLensInput): QuestionLensVM {
  const pivots = input.pivots.filter(p => p.kind === "HIGH" || p.kind === "LOW");
  if (pivots.length === 0) return refuse(choice, "no confirmed swings on this camera — structure is not measured yet");
  const last = bars[bars.length - 1];
  const idxAfter = (t: number) => { const i = bars.findIndex(b => b.time > t); return i < 0 ? bars.length : i; };
  const mean = (xs: readonly Bar[]) => (xs.length ? xs.reduce((t, b) => t + b.effortNorm, 0) / xs.length : 0);
  const done = (kind: "CONTINUATION" | "TRAP" | "HOLD", question: string, focus: string, lo: number, hi: number, start: number, debt: DebtItem[], next: string,
    marks: LensMark[], silences: string[] = []): QuestionLensVM => {
    const open = debt.filter(d => !d.paid).length;
    return {
      marks, silences,
      version: QUESTION_LENS_VERSION, active: true, kind, ledger: "DEBT", choice, refusal: null, question, focus,
      bandLow: Math.min(lo, hi), bandHigh: Math.max(lo, hi), bandStart: start, debt, openDebt: open,
      posture: open > 0 ? "WAIT · LET THE MARKET PAY" : "DEBT PAID · READ THE ANSWER",
      nextQuestion: next, control: null,
    };
  };

  if (choice === "CONTINUATION") {
    // The leg runs from the newest confirmed swing to the extreme since it.
    const origin = pivots.reduce((m, p) => (p.time > m.time ? p : m));
    const up = origin.kind === "LOW";
    const leg = bars.slice(idxAfter(origin.time - 1));
    if (leg.length < 4) return refuse(choice, "the move since the last confirmed swing is under 4 bars — too short to ask about");
    let exI = 0;
    leg.forEach((b, i) => { if (up ? b.high >= leg[exI].high : b.low <= leg[exI].low) exI = i; });
    const extreme = up ? leg[exI].high : leg[exI].low;
    const size = Math.abs(extreme - origin.price);
    if (med > 0 && size < 2 * med) return refuse(choice, `no directional move to ask about — the leg since ${f2(origin.price)} is ${f2(size)}, under 2 median ranges`);
    const barsSince = leg.length - 1 - exI;
    const half = Math.floor(leg.length / 2);
    const e1 = mean(leg.slice(0, half)), e2 = mean(leg.slice(half));
    const retrace = size > 0 ? Math.abs(extreme - last.close) / size : 0;
    const exOnLeg = (input.exhaustion?.marks ?? []).find(m => m.time >= origin.time && m.direction === (up ? "UP" : "DOWN"));
    const owner = input.continuation ?? null;
    const debt: DebtItem[] = [
      { label: "STRUCTURE + REGIME AGREE", paid: owner?.health === "COHERENT",
        evidence: owner ? `${owner.health} · ${owner.reason}` : "continuation owner not read on this camera" },
      { label: "NEW EXTREME", paid: barsSince < NEW_EXTREME_BARS,
        evidence: barsSince === 0 ? `extreme ${f2(extreme)} is on the newest bar` : `extreme ${f2(extreme)} was ${barsSince} bar${barsSince > 1 ? "s" : ""} ago (needs < ${NEW_EXTREME_BARS})` },
      { label: "EFFORT SUPPORTS", paid: e1 > 0 && e2 >= 0.8 * e1,
        evidence: `second-half effort ${Math.round(e2 * 100)}% vs first half ${Math.round(e1 * 100)}%` },
      { label: "PULLBACK SHALLOW", paid: retrace < 0.5,
        evidence: `price has given back ${Math.round(retrace * 100)}% of the leg (needs < 50%)` },
      { label: "NO EXHAUSTION", paid: !exOnLeg,
        evidence: exOnLeg ? `exhaustion marked at ${f2(exOnLeg.price)} on this leg` : "no exhaustion mark on this leg" },
    ];
    // UI-15 ON PRICE: the leg, a ring on its origin ("HIGHER LOW HELD" only
    // when the prior same-kind swing is beyond it and no close has broken it),
    // the extreme as a level with NEW EXTREME's ✓/✗, the half-leg level with
    // PULLBACK SHALLOW's ✓/✗ at the newest close, the close beyond the prior
    // opposite swing ("CLOSED ABOVE PRIOR HIGH"), and ✗ on an exhaustion.
    const exBar = leg[exI];
    const marks: LensMark[] = [{ kind: "LEG", time: origin.time, price: origin.price, time2: exBar.time, price2: extreme, tone: "ASKED" }];
    const priorSame = pivots.filter(p => p.kind === origin.kind && p.time < origin.time).reduce<typeof pivots[number] | null>((m, p) => (!m || p.time > m.time ? p : m), null);
    const originHeld = !leg.some(b => (up ? b.close < origin.price : b.close > origin.price));
    const structural = priorSame != null && (up ? priorSame.price < origin.price : priorSame.price > origin.price) && originHeld;
    marks.push({ kind: "RING", time: origin.time, price: origin.price, tone: "ASKED", word: structural ? (up ? "HIGHER LOW HELD" : "LOWER HIGH HELD") : undefined });
    marks.push({ kind: "LEVEL", time: exBar.time, price: extreme, time2: null, tone: "ASKED" });
    marks.push({ kind: barsSince < NEW_EXTREME_BARS ? "PAID" : "OWED", time: exBar.time, price: extreme, item: "NEW EXTREME" });
    const halfLeg = origin.price + (extreme - origin.price) / 2;
    marks.push({ kind: "LEVEL", time: origin.time, price: halfLeg, time2: null, tone: "ASKED", word: "HALF-LEG" });
    marks.push({ kind: retrace < 0.5 ? "PAID" : "OWED", time: last.time, price: last.close, item: "PULLBACK SHALLOW" });
    const priorOpp = pivots.filter(p => p.kind === (up ? "HIGH" : "LOW") && p.time < origin.time && (up ? p.price < extreme : p.price > extreme))
      .reduce<typeof pivots[number] | null>((m, p) => (!m || p.time > m.time ? p : m), null);
    const brokeOpp = priorOpp ? leg.find(b => (up ? b.close > priorOpp.price : b.close < priorOpp.price)) : undefined;
    if (priorOpp && brokeOpp) {
      marks.push({ kind: "LEVEL", time: priorOpp.time, price: priorOpp.price, time2: brokeOpp.time, tone: "ASKED" });
      marks.push({ kind: "RING", time: brokeOpp.time, price: brokeOpp.close, tone: "ASKED", word: up ? "CLOSED ABOVE PRIOR HIGH" : "CLOSED BELOW PRIOR LOW" });
    }
    if (exOnLeg) marks.push({ kind: "OWED", time: exOnLeg.time, price: exOnLeg.price, item: "NO EXHAUSTION" });
    return done("CONTINUATION", `Is the ${up ? "up" : "down"}-move from ${f2(origin.price)} still healthy?`,
      `Continuation of the ${up ? "up" : "down"}-leg`, origin.price, extreme, origin.time, debt,
      up ? "If it stalls, is buyer effort being absorbed?" : "If it stalls, is seller effort being absorbed?", marks);
  }

  if (choice === "TRAP") {
    // The newest confirmed swing traded through within the window.
    const windowStart = bars[Math.max(0, bars.length - TRAP_WINDOW_BARS)].time;
    let found: { p: typeof pivots[number]; i: number } | null = null;
    for (const p of pivots) {
      const from = idxAfter(p.time);
      for (let i = from; i < bars.length; i++) {
        const b = bars[i];
        if (p.kind === "HIGH" ? b.high > p.price : b.low < p.price) {
          if (b.time >= windowStart && (!found || b.time > bars[found.i].time)) found = { p, i };
          break;
        }
      }
    }
    if (!found) return refuse(choice, `no confirmed swing was traded through in the last ${TRAP_WINDOW_BARS} bars — there is no break to ask about`);
    const { p, i } = found;
    const hi = p.kind === "HIGH";
    const brk = bars[i];
    const after = bars.slice(i + 1);
    const backInside = bars.slice(i, i + 4).some(b => (hi ? b.close < p.price : b.close > p.price));
    const closesBeyond = bars.slice(i).filter(b => (hi ? b.close > p.price : b.close < p.price)).length;
    const brkExt = hi ? brk.high : brk.low;
    const extended = after.some(b => (hi ? b.high - brkExt : brkExt - b.low) >= med);
    const faded = after.length > 0 && mean(after) < brk.effortNorm;
    const debt: DebtItem[] = [
      { label: "CLOSE BACK INSIDE", paid: backInside,
        evidence: backInside ? `closed back ${hi ? "below" : "above"} ${f2(p.price)} within 3 bars of the break` : `no close back ${hi ? "below" : "above"} ${f2(p.price)} within 3 bars` },
      { label: "NO ACCEPTANCE", paid: closesBeyond < 2,
        evidence: `${closesBeyond} close${closesBeyond === 1 ? "" : "s"} beyond the level since the break (a trap has < 2)` },
      { label: "FOLLOW-THROUGH FAILED", paid: after.length >= 3 && !extended,
        evidence: after.length < 3 ? `${after.length} bar${after.length === 1 ? "" : "s"} since the break — too early` : extended ? "price extended a median range past the break bar" : "no extension of a median range past the break bar" },
      { label: "EFFORT FADED", paid: faded,
        evidence: after.length === 0 ? "no bars since the break" : `effort after ${Math.round(mean(after) * 100)}% vs at the break ${Math.round(brk.effortNorm * 100)}%` },
    ];
    // ON PRICE: ring on the swing, the break bar bracketed (its extreme past
    // the level), a return arrow from that extreme to the close back inside,
    // and ✓/✗ on the bar that paid or refused each item. EFFORT FADED is a
    // mean over the bars since — no single bar pays it, so it has no mark.
    const marks: LensMark[] = [
      { kind: "RING", time: p.time, price: p.price, tone: "ASKED" },
      { kind: "BREAK_BAR", time: brk.time, price: brkExt, price2: p.price, tone: "ASKED" },
    ];
    const backBar = bars.slice(i, i + 4).find(b => (hi ? b.close < p.price : b.close > p.price));
    if (backBar) {
      marks.push({ kind: "ARROW", time: brk.time, price: brkExt, time2: backBar.time, price2: backBar.close, tone: "ASKED" });
      marks.push({ kind: "PAID", time: backBar.time, price: backBar.close, item: "CLOSE BACK INSIDE" });
    } else if (bars[i + 3]) marks.push({ kind: "OWED", time: bars[i + 3].time, price: bars[i + 3].close, item: "CLOSE BACK INSIDE" });
    if (closesBeyond >= 2) {
      const second = bars.slice(i).filter(b => (hi ? b.close > p.price : b.close < p.price))[1];
      marks.push({ kind: "OWED", time: second.time, price: second.close, item: "NO ACCEPTANCE" });
    }
    const extBar = after.find(b => (hi ? b.high - brkExt : brkExt - b.low) >= med);
    if (after.length >= 3 && !extended) marks.push({ kind: "PAID", time: after[2].time, price: hi ? after[2].high : after[2].low, item: "FOLLOW-THROUGH FAILED" });
    else if (extBar) marks.push({ kind: "OWED", time: extBar.time, price: hi ? extBar.high : extBar.low, item: "FOLLOW-THROUGH FAILED" });
    return done("TRAP", `Was the break of the swing ${hi ? "high" : "low"} ${f2(p.price)} a trap?`,
      `Break of ${f2(p.price)} — trap or acceptance`, p.price, p.price, p.time, debt,
      "Is the level now holding from the other side?", marks);
  }

  // HOLD — the nearest confirmed swing on the far side of price.
  const below = pivots.filter(p => p.kind === "LOW" && p.price < last.close).sort((x, y) => y.price - x.price)[0];
  const above = pivots.filter(p => p.kind === "HIGH" && p.price > last.close).sort((x, y) => x.price - y.price)[0];
  const lvl = !below ? above : !above ? below : (last.close - below.price <= above.price - last.close ? below : above);
  if (!lvl) return refuse(choice, "no confirmed swing on either side of price to ask about");
  const support = lvl.kind === "LOW";
  const tol = 0.25 * med;
  const after = bars.slice(idxAfter(lvl.time));
  const tests: number[] = [];
  after.forEach((b, i) => {
    const touch = support ? b.low <= lvl.price + tol : b.high >= lvl.price - tol;
    if (touch && (tests.length === 0 || i - tests[tests.length - 1] > 3)) tests.push(i);
    else if (touch) tests[tests.length - 1] = i;
  });
  const lastTest = tests.length ? tests[tests.length - 1] : -1;
  const rejected = lastTest >= 0 && after.slice(lastTest + 1).some(b => (support ? b.close - lvl.price : lvl.price - b.close) >= med);
  const beyond = after.some(b => (support ? b.close < lvl.price : b.close > lvl.price));
  const debt: DebtItem[] = [
    { label: "TESTED", paid: tests.length > 0,
      evidence: tests.length ? `price traded within ${f2(tol)} of ${f2(lvl.price)} (${tests.length} test${tests.length > 1 ? "s" : ""})` : `price has not come within ${f2(tol)} of ${f2(lvl.price)}` },
    { label: "REJECTED", paid: rejected,
      evidence: rejected ? `closed a median range ${support ? "above" : "below"} it after the last test` : lastTest < 0 ? "no test yet to reject" : "no close a median range away after the last test" },
    { label: "NO CLOSE BEYOND", paid: !beyond,
      evidence: beyond ? `a bar closed ${support ? "below" : "above"} ${f2(lvl.price)}` : `no close ${support ? "below" : "above"} ${f2(lvl.price)} since it formed` },
    { label: "DEFENDED TWICE", paid: tests.length >= 2,
      evidence: `${tests.length} separate test${tests.length === 1 ? "" : "s"}` },
  ];
  // ON PRICE: ring on the swing, a defense wedge on every test bar (under a
  // support, over a resistance), ✓ at the rejection close, ✗ at a close beyond.
  const marks: LensMark[] = [{ kind: "RING", time: lvl.time, price: lvl.price, tone: "ASKED" }];
  for (const ti of tests) {
    const tb = after[ti];
    marks.push({ kind: "DEFENSE", time: tb.time, price: support ? tb.low : tb.high, dir: support ? "UP" : "DOWN", tone: "ASKED" });
  }
  const rejBar = lastTest >= 0 ? after.slice(lastTest + 1).find(b => (support ? b.close - lvl.price : lvl.price - b.close) >= med) : undefined;
  if (rejBar) marks.push({ kind: "PAID", time: rejBar.time, price: rejBar.close, item: "REJECTED" });
  const beyondBar = after.find(b => (support ? b.close < lvl.price : b.close > lvl.price));
  if (beyondBar) marks.push({ kind: "OWED", time: beyondBar.time, price: beyondBar.close, item: "NO CLOSE BEYOND" });
  return done("HOLD", `Is the swing ${support ? "low" : "high"} ${f2(lvl.price)} holding?`,
    `${support ? "Support" : "Resistance"} at a confirmed swing`, lvl.price, lvl.price, lvl.time, debt,
    "If it breaks, is the break a trap?", marks);
}

function whatChanged(bars: readonly Bar[], med: number, input: QuestionLensInput): QuestionLensVM {
  if (bars.length <= CHANGE_WINDOW_BARS) return refuse("WHAT_CHANGED", `fewer than ${CHANGE_WINDOW_BARS + 1} bars — nothing earlier to compare against`);
  const from = bars[bars.length - CHANGE_WINDOW_BARS].time;
  const win = bars.slice(-CHANGE_WINDOW_BARS);
  const newPivots = input.pivots.filter(p => p.time >= from);
  const broken = input.pivots.filter(p => p.kind === "HIGH" || p.kind === "LOW").map(p => {
    const b = bars.find(x => x.time > p.time && (p.kind === "HIGH" ? x.high > p.price : x.low < p.price));
    return b && b.time >= from ? { p, t: b.time } : null;
  }).filter((x): x is NonNullable<typeof x> => !!x);
  const zones = (input.absorption?.zones ?? []).filter(z => z.endTime >= from);
  const marks = (input.exhaustion?.marks ?? []).filter(m => m.time >= from);
  const winRange = win.reduce((t, b) => t + (b.high - b.low), 0) / win.length;
  const expanded = med > 0 && winRange >= 1.5 * med;
  const items: DebtItem[] = [
    { label: "NEW SWING CONFIRMED", paid: newPivots.length > 0,
      evidence: newPivots.length ? newPivots.map(p => `${p.kind === "LOW" ? "low" : p.kind === "HIGH" ? "high" : "swing"} ${f2(p.price)}`).slice(-3).join(" · ") : "no swing confirmed in the window" },
    { label: "SWING TRADED THROUGH", paid: broken.length > 0,
      evidence: broken.length ? broken.map(x => `${x.p.kind === "HIGH" ? "high" : "low"} ${f2(x.p.price)}`).slice(-3).join(" · ") : "no swing traded through in the window" },
    { label: "NEW ABSORPTION ZONE", paid: zones.length > 0,
      evidence: zones.length ? zones.map(z => `${f2(z.priceLo)}–${f2(z.priceHi)}`).slice(-2).join(" · ") : "no new zone in the window" },
    { label: "NEW EXHAUSTION MARK", paid: marks.length > 0,
      evidence: marks.length ? marks.map(m => `${m.direction === "UP" ? "up" : "down"}-push at ${f2(m.price)}`).slice(-2).join(" · ") : "no push exhausted in the window" },
    { label: "RANGE EXPANDED", paid: expanded,
      evidence: `window mean range ${f2(winRange)} vs median ${f2(med)} (changed at ≥ 1.5×)` },
  ];
  const n = items.filter(i => i.paid).length;
  // ON PRICE: the window lit (the rest quieted by the lens), each changed
  // object outlined — new swings ringed, a traded-through swing's level run
  // to its break bar, new zones boxed, new exhaustion rings.
  const onPrice: LensMark[] = [{ kind: "WINDOW", time: from, price: win[0].close, time2: null, tone: "CHANGED" }];
  for (const p of newPivots) onPrice.push({ kind: "RING", time: p.time, price: p.price, tone: "CHANGED" });
  for (const x of broken) {
    const bb = bars.find(b => b.time === x.t)!;
    onPrice.push({ kind: "LEVEL", time: x.p.time, price: x.p.price, time2: x.t, tone: "CHANGED" });
    onPrice.push({ kind: "BREAK_BAR", time: x.t, price: x.p.kind === "HIGH" ? bb.high : bb.low, price2: x.p.price, tone: "CHANGED" });
  }
  for (const z of zones) onPrice.push({ kind: "BAND", time: z.startTime, price: z.priceLo, price2: z.priceHi, time2: z.endTime, tone: "CHANGED" });
  for (const m of marks) onPrice.push({ kind: "RING", time: m.time, price: m.price, tone: "CHANGED" });
  const silences = n === 0 ? ["NOTHING MOVED IN THE WINDOW"] : [];
  return {
    marks: onPrice, silences,
    version: QUESTION_LENS_VERSION, active: true, kind: "WHAT_CHANGED", ledger: "CHANGES", choice: "WHAT_CHANGED", refusal: null,
    question: `What changed in the last ${CHANGE_WINDOW_BARS} bars?`,
    focus: "Differences on this camera, measured",
    bandLow: null, bandHigh: null, bandStart: null,
    debt: items, openDebt: 0,
    posture: n > 0 ? `${n} CHANGE${n > 1 ? "S" : ""} · RE-READ THE CAMERA` : "NOTHING MOVED · THE PRIOR READ STANDS",
    nextQuestion: broken.length ? "Was that break a trap?" : zones.length ? "Is effort being absorbed there?" : "Is the level nearest price holding?",
    control: null,
  };
}

export default selectQuestionLens;

/**
 * PERMISSION? — "Is permission granted?", answered by QUOTING the Decision
 * Permission Compiler: its right-of-way word and detail, and one debt item per
 * evidence node it says is owed (missing) or not yet clean (warn). A paid line
 * carries its resolved count. Nothing here decides permission — a second
 * permission verdict on the camera would be two owners of one answer.
 */
function permissionLens(input: QuestionLensInput): QuestionLensVM {
  const p = input.permission;
  if (!p) return refuse("PERMISSION", "no decision reading on this camera yet");
  const d = p.debt;
  if (!d || d.payable === 0) return refuse("PERMISSION", "the decision chain has no gradeable evidence yet");
  const items: DebtItem[] = [
    ...d.missingLabels.map(l => ({ label: l.toUpperCase(), paid: false, evidence: "owed — the compiler has no evidence for it" })),
    ...d.warnLabels.map(l => ({ label: l.toUpperCase(), paid: false, evidence: "warning — present but not clean" })),
  ];
  if (d.resolved > 0) items.unshift({ label: "PAID", paid: true, evidence: `${d.resolved} of ${d.payable} evidence nodes paid` });
  const open = items.filter(i => !i.paid).length;
  // UI-07 ON PRICE: one ✓ / ✗ per item, stacked on the bar the ledger was read
  // at. The compiler grades nodes, not bars — that bar is the only one it names.
  const marks: LensMark[] = [];
  const silences: string[] = [];
  const evT = p.eventBarTime ?? null;
  const evBar = evT == null ? undefined : input.absorption?.bars.find(b => Math.round(b.time) === evT);
  if (evT == null) silences.push("NO EVIDENCE BAR · THE LEDGER NAMES NONE");
  else if (!evBar) silences.push("EVIDENCE BAR NOT IN VIEW");
  else for (const it of items) marks.push({ kind: it.paid ? "PAID" : "OWED", time: evBar.time, price: evBar.high, item: it.label });
  return {
    marks, silences,
    version: QUESTION_LENS_VERSION, active: true, kind: "PERMISSION", ledger: "DEBT", choice: "PERMISSION", refusal: null,
    question: "Is permission granted?",
    focus: `Right of way: ${p.rightOfWay} · ${p.detail}`,
    bandLow: null, bandHigh: null, bandStart: null,
    debt: items, openDebt: open,
    posture: open > 0 ? "WAIT · LET THE MARKET PAY" : null,
    nextQuestion: open > 0 ? null : "What changed?",
    control: null,
  };
}
