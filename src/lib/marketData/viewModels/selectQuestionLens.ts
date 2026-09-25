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
  readonly kind: "ABSORPTION" | "EXHAUSTION" | "CONTINUATION" | "TRAP" | "HOLD" | "WHAT_CHANGED" | null;
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
}

export type QuestionChoice = "AUTO" | "ABSORPTION" | "EXHAUSTION" | "CONTINUATION" | "TRAP" | "HOLD" | "WHAT_CHANGED";
export const QUESTION_CHOICES: readonly { readonly id: QuestionChoice; readonly label: string }[] = [
  { id: "AUTO", label: "Auto" },
  { id: "ABSORPTION", label: "Absorbed?" },
  { id: "EXHAUSTION", label: "Exhausted?" },
  { id: "CONTINUATION", label: "Continuing?" },
  { id: "TRAP", label: "Trap?" },
  { id: "HOLD", label: "Holding?" },
  { id: "WHAT_CHANGED", label: "What changed?" },
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
}

const NONE: QuestionLensVM = {
  version: QUESTION_LENS_VERSION, active: false, kind: null, ledger: "DEBT", choice: "AUTO", refusal: null, question: null, focus: null,
  bandLow: null, bandHigh: null, bandStart: null, debt: [], openDebt: 0, posture: null, nextQuestion: null,
  control: null,
};

const f2 = (n: number) => n.toFixed(2);

const refuse = (choice: QuestionChoice, why: string): QuestionLensVM => ({ ...NONE, choice, refusal: why });

export function selectQuestionLens(input: QuestionLensInput): QuestionLensVM {
  const choice = input.choice ?? "AUTO";
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
    return {
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
        const disp = inZone.length ? inZone.reduce((t, b) => t + b.displacementNorm, 0) / inZone.length : 0;
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
        ? `effort not reported on ${m.effortUnreportedBars} bar${m.effortUnreportedBars === 1 ? "" : "s"} of the push`
        : `second-half effort ${Math.round(m.aggressionLevel * 100)}% of first half` },
    { label: "STRUCTURE BREAK", paid: broke,
      evidence: origin == null ? "push origin unknown" : broke ? `closed back beyond the push origin ${f2(origin)}` : `no close back beyond the push origin ${f2(origin)}` },
  ];
  const open = debt.filter(d => !d.paid).length;
  return {
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
  const done = (kind: "CONTINUATION" | "TRAP" | "HOLD", question: string, focus: string, lo: number, hi: number, start: number, debt: DebtItem[], next: string): QuestionLensVM => {
    const open = debt.filter(d => !d.paid).length;
    return {
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
    return done("CONTINUATION", `Is the ${up ? "up" : "down"}-move from ${f2(origin.price)} still healthy?`,
      `Continuation of the ${up ? "up" : "down"}-leg`, origin.price, extreme, origin.time, debt,
      up ? "If it stalls, is buyer effort being absorbed?" : "If it stalls, is seller effort being absorbed?");
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
    return done("TRAP", `Was the break of the swing ${hi ? "high" : "low"} ${f2(p.price)} a trap?`,
      `Break of ${f2(p.price)} — trap or acceptance`, p.price, p.price, p.time, debt,
      "Is the level now holding from the other side?");
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
  return done("HOLD", `Is the swing ${support ? "low" : "high"} ${f2(lvl.price)} holding?`,
    `${support ? "Support" : "Resistance"} at a confirmed swing`, lvl.price, lvl.price, lvl.time, debt,
    "If it breaks, is the break a trap?");
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
  return {
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
