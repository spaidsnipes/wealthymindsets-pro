/**
 * ONE TIMEFRAME REGISTRY, MANY CONSUMERS — Garden 16 §22 (2026-09-26).
 *
 * Master Index, NO SECOND CALCULATOR: "a second timeframe registry" is on the
 * forbidden list, and "bars/timeframes = ONE CanonicalBar + ONE timeframe
 * owner". This lane moved three consumers onto src/lib/timeframes.ts and
 * deleted one orphan list. These locks keep them there.
 *
 * ── SCOPE, STATED RATHER THAN IMPLIED ────────────────────────────────────────
 * The literal-list lock covers the files this lane rewrote. It does NOT cover
 * MainChart.tsx or indicatorConfig.ts, where this lane only removed the
 * unreachable "3Y" keys: their remaining tables (MainChart getIntervalSec, the
 * Polygon map, the bar-count lists, intradayClockTf; tfGroupOf's months
 * regex) give 3M/6M/1Y/2Y/5Y/45m values the registry disagrees with, and those
 * ids are reachable by URL. Folding them into the registry means choosing what
 * those ids MEAN, which is an open Founder decision (TIME_ENGINE_TRUTH §c).
 * The provider tables under src/app/api and yahooTimeframes/exchangeTimeframes
 * are the capability layer canon permits, and are left alone.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const codeOf = (rel: string) =>
  readFileSync(join(process.cwd(), "src", rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** A timeframe token as the repo spells them: 15m, 1h, 1D, 3M, 1Y, 30t, 15s, D, TICK… */
const TF = String.raw`(?:\d+[smhtTDWMQY]|TICK|D|W|M)`;
const ARRAY_LIST = new RegExp(String.raw`\[\s*"${TF}"\s*,\s*"${TF}"`);
const REGEX_ALTERNATION = new RegExp(String.raw`\(\s*${TF}\s*\|\s*${TF}\s*\|`);
const TF_KEY = new RegExp(String.raw`"${TF}"\s*:`, "g");

/** Object-literal tables keyed by ≥2 timeframe ids, with their declared type. */
function timeframeKeyedTables(code: string): { name: string; type: string }[] {
  const out: { name: string; type: string }[] = [];
  const decl = /const\s+(\w+)\s*(?::\s*([^=]+?))?\s*=\s*(?:Object\.freeze\()?\{([^{}]*)\}/g;
  for (const m of code.matchAll(decl)) {
    if ((m[3].match(TF_KEY) ?? []).length >= 2) out.push({ name: m[1], type: (m[2] ?? "").trim() });
  }
  return out;
}

const REWRITTEN = [
  "components/chart/TimeframeGlassChip.tsx",
  "hooks/useWebSocket.ts",
  "lib/marketData/sessionWindow.ts",
  "lib/marketData/liveBarPolicy.ts",
];

describe("no timeframe list outside the registry, in the files this lane rewrote", () => {
  it("the detectors bite (non-vacuity): each one catches the shape it exists for", () => {
    expect(ARRAY_LIST.test('const x = ["1m","2m","5m"];')).toBe(true);
    expect(REGEX_ALTERNATION.test("/^(D|1D|W|1W)$/")).toBe(true);
    expect(timeframeKeyedTables('const m: Record<string, number> = { "1t": 1, "1m": 60 };')).toEqual([{ name: "m", type: "Record<string, number>" }]);
    // …and the registry itself is exactly the kind of file they would flag.
    const registry = codeOf("lib/timeframes.ts");
    expect(ARRAY_LIST.test(registry)).toBe(true);
  });

  it.each(REWRITTEN)("%s carries no array or regex list of timeframe ids", (rel) => {
    const code = codeOf(rel);
    expect(code.length, `${rel} read as empty`).toBeGreaterThan(500);
    expect(code, `${rel} grew an array of timeframe ids`).not.toMatch(ARRAY_LIST);
    expect(code, `${rel} grew a regex alternation of timeframe ids`).not.toMatch(REGEX_ALTERNATION);
  });

  it.each(REWRITTEN)("%s keys any per-timeframe table by the registry's TFId, never by string", (rel) => {
    for (const t of timeframeKeyedTables(codeOf(rel))) {
      expect(t.type, `${rel}: table ${t.name} is keyed by timeframe ids but typed "${t.type || "(untyped)"}"`).toMatch(/Record<TFId\b/);
    }
  });
});

describe("the live forming bar's clock comes from the registry", () => {
  const hook = codeOf("hooks/useWebSocket.ts");

  it("× THE UNREACHABLE TICKS: 1t/5t/30t are gone", () => {
    for (const k of ['"1t"', '"5t"', '"30t"']) expect(hook).not.toContain(k);
  });

  it("× THE SIXTY-SECOND GUESS: no `?? 60` default clocks an unknown id as one-minute bars", () => {
    expect(hook).not.toMatch(/\?\?\s*60\b/);
    expect(hook).toContain("liveBarBucketSec(timeframe)");
    expect(hook).toMatch(/import \{ liveBarBucketSec \} from "@\/lib\/timeframes";/);
  });

  it("every print reaches the bar through applyTickToClock, which builds no bar without a clock", () => {
    expect(hook).not.toMatch(/applyTickToLiveBar\(/);
    expect(hook.match(/applyTickToClock\(/g)).toHaveLength(2);
    // A clockless id publishes null, not an empty object dressed as a bar.
    expect(hook).not.toMatch(/liveBar:\s*\{\s*\.\.\.barUpdate\.bar\s*\}/);
    // The unsigned-observation path publishes once per frame (2026-10-10) and
    // keeps the null rule: no bar → null, never `{ ...null }`.
    expect(hook).toContain("liveBar: bar ? { ...bar } : null");
  });
});

describe("the session clock comes from the registry", () => {
  const sw = codeOf("lib/marketData/sessionWindow.ts");

  it("reads getTimeframe/normalizeTFId, and has no private minutes regex", () => {
    expect(sw).toMatch(/import \{ getTimeframe, normalizeTFId, type TFId \} from "@\/lib\/timeframes";/);
    expect(sw).toContain("export function barMinutesOf(timeframe: string): number | null");
    expect(sw).not.toMatch(/\(m\|h\)/);
  });
});

describe("retired duplicates stay retired", () => {
  it("TimeframeSelector.tsx — the orphan nine-id list — is gone", () => {
    expect(existsSync(join(process.cwd(), "src/components/chart/TimeframeSelector.tsx"))).toBe(false);
  });

  it.each([
    "components/chart/MainChart.tsx",
    "components/chart/indicatorConfig.ts",
    "lib/marketData/sessionWindow.ts",
    "hooks/useWebSocket.ts",
  ])('%s carries no chart-side "3Y" key (not a TFId; no mount could send it)', (rel) => {
    const code = codeOf(rel);
    expect(code.length).toBeGreaterThan(500);
    expect(code).not.toMatch(/["|(]3Y["|)]/);
  });

  it("the public API routes keep their 3Y entries: removing them changes what an external request gets", () => {
    // /api/alpaca's table lives in alpacaBarRoute.ts since 2026-09-26; the
    // route imports it, so an external ?tf=3Y still gets what it got.
    expect(codeOf("lib/marketData/alpacaBarRoute.ts")).toContain('"3Y":');
    expect(codeOf("app/api/alpaca/route.ts")).toContain('from "@/lib/marketData/alpacaBarRoute"');
    expect(codeOf("lib/yahooTimeframes.ts")).toContain('"3Y":');
  });
});
