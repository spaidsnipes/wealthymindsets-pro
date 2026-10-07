/**
 * A wire summary as plain words. Finnhub's general feed passes some
 * publishers' HTML through: serving /news 2026-10-07 printed a Forexlive item
 * as "<p>The USDCAD has been on a steady climb…" — the tag on the glass. The
 * RSS route already strips markup server-side; the Finnhub path did not.
 * Tags are removed, the common entities decoded once, whitespace collapsed.
 * PURE.
 */
const ENTITIES: Readonly<Record<string, string>> = { "&nbsp;": " ", "&quot;": "\"", "&#39;": "'", "&apos;": "'", "&lt;": "<", "&gt;": ">" };

export function plainSummary(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&(nbsp|quot|#39|apos|lt|gt);/g, m => ENTITIES[m] ?? m)
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
