export interface HeatmapAggregateSummary {
  value: number | null;
  observedCount: number;
  totalCount: number;
}

export function readObservedChange(
  pcts: Readonly<Record<string, number | undefined>>,
  sym: string,
): number | null {
  const value = pcts[sym];
  return Object.prototype.hasOwnProperty.call(pcts, sym) && Number.isFinite(value)
    ? value as number
    : null;
}

export function summarizeObservedChange(
  stocks: ReadonlyArray<{ sym: string }>,
  pcts: Readonly<Record<string, number | undefined>>,
): HeatmapAggregateSummary {
  const observed = stocks.flatMap(({ sym }) => {
    const value = readObservedChange(pcts, sym);
    return value === null ? [] : [value];
  });

  return {
    value: observed.length > 0
      ? observed.reduce((sum, value) => sum + value, 0) / observed.length
      : null,
    observedCount: observed.length,
    totalCount: stocks.length,
  };
}
