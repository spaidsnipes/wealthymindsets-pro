/**
 * WALL EXPLANATIONS (Founder ruling 2026-11-12: "make calls / puts / gamma walls clickable with clean explanations —
 * this would have kept me in the play"). A tap on a wall's band or chip opens one short card: what the level is,
 * what it measured, and what price usually does around it — in plain words, always ending on "positioning, not a
 * promise". The numbers are the chip's own words (the compiled label), never re-derived here.
 */
export interface WallExplain { readonly title: string; readonly lines: readonly string[] }

const fmt = (p: number) => p.toLocaleString(undefined, { maximumFractionDigits: 2 });
const NOT_A_PROMISE = "Positioning from options open interest — a place to watch, not a promise.";

export function explainWall(kinds: readonly string[], price: number | null, chipWords: string): WallExplain {
  const at = price != null ? ` ${fmt(price)}` : "";
  const call = kinds.includes("CALL_WALL"), put = kinds.includes("PUT_WALL");
  if (call && put) return { title: `CALL + PUT WALL${at}`, lines: [
    chipWords,
    "Big call AND put open interest at the same strike — the market's most crowded price.",
    "Price is often pulled toward it and pinned there; a clean break away from it tends to travel.",
    NOT_A_PROMISE,
  ] };
  if (call) return { title: `CALL WALL${at}`, lines: [
    chipWords,
    "A strike near price where call open interest is concentrated.",
    "Rallies often slow or stall into it (hedging sells there). If price holds above it, the ceiling can turn into a floor and the move can run.",
    NOT_A_PROMISE,
  ] };
  if (put) return { title: `PUT WALL${at}`, lines: [
    chipWords,
    "A strike near price where put open interest is concentrated.",
    "Sell-offs often slow or bounce into it. If price breaks and holds below it, support is gone and the drop can speed up.",
    NOT_A_PROMISE,
  ] };
  if (kinds.includes("GAMMA_FLIP")) return { title: `GAMMA FLIP${at}`, lines: [
    chipWords,
    "Modelled: the price where dealer hedging changes sides.",
    "Above it moves tend to be damped (back-and-forth); below it moves tend to be amplified (faster, further).",
    "A model from the options chain — treat it as a zone, not a line.",
  ] };
  if (kinds.some(k => /POS/.test(k))) return { title: `POSITIVE GAMMA${at}`, lines: [
    chipWords, "Modelled: dealer hedging here leans against the move — expect slower, rotating price.", "A model from the options chain, not a fill.",
  ] };
  if (kinds.some(k => /NEG/.test(k))) return { title: `NEGATIVE GAMMA${at}`, lines: [
    chipWords, "Modelled: dealer hedging here leans WITH the move — expect faster, longer swings.", "A model from the options chain, not a fill.",
  ] };
  return { title: chipWords, lines: [NOT_A_PROMISE] };
}

/** A Brick Wall (Derivatives Pressure) — the same plain card, from its strike and polarity. */
export function explainBrickWall(strike: number, polarity: "CALL_HEAVY" | "PUT_HEAVY" | string | null): WallExplain {
  return explainWall(polarity === "PUT_HEAVY" ? ["PUT_WALL"] : polarity === "CALL_HEAVY" ? ["CALL_WALL"] : ["CALL_WALL", "PUT_WALL"], strike, `Brick wall ${fmt(strike)} — options exposure stacked at this strike`);
}
