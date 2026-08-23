/**
 * journalToJson — pure JSON exporter for Journal entries.
 *
 * SHIFT-I I-Bkt 11. Complements journalToCsv (I-Bkt 4). CSV is for
 * spreadsheet analysis; JSON is for machine backup / analytics /
 * migration into a future authoritative store. Both go through pure,
 * tested serializers so a founder review can't be silently truncated
 * by an inline export.
 *
 * Rejection guarantees:
 * - Version field embedded so a future importer can detect schema.
 * - Every Proof Lane field emitted by-name; missing fields omitted
 *   entirely (never fabricated defaults).
 * - No functions / class instances leak into the output — plain data.
 */

import type { JournalCsvEntry } from "./journalToCsv";

export interface JournalJsonExport {
  readonly version: string;
  readonly exportedAt: string;
  readonly entryCount: number;
  readonly entries: readonly JournalCsvEntry[];
}

export const JOURNAL_JSON_SCHEMA_VERSION = "1.0.0" as const;

/**
 * Serialize the entry set as a stable JSON document. Order-preserving.
 * The exportedAt timestamp is passed in explicitly so callers can
 * inject a deterministic value in tests (never Date.now() inside the
 * pure serializer).
 */
export function journalToJson(
  entries: readonly JournalCsvEntry[],
  exportedAt: string,
): string {
  const document: JournalJsonExport = {
    version: JOURNAL_JSON_SCHEMA_VERSION,
    exportedAt,
    entryCount: entries.length,
    entries: entries.map(normalize),
  };
  return JSON.stringify(document, null, 2);
}

/**
 * Drop `undefined`-valued fields entirely so the JSON output has no
 * `"dayModel": null` noise for legacy entries. Preserves 0 / false /
 * empty string as-is.
 */
function normalize(e: JournalCsvEntry): JournalCsvEntry {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(e)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out as unknown as JournalCsvEntry;
}
