/**
 * The ONE door from any FVG reader (Scanner, Backtest Lab, Journal) to the chart
 * with that object selected (Garden 19 §22):
 *
 *   /charts?symbol=<sym>&tf=<tf>&on=fvg&select=fvg:<OBJECT_ID>
 *
 * `select=fvg:<OBJECT_ID>` is parsed by proofScene.ts (`selectObject`); `on=fvg`
 * is the chart lane's layer token (it is ignored until that lane ships it).
 */
import { fvgSelectToken } from "@/lib/chart/proofScene";

export function fvgChartHref(input: { readonly symbol: string; readonly timeframe: string; readonly objectId: string }): string {
  const q = new URLSearchParams({ symbol: input.symbol, tf: input.timeframe, on: "fvg", select: fvgSelectToken(input.objectId) });
  return `/charts?${q.toString()}`;
}
