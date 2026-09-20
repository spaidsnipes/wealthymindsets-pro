/**
 * An affirmative wire claim must name the instrument it proved.
 *
 * See `wireProofScope.ts` for the measured gap. In short: the strip probes ONE
 * US equity and rendered a provider-level "Ticks receiving" chip, while its
 * detail carefully disclosed every axis of doubt EXCEPT the narrowness of the
 * probe itself.
 *
 * ── ANTI-VACUITY ────────────────────────────────────────────────────────────
 *
 * The one-owner scan at the bottom walks src/ and asserts `offenders` is
 * empty. Two independent ways that goes green while policing nothing:
 *
 *   (a) THE WALK FOUND NOTHING. `productionFiles(SRC)` is now called ONCE at
 *       module level, so the floor below and the rule read the SAME array — a
 *       root drift or a narrowed extension filter cannot make the rule blind
 *       while a second walk reassures us. Measured 2026-09-19: 704 production
 *       .ts/.tsx files under src/.
 *
 *   (b) THE PATTERN WENT STALE, AND THIS ONE HAS A LIVE TRIPWIRE. The banned
 *       literal embedded the ticker `TSLA` by hand — the very duplication this
 *       module exists to abolish. The day WIRE_PROOF_SYMBOL becomes anything
 *       else, a hand-typed scan for TSLA polices a string nobody writes, and
 *       the retyped NEW ticker walks straight through. So the pattern is now
 *       BUILT FROM the owner constant, and the probe-URL shape it anchors on
 *       is asserted to still exist in the real probe sites.
 */

import fs from "node:fs";
import path from "node:path";
import { readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WIRE_PROOF_SYMBOL,
  WIRE_PROOF_SCOPE_NOTE,
  withWireProofScope,
} from "./wireProofScope";
import {
  moomooTickWireView,
  longbridgeTickWireView,
  webullTickWireView,
  type MoomooTickReceipt,
} from "@/components/marketData/ProviderWireStrip";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SRC = path.join(REPO_ROOT, "src");
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** The probe-URL shape the ban anchors on — named once, used by guard and rule. */
const PROBE_URL_PREFIX = "/ticks?symbol=";
/**
 * Built FROM the owner constant, never retyped. A ban that hardcodes the very
 * ticker it forbids others from hardcoding goes stale the moment the owner
 * changes it — and then silently permits the new retyped ticker.
 */
const RETYPED_SYMBOL_PATTERN = new RegExp(
  `${PROBE_URL_PREFIX.replace(/[/?]/g, (c) => "\\" + c)}${WIRE_PROOF_SYMBOL}`,
);

/** The two probe sites that must read the owner instead of retyping the ticker. */
const PROBE_SITES = [
  "src/components/marketData/ProviderWireStrip.tsx",
  "src/components/broker/BrokerConnectPanel.tsx",
] as const;

const receiving: MoomooTickReceipt = {
  label: "RECEIVING",
  receiving: true,
  eventCount: 7,
  detail: "seven prints",
};

describe("the affirmative claim is scoped to the instrument actually probed", () => {
  const views = [
    ["moomoo", moomooTickWireView(receiving)],
    ["longbridge", longbridgeTickWireView(receiving)],
    ["webull", webullTickWireView(receiving)],
  ] as const;

  it("THE DEFECT: the chip said 'Ticks receiving' about a wire, from one equity", () => {
    for (const [name, view] of views) {
      expect(view.label, `${name}: the chip must name the proved instrument`)
        .toContain(WIRE_PROOF_SYMBOL);
    }
  });

  it("every affirmative detail names the coverage it does NOT have", () => {
    for (const [name, view] of views) {
      expect(view.detail, `${name} must disclose the probe's narrowness`)
        .toContain(WIRE_PROOF_SCOPE_NOTE);
      expect(view.detail, `${name} must name the unproven classes`)
        .toMatch(/futures, forex, crypto and index coverage on this wire is UNPROVEN/);
    }
  });

  it("keeps each provider's OWN disclosures — the scope note is added, not swapped", () => {
    // Regression guard: these sentences were the result of earlier atoms and
    // must not be quietly replaced by the new one.
    expect(moomooTickWireView(receiving).detail).toContain("real-time entitlement not certified");
    expect(longbridgeTickWireView(receiving).detail).toContain("accepted Longbridge executed prints");
    expect(webullTickWireView(receiving).detail).toContain("provider-signed side");
    expect(webullTickWireView(receiving).detail).toContain("streaming continuity not certified");
  });

  it("does NOT bolt a coverage caveat onto a negative state", () => {
    // "Not configured" proved nothing, so a coverage caveat would dilute a
    // clear negative with an irrelevant one.
    const off = moomooTickWireView({ label: "NOT CONFIGURED", detail: "no bridge url" });
    expect(off.label).toBe("Not configured");
    expect(off.detail).not.toContain(WIRE_PROOF_SCOPE_NOTE);

    const blocked = webullTickWireView({ label: "ENTITLEMENT BLOCKED", detail: "denied" });
    expect(blocked.label).toBe("Entitlement blocked");
    expect(blocked.detail).not.toContain(WIRE_PROOF_SCOPE_NOTE);
  });

  it("withWireProofScope composes one sentence, not a double full stop", () => {
    expect(withWireProofScope("three prints.")).toBe(`three prints · ${WIRE_PROOF_SCOPE_NOTE}.`);
    expect(withWireProofScope("  three prints  ")).toBe(`three prints · ${WIRE_PROOF_SCOPE_NOTE}.`);
    expect(withWireProofScope("x").match(/\.\./g)).toBeNull();
  });
});

