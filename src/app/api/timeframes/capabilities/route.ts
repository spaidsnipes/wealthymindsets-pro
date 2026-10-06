import { NextResponse } from "next/server";

/**
 * Candle-envelope capability probe read by `YahooCandleConsumer.initialize()`
 * (src/lib/yahooCandleConsumer.ts) before its first /api/yahoo candle request.
 *
 * The consumer latches "typed-required" only when this answers
 * `candleEnvelopeVersion === 1`. /api/yahoo does not emit the typed envelope or
 * the `X-WM-Candle-Envelope-Version` header today, so the honest answer is 0:
 * legacy-compatible. Until 2026-10-06 this route did not exist and every
 * /scanner load logged a 404 for the probe (signed-in prod sweep); the consumer
 * already tolerated that, but a red 404 on every visit hides real failures.
 *
 * If /api/yahoo ever ships the v1 envelope + header, bump this in the SAME
 * change — advertising 1 without the header would make the consumer reject
 * every candle payload as malformed.
 */
const CANDLE_ENVELOPE_VERSION = 0;

export function GET() {
  return NextResponse.json(
    { candleEnvelopeVersion: CANDLE_ENVELOPE_VERSION, mode: "legacy-compatible" },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
