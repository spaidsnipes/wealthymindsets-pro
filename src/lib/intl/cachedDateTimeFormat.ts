/**
 * ONE Intl.DateTimeFormat PER SHAPE (perf 2026-10-26). Building a formatter is far
 * dearer than formatting with one, and the chart room prints clocks on every render
 * (fmtClock / fmtBarTime / the Inspect Ticket's zoned clock: ~34 ms of main thread
 * per second on BTC 1m at 40 prints/s). Same locale + options → the same formatter,
 * so the same strings. A bad timeZone still throws exactly as `new` does, and is
 * not cached.
 */
const cache = new Map<string, Intl.DateTimeFormat>();
const MAX = 256;

export function cachedDateTimeFormat(locale: string, options: Intl.DateTimeFormatOptions = {}): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    if (cache.size >= MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, f);
  }
  return f;
}
