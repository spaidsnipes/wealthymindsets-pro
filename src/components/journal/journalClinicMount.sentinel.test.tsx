/**
 * Megazord §5: a trade taken elsewhere is still learned from. Every Journal entry — broker-confirmed
 * or self-reported — opens the same Diagnostic Clinic as a Webull ledger episode, under its own key,
 * and the Clinic never writes in a proof scene.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { journalClinicKey } from "@/lib/journal/captureReviewEvidence";
import { DiagnosticClinic } from "./DiagnosticClinic";

const read = (p: string) => readFileSync(path.resolve(process.cwd(), "src", p), "utf8");
const page = read("app/journal/page.tsx");
const clinic = read("components/journal/DiagnosticClinic.tsx");

it("the scanned sources are not empty", () => {
  expect(page.length).toBeGreaterThan(1000);
  expect(clinic.length).toBeGreaterThan(1000);
});

describe("the Clinic on a Journal entry", () => {
  it("is mounted in the entry detail, after the review, keyed by journalClinicKey — no capture required", () => {
    const review = page.indexOf('data-testid="journal-entry-review"');
    const mount = page.indexOf("<DiagnosticClinic key={journalReviewKey(selected)} episodeId={journalClinicKey(selected)} />");
    expect(review).toBeGreaterThan(0);
    expect(mount).toBeGreaterThan(review);
    const around = page.slice(review, mount);
    expect(around).not.toMatch(/selected\.capture\s*\?\s*\(?\s*<DiagnosticClinic/);
  });
  it("a self-reported entry gets its own namespaced key; a captured one follows the broker story", () => {
    expect(journalClinicKey({ id: "e-17" })).toBe("journal-entry:journal|e-17");
    const capture = { decisionId: { value: "D-9" }, account: { value: "…4321" }, broker: { value: "tastytrade" } };
    expect(journalClinicKey({ id: "e-18", capture } as unknown as Parameters<typeof journalClinicKey>[0])).toBe("journal-entry:tastytrade|4321|D-9");
  });
  it("renders collapsed with nothing filled", () => {
    const html = renderToStaticMarkup(<DiagnosticClinic episodeId={journalClinicKey({ id: "e-1" })} />);
    expect(html).toContain('data-testid="diagnostic-clinic"');
    expect(html).toContain("market 0/6");
    expect(html).toContain('aria-expanded="false"');
  });
  it("holds every write in a proof scene: the guard returns before localStorage is touched", () => {
    const write = clinic.slice(clinic.indexOf("const write"), clinic.indexOf("const p = clinicProgress"));
    const guard = write.indexOf("if (proofSceneHoldsWrites()) return;");
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(write.indexOf("localStorage.setItem"));
  });
});

describe("the completeness line on a Journal entry", () => {
  it("sits under the provenance line, for every entry", () => {
    const prov = page.indexOf("<EntryProvenanceLine venue={selected.venue}");
    const line = page.indexOf("<EntryCompletenessLine entry={selected} />");
    expect(prov).toBeGreaterThan(0);
    expect(line).toBeGreaterThan(prov);
    expect(line - prov).toBeLessThan(400);
  });
  it("renders the gaps for a bare entry and a plain line for a full one", async () => {
    const { EntryCompletenessLine } = await import("./TradeVenue");
    const bare = renderToStaticMarkup(<EntryCompletenessLine entry={{ processQuality: "UNRESOLVED", setup: "", lessons: "" }} />);
    expect(bare).toContain('data-complete="no"');
    expect(bare).toContain("Planned R (1R = $)");
    const done = renderToStaticMarkup(<EntryCompletenessLine entry={{ processQuality: "FOLLOWED_PLAN", realizedR: 1, mfeR: 1, setup: "x", lessons: "y" }} />);
    expect(done).toContain('data-complete="yes"');
    expect(done).not.toContain("<li");
  });
});

describe("the Clinic fits a phone", () => {
  it("its fields can shrink inside the grid (an input's intrinsic width pushed the chain to 461px at 390)", () => {
    expect(clinic).toMatch(/<label key=\{f\.id\} style=\{\{[^}]*minWidth: 0/);
    expect(clinic).toMatch(/<input[\s\S]{0,300}?width: "100%", minWidth: 0, boxSizing: "border-box"/);
  });
});
