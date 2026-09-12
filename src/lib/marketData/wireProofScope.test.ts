/**
 * An affirmative wire claim must name the instrument it proved.
 *
 * See `wireProofScope.ts` for the measured gap. In short: the strip probes ONE
 * US equity and rendered a provider-level "Ticks receiving" chip, while its
 * detail carefully disclosed every axis of doubt EXCEPT the narrowness of the
 * probe itself.
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

describe("one owner for the probed symbol", () => {
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

  it("no production file hardcodes the probe symbol into a tick URL", () => {
    // It was retyped in the strip's probe URL, in BrokerConnectPanel's probe
    // URL, and in that panel's user-facing copy — three places that had to
    // agree, with nothing making them.
    const offenders: string[] = [];
    for (const abs of productionFiles(SRC)) {
      if (abs.endsWith("wireProofScope.ts")) continue;
      const code = stripComments(fs.readFileSync(abs, "utf8"));
      if (/\/ticks\?symbol=TSLA/.test(code)) offenders.push(path.relative(REPO_ROOT, abs));
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
    expect(/\/ticks\?symbol=TSLA/.test(stripComments(sample))).toBe(true);
  });

  it("both probe sites now read the owner", () => {
    for (const rel of [
      "src/components/marketData/ProviderWireStrip.tsx",
      "src/components/broker/BrokerConnectPanel.tsx",
    ]) {
      expect(stripComments(read(rel)), `${rel} must import the owner`)
        .toMatch(/WIRE_PROOF_SYMBOL/);
    }
  });
});
