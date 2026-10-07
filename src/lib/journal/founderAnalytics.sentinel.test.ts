/**
 * §I PERSONAL ANALYTICS stays owner-only, read-only and honest. Source
 * breadcrumbs plus a server render of the panel (node environment).
 *
 * Fails if:
 *   A. the panel fetches anything itself (it must render only what the
 *      owner-gated ledger reads returned), or gains a broker write;
 *   B. it renders for a reader with no broker trips (a guest);
 *   C. a pattern under 20 records stops saying INSUFFICIENT EVIDENCE, or the
 *      model tags stop saying PROPOSED.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FounderAnalytics } from "@/components/journal/FounderAnalytics";
import { readTastytradeFills } from "@/lib/broker/tastytradeFills";
import { buildTtRoundTrips } from "@/lib/broker/tastytradeLedger";

const SRC = path.resolve(__dirname, "../..");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("A. no fetch, no broker write", () => {
  const panel = strip(readFileSync(path.join(SRC, "components/journal/FounderAnalytics.tsx"), "utf8"));
  const pure = strip(readFileSync(path.join(SRC, "lib/journal/founderAnalytics.ts"), "utf8"));
  it("the panel and the classifier never fetch or write to a broker", () => {
    for (const s of [panel, pure]) expect(s).not.toMatch(/fetch\(|\/api\/broker|order-submit|method:/);
  });
  it("the ledger hands its own read to the panel (one read, the owner-gated route)", () => {
    const ledger = strip(readFileSync(path.join(SRC, "components/journal/WebullLifetimeLedger.tsx"), "utf8"));
    expect(ledger).toContain("<TastytradeLedger onAccounts={setTtAccounts} />");
    expect(ledger).toMatch(/<FounderAnalytics episodes=\{data\?\.state === "OK" && !data\.partial \? data\.episodes \?\? \[\] : \[\]\} ttAccounts=\{ttAccounts\} \/>/);
  });
});

describe("B/C. renders only with broker trips; PROPOSED and INSUFFICIENT EVIDENCE are said", () => {
  it("no trips (a guest, or nothing read yet) → nothing", () => {
    expect(renderToStaticMarkup(React.createElement(FounderAnalytics, { episodes: [], ttAccounts: [] }))).toBe("");
  });
  it("with a tastytrade round trip → the panel, PROPOSED, UNCLASSIFIED without a record, INSUFFICIENT EVIDENCE", () => {
    const trips = buildTtRoundTrips(readTastytradeFills([
      { id: 1, "transaction-type": "Trade", "order-id": 1, symbol: "/MNQZ6", action: "Buy to Open", quantity: "1", price: "1", value: "0", "executed-at": "2026-10-06T14:00:00Z" },
      { id: 2, "transaction-type": "Trade", "order-id": 2, symbol: "/MNQZ6", action: "Sell to Close", quantity: "1", price: "2", value: "2", "value-effect": "Credit", "executed-at": "2026-10-06T14:05:00Z" },
    ]));
    const html = renderToStaticMarkup(React.createElement(FounderAnalytics, { episodes: [], ttAccounts: [{ tail: "5678", fills: 2, trips }] }));
    expect(html).toContain('data-testid="founder-analytics"');
    expect(html).toContain("MODEL 1 / MODEL 2 · PROPOSED");
    expect(html).toMatch(/Unclassified <b>1<\/b> of 1 closed trades/);
    expect(html).toMatch(/data-state="INSUFFICIENT EVIDENCE"/);
    expect(html).not.toMatch(/data-state="MEASURED"/);
    expect(html).toMatch(/data-provenance="PROVIDER-RETRIEVED">PROVIDER-RETRIEVED <b>2<\/b>/);
  });
});
