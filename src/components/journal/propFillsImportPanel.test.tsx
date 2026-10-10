/**
 * "Read a fills file" in the owner's prop desk: the browser reads the file, the one owner parses it,
 * and its words are shown verbatim. Every figure in this file is synthetic.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PROP_DAY_RULE_WORDS } from "@/lib/journal/propFillsImport";
import { readPropStored, PROP_STORAGE_KIND, propSampleInputs } from "@/lib/journal/propEvaluation";

import { PROP_SAMPLE_FILE } from "./PropEvaluationDesk";
import { PROP_DAY_RULE_LABEL, PROP_IMPORT_PRIVACY_LINE, PROP_IMPORT_ZONES, PropFillsImportPanel, readPropImport } from "./PropFillsImportPanel";

// Scan-proof: the sources this file reads are really there (kept above any regex-heavy block).
it("the scanned sources are not empty", () => {
  const size = (p: string) => readFileSync(path.resolve(process.cwd(), "src", p), "utf8").length;
  expect(size("components/journal/PropFillsImportPanel.tsx")).toBeGreaterThan(1000);
  expect(size("components/journal/PropEvaluationDesk.tsx")).toBeGreaterThan(1000);
});

const FILE = { name: PROP_SAMPLE_FILE.name, text: PROP_SAMPLE_FILE.text };
const AT = PROP_SAMPLE_FILE.openedAtMs;

describe("the reading the panel shows", () => {
  it("a file whose times carry no zone is refused in the owner's words until the trader names the zone", () => {
    const r = readPropImport(FILE, "", "ET_CALENDAR_DAY", AT)!;
    expect(r).toEqual({ ok: false, reason: "This file's times carry no time zone. Say which zone the export was made in (the platform's display zone) and open it again." });
    expect(PROP_IMPORT_ZONES[0]).toEqual({ id: "", label: "The times in the file name their own zone" });
    expect(PROP_IMPORT_ZONES.map(z => z.id)).toContain("America/Chicago");
  });
  it("with the zone: fills, the PARTIAL disclosure, BEFORE commissions, days — all from the owner", () => {
    const r = readPropImport(FILE, "America/Chicago", "ET_CALENDAR_DAY", AT)!;
    if (!r.ok) throw new Error(r.reason);
    expect(r.imp.fills).toHaveLength(4);
    expect(r.imp.disclosure).toBe("PARTIAL: read 4 of 5 rows. Skipped 1: 1 with no fill price.");
    expect(r.daily.basis).toBe("BEFORE_COMMISSIONS");
    expect(r.basisWords).toBe("BEFORE commissions");
    expect(r.daily.days.map(d => d.date)).toEqual(["2026-01-05", "2026-01-06"]);
    expect(r.daily.days.every(d => Number.isInteger(d.netCents))).toBe(true);
    expect(r.daily.days[0]!.netCents).toBeGreaterThan(0);
    expect(r.daily.days[1]!.netCents).toBeLessThan(0);
    expect(r.source).toBe(`${r.imp.provenance} · Eastern calendar day · BEFORE commissions`);
    expect(r.imp.provenance).toMatch(/^imported file · SAMPLE-fills\.csv · as of /);
    expect(readPropImport(null, "America/Chicago", "ET_CALENDAR_DAY", AT)).toBeNull();
  });
  it("the day rule is the trader's switch: the same file, counted under each rule, with the owner's sentence", () => {
    const late = { name: "late.csv", text: "Timestamp,Contract,B/S,Quantity,Price\n01/05/2026 18:30:00,MNQH6,Buy,1,21000\n01/05/2026 18:45:00,MNQH6,Sell,1,21010" };
    const cal = readPropImport(late, "America/New_York", "ET_CALENDAR_DAY", AT)!;
    const cme = readPropImport(late, "America/New_York", "CME_TRADING_DAY", AT)!;
    if (!cal.ok || !cme.ok) throw new Error("late file did not read");
    expect(cal.daily.days.map(d => d.date)).toEqual(["2026-01-05"]);
    expect(cme.daily.days.map(d => d.date)).toEqual(["2026-01-06"]);
    expect(cme.daily.notes[0]).toBe(`Day rule: ${PROP_DAY_RULE_WORDS.CME_TRADING_DAY}.`);
    expect(PROP_DAY_RULE_LABEL).toEqual({ ET_CALENDAR_DAY: "Eastern calendar day", CME_TRADING_DAY: "Futures day (a new day from 6:00 PM ET)" });
  });
});

describe("the panel on glass", () => {
  it("empty: the privacy line, the file control, the zone chooser, the day-rule switch with its sentence — no figure", () => {
    const html = renderToStaticMarkup(<PropFillsImportPanel onUseDays={() => {}} />);
    expect(html).toContain(PROP_IMPORT_PRIVACY_LINE);
    expect(html).toContain('data-testid="prop-import-file"');
    expect(html).toContain('type="file"');
    expect(html).toContain('data-testid="prop-import-zone"');
    expect(html.match(/data-testid="prop-import-rule"/g)).toHaveLength(2);
    expect(html).toContain(`Day rule: ${PROP_DAY_RULE_WORDS.ET_CALENDAR_DAY}.`);
    expect(html).not.toMatch(/\$\d/);
    expect(html).not.toContain('data-testid="prop-import-result"');
  });
  it("sample file: provenance, PARTIAL and the commissions basis are printed verbatim; no file picker and no 'use' button", () => {
    const html = renderToStaticMarkup(<PropFillsImportPanel onUseDays={() => {}} sampleFile={PROP_SAMPLE_FILE} />);
    expect(html).toContain("imported file · SAMPLE-fills.csv · as of ");
    expect(html).toMatch(/data-testid="prop-import-partial"[^>]*>PARTIAL: read 4 of 5 rows\. Skipped 1: 1 with no fill price\./);
    expect(html).toMatch(/data-testid="prop-import-basis"[^>]*>each day is BEFORE commissions/);
    expect(html).toContain("Commissions are UNREPORTED in this file, so each day is BEFORE commissions");
    expect(html).toContain("It is not the firm&#x27;s statement — read the result back against the firm&#x27;s dashboard.");
    expect(html.match(/data-testid="prop-import-day"/g)).toHaveLength(2);
    expect(html).not.toContain('data-testid="prop-import-file"');
    expect(html).not.toContain('data-testid="prop-import-use"');
  });
});

describe("imported days in the account", () => {
  it("the source line is stored with the days and read back; a malformed one is dropped, not the record", () => {
    const inputs = { ...propSampleInputs(), daysSource: "imported file · SAMPLE-fills.csv · as of Jan 8, 2026 · Eastern calendar day · BEFORE commissions" };
    const back = readPropStored(JSON.parse(JSON.stringify({ kind: PROP_STORAGE_KIND, version: 1, inputs, scenarioRowsCents: [] })))!;
    expect(back.inputs.daysSource).toBe(inputs.daysSource);
    expect(readPropStored({ kind: PROP_STORAGE_KIND, version: 1, inputs: { ...inputs, daysSource: 7 }, scenarioRowsCents: [] })!.inputs.daysSource).toBeUndefined();
  });
  it("source: nothing is uploaded; imported days arrive UNVERIFIED with the file named; a hand edit drops the file's name", () => {
    const read = (p: string) => readFileSync(path.resolve(process.cwd(), "src", p), "utf8");
    const panel = read("components/journal/PropFillsImportPanel.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(panel).toContain("new FileReader()");
    expect(panel).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|FormData|sessionStorage|action=/);
    // The one storage touch is the Journal's own capture hand-off ("Journal this trade"), nothing else.
    expect(panel.match(/localStorage/g)).toHaveLength(1);
    expect(panel).toContain("offerJournalCapture(window.localStorage,");
    const desk = read("components/journal/PropEvaluationDesk.tsx");
    // Through `edit`, which clears the stamp — imported days can never arrive verified.
    expect(desk).toContain("onUseDays={x => edit({ days: x.days, daysSource: x.source,");
    expect(desk).toContain('x.basis === "AFTER_COMMISSIONS" ? { commissionsPerDayCents: null } : {}');
    expect(desk.match(/edit\(\{ daysSource: null,/g)).toHaveLength(4);
    expect(desk).toContain("{PROP_UNVERIFIED} until you read it back against the firm&apos;s dashboard.");
  });
});
