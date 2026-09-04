/**
 * Provider JSON often encodes decimals as strings. `parseFloat` is unsafe at
 * this boundary because it accepts a numeric prefix (`"10.5junk"` -> 10.5).
 * Return null unless the entire finite decimal/scientific value is observed.
 */
export function strictProviderNumber(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}
