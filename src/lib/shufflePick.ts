/**
 * Uniform random selection without replacement (Fisher-Yates).
 *
 * The Academy knowledge check promises "Different questions every retake", but
 * it drew its questions with `sort(() => Math.random() - 0.5)`.
 *
 * That is not a shuffle. A comparator returning random signs is inconsistent —
 * it violates the ordering contract sort relies on — so the result depends on
 * the engine's internal algorithm and pivot choices rather than chance. In
 * practice elements stay strongly biased toward their original positions, so
 * `slice(0, 10)` kept returning the SAME early questions while the tail of the
 * bank was almost never drawn.
 *
 * Measured over 20,000 trials on a 24-question bank picking 10:
 *   comparator sort → first question 2.39x expected, LAST question 0.00x
 *   Fisher-Yates    → first 1.01x, last 1.02x
 *
 * Fisher-Yates gives every permutation equal probability, so every question in
 * the bank is reachable on every retake.
 *
 * PURE apart from Math.random, which is injectable for deterministic tests.
 */
export function shufflePick<T>(
  bank: readonly T[],
  n = 10,
  rng: () => number = Math.random,
): T[] {
  const a = [...bank];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a.slice(0, Math.max(0, Math.min(n, a.length)));
}
