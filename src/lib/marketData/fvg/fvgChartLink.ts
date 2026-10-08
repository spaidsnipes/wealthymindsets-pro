/**
 * The ONE door from any FVG reader (Scanner, Backtest Lab, Journal) to the chart
 * with that object selected (Garden 19 §22):
 *
 *   /charts?symbol=<sym>&tf=<tf>&on=fvg&select=fvg:<OBJECT_ID>
 *
 * `select=fvg:<OBJECT_ID>` is parsed by proofScene.ts (`selectObject`); `on=fvg`
 * is the chart lane's layer token (it is ignored until that lane ships it).
 *
 * `band=<bottom>~<top>` (2026-10-08) carries the reader's territory, so the
 * chart can prove a gap read on ANOTHER feed is the same gap (a continuous
 * future "NQ1!" read from history vs the chart's dated "/NQZ26" feed) by
 * overlap — never by a nearest guess (resolveFvgDoorTarget).
 */
import { FVG_BAND_PARAM, fvgBandToken, fvgSelectToken } from "@/lib/chart/proofScene";

export function fvgChartHref(input: {
  readonly symbol: string;
  readonly timeframe: string;
  readonly objectId: string;
  readonly territory?: { readonly bottom: number; readonly top: number } | null;
}): string {
  const q = new URLSearchParams({ symbol: input.symbol, tf: input.timeframe, on: "fvg", select: fvgSelectToken(input.objectId) });
  const t = input.territory;
  if (t && Number.isFinite(t.bottom) && Number.isFinite(t.top) && t.top > t.bottom) q.set(FVG_BAND_PARAM, fvgBandToken(t));
  return `/charts?${q.toString()}`;
}
