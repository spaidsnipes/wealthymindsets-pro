export interface IdentifiedOptionSpot {
  readonly symbol: string;
  readonly price: number;
}

/** A number is not an option-chain spot until it belongs to the current
 * underlying. This prevents the prior ticker render from narrowing the next
 * symbol's provider request during a symbol transition. */
export function identifiedOptionSpot(
  currentSymbol: string,
  observedSymbol: string,
  price: number,
): IdentifiedOptionSpot | null {
  const current = currentSymbol.trim().toUpperCase();
  const observed = observedSymbol.trim().toUpperCase();
  if (!current || current !== observed || !Number.isFinite(price) || price <= 0) {
    return null;
  }
  return { symbol: current, price };
}