describe("the receiving test reads the RECEIPT, not the rendered chip text", () => {
  it("a receipt that is not receiving never reaches the affirmative arm", () => {
    // Each of the three guards must hold independently.
    for (const partial of [
      { label: "RECEIVING", receiving: false, eventCount: 7 },
      { label: "RECEIVING", receiving: true, eventCount: 0 },
      { label: "NO EVENTS RECEIVED", receiving: true, eventCount: 7 },
    ] as MoomooTickReceipt[]) {
      expect(moomooTickWireView(partial).label).not.toContain(WIRE_PROOF_SYMBOL);
    }
  });

  it("the chip text is not load-bearing control flow", () => {
    // longbridge/webull used to re-detect "is this receiving?" by comparing the
    // composed view's label to the literal "Ticks receiving". Renaming the chip
    // would then have silently switched both onto their fallback detail — which
    // is exactly what this atom's rename would have done.
    const code = stripComments(read("src/components/marketData/ProviderWireStrip.tsx"));
    expect(code, "a display string must not be a branch condition")
      .not.toMatch(/view\.label === "Ticks receiving"/);
    expect(code).toMatch(/receiptIsReceiving\(receipt\)/);
  });
});

/** Production files only — tests legitimately name symbols as fixtures. */
function productionFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules" || name === ".next" || name === "__tests__") continue;
      out.push(...productionFiles(p));
      continue;
    }
    if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** Walked ONCE: the floor below and the scan inspect the same array. */
const ALL_PRODUCTION_FILES = productionFiles(SRC);

describe("the one-owner scan is not vacuous", () => {
  it("the walk really reaches src/ — measured 704 production files", () => {
    // Floor sits far below the measured count: it catches a COLLAPSE (root
    // drift, narrowed extension filter), not ordinary growth or pruning.
    expect(ALL_PRODUCTION_FILES.length, `productionFiles(${SRC}) collapsed — the scan below sees nothing`)
      .toBeGreaterThan(400);
    for (const rel of PROBE_SITES) {
      expect(ALL_PRODUCTION_FILES, `${rel} is not in the scanned set`).toContain(path.join(REPO_ROOT, rel));
    }
  });

  it("POSITIVE CONTROL: the probe-URL shape the ban anchors on is still live", () => {
    // The ban matches `/ticks?symbol=<owner symbol>`. If the route shape
    // changes (query renamed, path moved), the scan matches nothing forever
    // while a retyped ticker sits in the new URL untouched.
    const live = ALL_PRODUCTION_FILES.filter((abs) =>
      stripComments(fs.readFileSync(abs, "utf8")).includes(PROBE_URL_PREFIX),
    );
    expect(live.length, `no production file builds a "${PROBE_URL_PREFIX}" URL any more — ` +
      "the ban below is anchored on a route shape that no longer exists").toBeGreaterThan(0);
  });

  it("POSITIVE CONTROL: the ban is built from the owner, so it cannot name a dead ticker", () => {
    expect(WIRE_PROOF_SYMBOL, "the owner exports no probe symbol").toMatch(/^[A-Z0-9.=!-]{1,12}$/);
    // The scan must recognise the exact retyping it forbids, spelled with the
    // CURRENT owner value rather than a literal frozen at authoring time.
    const retyped = `const u = \`/api/market-data/\${s}${PROBE_URL_PREFIX}${WIRE_PROOF_SYMBOL}\`;`;
    expect(RETYPED_SYMBOL_PATTERN.test(stripComments(retyped))).toBe(true);
  });
});

describe("one owner for the probed symbol", () => {
  it("no production file hardcodes the probe symbol into a tick URL", () => {
    // It was retyped in the strip's probe URL, in BrokerConnectPanel's probe
    // URL, and in that panel's user-facing copy — three places that had to
    // agree, with nothing making them.
    const offenders: string[] = [];
    for (const abs of ALL_PRODUCTION_FILES) {
      if (abs.endsWith("wireProofScope.ts")) continue;
      const code = stripComments(fs.readFileSync(abs, "utf8"));
      if (RETYPED_SYMBOL_PATTERN.test(code)) offenders.push(path.relative(REPO_ROOT, abs));
    }
    expect(
      offenders,
      "Import WIRE_PROOF_SYMBOL from @/lib/marketData/wireProofScope instead of " +
        "retyping the ticker. The probe symbol and the disclosure that names it " +
        "must never be able to disagree.",
    ).toEqual([]);
  });

  it("the scan is not vacuous — it can see a violation when one exists", () => {
    const sample = 'const u = `/api/market-data/${s}/ticks?symbol=TSLA`;';
    expect(
      RETYPED_SYMBOL_PATTERN.test(stripComments(sample)),
      `the frozen TSLA specimen no longer matches: WIRE_PROOF_SYMBOL is now "${WIRE_PROOF_SYMBOL}". ` +
        "The scan follows the owner, but this specimen does not — retype it with the new ticker " +
        "and re-audit every place the old one was hardcoded.",
    ).toBe(true);
  });

  it("both probe sites now read the owner", () => {
    for (const rel of PROBE_SITES) {
      expect(stripComments(read(rel)), `${rel} must import the owner`)
        .toMatch(/WIRE_PROOF_SYMBOL/);
    }
  });
});
