import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * MEASURED /charts 2026-09-08, 13s across a real client-side route re-mount:
 *
 *   moomoo:AMZN      12 requests   min gap  1ms
 *   longbridge:AMZN   6 requests   min gap  6ms
 *   webull:AMZN       6 requests   min gap 16ms
 *
 * Six identical moomoo requests inside 28ms (t = 58, 60, 77, 84, 85, 86),
 * repeating every round. Six live hook instances, each running the full
 * provider chain for the same symbol, each guarded only by its own
 * `moomooInFlight` — which cannot see across instances.
 */

const HOOK = fs.readFileSync(
  path.join(process.cwd(), "src/hooks/useWebSocket.ts"),
  "utf8",
);
const CODE = HOOK
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("provider tick rounds are shared across hook instances", () => {
  it("the tick poll joins a shared round instead of starting its own", () => {
    expect(CODE).toContain('from "@/lib/marketData/inFlightRounds"');
    expect(CODE).toMatch(/providerTickRounds\.run\(`ticks:\$\{symbol\}`/);
  });

  it("ticks and quotes never share an identity space", () => {
    // Two separate InFlightRounds instances AND a namespaced key. Either alone
    // would be enough; both are cheap and the failure mode — a quote round
    // answering a tick round's question — is silent and awful.
    expect(CODE).toContain("const providerTickRounds = new InFlightRounds()");
    expect(CODE).toContain("ticks:");
    expect(CODE).toContain("coalesceQuoteRequest(sym,");
  });

  it("the shared chain closes over NO per-instance lifecycle flag", () => {
    /**
     * THE load-bearing test of this atom.
     *
     * The chain used to close over the effect's `disposed`. Shared, that would
     * carry ONE instance's lifecycle into every joiner's answer: if the
     * instance that started the round unmounted mid-flight, its `disposed`
     * would short-circuit longbridge and webull to `[]` and null the moomoo
     * body, and every still-mounted joiner would receive that emptiness as the
     * provider's verdict — an absence of data manufactured by an unrelated
     * component's unmount.
     */
    const start = CODE.indexOf("function fetchProviderTickSelection");
    expect(start).toBeGreaterThan(-1);
    const end = CODE.indexOf("\nfunction fetchProviderTicks", start);
    expect(end).toBeGreaterThan(start);
    const chain = CODE.slice(start, end);

    expect(chain).not.toContain("disposed");
    expect(chain).not.toContain("moomooInFlight");
    expect(chain).not.toContain("moomooAbort");
    // It is module scope, so it cannot reach a hook local even by accident.
    expect(CODE.indexOf("function fetchProviderTickSelection"))
      .toBeLessThan(CODE.indexOf("export function useWebSocket"));
  });

  it("disposal is applied by each consumer to the RESULT", () => {
    // The guard did not disappear; it moved to where it is true.
    expect(CODE).toMatch(/await fetchProviderTicks\(symbol, moomooAbort\.signal\);\s*\n\s*if \(disposed\) return;/);
  });

  it("the per-instance overlap guard is RETAINED", () => {
    // Shared rounds stop instances duplicating each other. They do not stop one
    // instance overlapping itself, and the visibility verdict still needs an
    // honest IN_FLIGHT answer.
    expect(CODE).toContain("moomooInFlight");
  });

  it("the moomoo visibility handler consults the owner and its own cadence", () => {
    // This handler was bare — "visible? poll." — in the same file whose OTHER
    // handler 6e2c817 fixed. It must top up the backing-off moomoo cadence,
    // never the 10s default.
    const start = CODE.indexOf("const onVisibleMoomoo");
    expect(start).toBeGreaterThan(-1);
    const handler = CODE.slice(start, CODE.indexOf("};", start));
    expect(handler).toContain("selectVisibilityRefetch({");
    expect(handler).toContain("intervalMs: moomooIntervalMs");
    expect(handler).toContain("lastRoundStartedAt: moomooLastRoundStartedAt");
  });

  it("the moomoo cadence tracked for the handler is the one actually scheduled", () => {
    // If these two ever diverge, the handler tops up a clock nothing polls on.
    expect(CODE).toMatch(/moomooIntervalMs = nextDelayMs;\s*\n\s*scheduleMoomooPoll\(nextDelayMs\);/);
  });
});
