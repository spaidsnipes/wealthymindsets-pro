/** A provider answer belongs only to the hook generation that requested it.
 * Cleanup and a current-symbol comparison are both required: a late promise
 * can settle after React has already rendered the next symbol. */
export function quoteRoundIsCurrent(
  startedSymbol: string,
  activeSymbol: string,
  disposed: boolean,
): boolean {
  return !disposed
    && startedSymbol.trim().toUpperCase() === activeSymbol.trim().toUpperCase();
}
