/**
 * CLEAN GLASS — the one owner of which engine telemetry may paint on the chart.
 *
 * Founder, Codex thread A-3 (2026-11-02): "Wealthy Mindset is beautiful, but it needs to be more user friendly …
 * I don't want to take anything away, but I want it more simple." He named three marks: the side words
 * "Order Flow from 7 p.m. CST, early bars", the Nectar "4 symbols" chip ("That's something that's internal"), and
 * the Nectar 7 AM line he took for a time-zone split ("we need not to have split brain anywhere").
 *
 * Every mark here is TELEMETRY about WM's own recorder, not a reading of the market. The recorder keeps running and
 * every reading it feeds (footprint cells, delta, bubbles, walls) still paints. Only the words and lines about the
 * recorder leave the glass; where the tape begins is still written to `canvas.dataset.tapeCoverage` for Inspect and
 * the proofs, and the bars before it simply carry no footprint cells (a faint hatch near the start remains).
 */
export type GlassMark = "NECTAR_HORIZON" | "NECTAR_VAULT_CHIP" | "ORDER_FLOW_START_WORDS" | "ORDER_FLOW_SEAM_LINE";

export const OFF_GLASS: Readonly<Record<GlassMark, string>> = {
  NECTAR_HORIZON: "Nectar is internal: the dashed 'TAPE 7:00 AM' line read as a time-zone split on the chart.",
  NECTAR_VAULT_CHIP: "Nectar is internal: the '● N symbols' retained-evidence chip is WM's own collection, not the market.",
  ORDER_FLOW_START_WORDS: "Side clutter: 'ORDER FLOW FROM 7:00 PM — earlier bars: candle totals' said what the blank cells already show.",
  ORDER_FLOW_SEAM_LINE: "A second dashed gold vertical beside the session lines looked like a time-zone split.",
};

/** Does this mark paint on the chart glass? One answer for every surface (no split brain). */
export function paintsOnGlass(mark: GlassMark): boolean {
  return !(mark in OFF_GLASS);
}
