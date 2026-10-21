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
