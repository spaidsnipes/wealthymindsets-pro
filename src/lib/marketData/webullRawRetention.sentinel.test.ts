/**
 * GP12 §21 — LIVE CONSUMPTION RIGHTS ≠ STORAGE RIGHTS ≠ REDISTRIBUTION RIGHTS.
 *
 * "Before durably storing raw Webull ticks, depth, order book or full trade
 * stream in Supabase or another history store: prove the approved agreement
 * permits that retention. If raw retention rights are unknown or restricted,
 * do not silently build an unlimited tick warehouse."
 *
 * Measured 2026-09-26: no module stores raw Webull prints. Webull's own terms
 * for OpenAPI stock data are a NON-DISPLAY subscription (API Keys page), and
 * no retention right is proven. This sentinel keeps it that way: any file that
 * touches Webull's raw print or quote lanes may not also write to a durable
 * store. Lifting it needs the agreement, not a code review.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== "node_modules") walk(p, out); continue; }
    if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Symbols that hand back raw Webull prints, quotes or depth. */
const RAW_LANE = /\b(parseWebullTickEnvelope|fetchWebullTickSnapshot|WEBULL_SDK_CONTRACT\.(STOCK_TICKS|STOCK_SNAPSHOTS|STOCK_DEPTHS|STREAMING_SUBSCRIBE)|webullQuotesStream)\b/;
/** Durable writes: Supabase rows, KV, browser storage, files. */
const DURABLE_WRITE = /\.(insert|upsert)\(|\bkv\.put\(|\.put\(\s*[`'"]webull:(tick|tape|print|quote)|localStorage\.setItem\(|indexedDB\.open\(|writeFile(Sync)?\(/;

describe("GP12 §21 — no raw Webull market data is retained without proven rights", () => {
  const files = walk(SRC).map(f => ({ rel: relative(SRC, f), code: strip(readFileSync(f, "utf8")) }));

  it("the raw lanes exist (the sentinel is looking at something)", () => {
    expect(files.filter(f => RAW_LANE.test(f.code)).length).toBeGreaterThanOrEqual(2);
  });

  it("no file that reads a raw Webull lane also writes to a durable store", () => {
    const offenders = files.filter(f => RAW_LANE.test(f.code) && DURABLE_WRITE.test(f.code)).map(f => f.rel);
    expect(offenders, "raw Webull prints/quotes next to a durable write — prove retention rights first (GP12 §21)").toEqual([]);
  });
});
