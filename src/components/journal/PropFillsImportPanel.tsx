"use client";

/**
 * "READ A FILLS FILE" — inside the owner's prop evaluation desk (Garden 19 Supermax §7 / §8).
 *
 * The trader picks a CSV the trading platform exported. The browser reads it (FileReader) and
 * propFillsImport — the one owner — turns it into fills and daily results. NOTHING IS UPLOADED:
 * this file has no request of any kind, and the text is held in memory only for this visit.
 *
 * Shown verbatim from the owner: the provenance line, the PARTIAL disclosure, every note (day rule,
 * BEFORE / AFTER commissions, open-at-end, unpriced). The trader then chooses to put the days into
 * the account's daily list — where they are UNVERIFIED like every other figure, with the file named.
 */

import React, { useMemo, useState } from "react";

import { formatCents, type PropDay } from "@/lib/journal/propEvaluation";
import { PROP_DAY_RULE_WORDS, importPropFills, propDailyResults, type PropDayRule } from "@/lib/journal/propFillsImport";

const GOLD = "#c9a55c", MUTED = "#9a927f", INK = "#ede6d3", LINE = "rgba(139,106,41,0.35)", AMBER = "#d9a441", RED = "#d97a6c";
const FIELD: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: `1px solid ${LINE}`, borderRadius: 6, color: INK, fontSize: 13, padding: "6px 8px", minHeight: 44, width: "100%", boxSizing: "border-box" };
const BTN: React.CSSProperties = { minHeight: 44, padding: "6px 12px", borderRadius: 6, border: `1px solid ${LINE}`, background: "none", color: GOLD, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const LABEL: React.CSSProperties = { display: "grid", gap: 3, fontSize: 11, color: MUTED, minWidth: 0 };

/** Zones a platform's export is commonly displayed in. "" = the file's times name their own zone. */
export const PROP_IMPORT_ZONES: readonly { readonly id: string; readonly label: string }[] = [
  { id: "", label: "The times in the file name their own zone" },
  { id: "America/Chicago", label: "Central (Chicago)" },
  { id: "America/New_York", label: "Eastern (New York)" },
  { id: "America/Denver", label: "Mountain (Denver)" },
  { id: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { id: "UTC", label: "UTC" },
  { id: "Europe/London", label: "London" },
];
export const PROP_DAY_RULE_LABEL: Readonly<Record<PropDayRule, string>> = {
  ET_CALENDAR_DAY: "Eastern calendar day",
  CME_TRADING_DAY: "Futures day (a new day from 6:00 PM ET)",
};
export const PROP_IMPORT_PRIVACY_LINE = "The file is read in this browser only. Nothing is uploaded, and WM never signs in to the platform.";

export interface PropImportedDays {
  readonly days: readonly PropDay[];
  /** "imported file · <name> · as of <time> · <day rule> · BEFORE|AFTER commissions". */
  readonly source: string;
  readonly basis: "AFTER_COMMISSIONS" | "BEFORE_COMMISSIONS";
}

/** The pure reading the panel shows for a file's text — also what the tests and the sample mount use. */
export function readPropImport(file: { readonly name: string; readonly text: string } | null, zone: string, rule: PropDayRule, openedAtMs: number) {
  if (!file) return null;
  const imp = importPropFills(file.text, { fileName: file.name, nowMs: openedAtMs, wallClockZone: zone || null });
  if (!imp.ok) return { ok: false as const, reason: imp.reason };
  const daily = propDailyResults(imp, rule);
  const basisWords = daily.basis === "AFTER_COMMISSIONS" ? "AFTER commissions" : "BEFORE commissions";
  return { ok: true as const, imp, daily, basisWords, source: `${imp.provenance} · ${PROP_DAY_RULE_LABEL[rule]} · ${basisWords}` };
}

export function PropFillsImportPanel({ onUseDays, sampleFile = null, disabled = false }: {
  readonly onUseDays: (x: PropImportedDays) => void;
  /** Proof-scene mode: a synthetic file's text handed in; the file picker is not offered. */
  readonly sampleFile?: { readonly name: string; readonly text: string; readonly openedAtMs: number } | null;
  readonly disabled?: boolean;
}): React.ReactElement {
  const [file, setFile] = useState<{ name: string; text: string; openedAtMs: number } | null>(sampleFile);
  const [zone, setZone] = useState(sampleFile ? "America/Chicago" : "");
  const [rule, setRule] = useState<PropDayRule>("ET_CALENDAR_DAY");
  const [readError, setReadError] = useState<string | null>(null);
  const r = useMemo(() => readPropImport(file, zone, rule, file?.openedAtMs ?? 0), [file, zone, rule]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 5_000_000) { setReadError("That file is larger than 5 MB — a fills export is far smaller. Nothing was read."); return; }
    const reader = new FileReader();
    reader.onerror = () => setReadError("The browser could not read that file.");
    reader.onload = () => { setReadError(null); setFile({ name: f.name, text: typeof reader.result === "string" ? reader.result : "", openedAtMs: Date.now() }); };
    reader.readAsText(f);
  };

  return (
    <div data-testid="prop-import" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10, display: "grid", gap: 8 }}>
      <span style={{ fontSize: 11, letterSpacing: 1, color: GOLD, fontWeight: 800 }}>READ A FILLS FILE · the platform&apos;s own export (CSV)</span>
      <span data-testid="prop-import-privacy" style={{ fontSize: 11, color: MUTED, overflowWrap: "anywhere" }}>{PROP_IMPORT_PRIVACY_LINE}</span>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", alignItems: "end" }}>
        {!sampleFile ? (
          <label style={LABEL}><span>Fills file</span>
            <input type="file" accept=".csv,text/csv,text/plain" data-testid="prop-import-file" disabled={disabled} onChange={onPick} style={{ ...FIELD, padding: 8 }} /></label>
        ) : null}
        <label style={LABEL}><span>Time zone of the times in the file</span>
          <select value={zone} data-testid="prop-import-zone" onChange={e => setZone(e.target.value)} style={FIELD}>
            {PROP_IMPORT_ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
          </select></label>
      </div>
      <div role="radiogroup" aria-label="Which day a trade is counted on" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(Object.keys(PROP_DAY_RULE_LABEL) as PropDayRule[]).map(k => (
          <button key={k} type="button" role="radio" aria-checked={rule === k} data-testid="prop-import-rule" data-rule={k} onClick={() => setRule(k)}
            style={{ ...BTN, color: rule === k ? INK : MUTED, borderColor: rule === k ? GOLD : LINE, background: rule === k ? "rgba(201,165,92,0.14)" : "none" }}>{PROP_DAY_RULE_LABEL[k]}</button>
        ))}
      </div>
      <span data-testid="prop-import-rule-words" style={{ fontSize: 11, color: MUTED, overflowWrap: "anywhere" }}>Day rule: {PROP_DAY_RULE_WORDS[rule]}. Check which one your firm uses — WM does not know it.</span>
      {readError ? <span role="alert" style={{ fontSize: 12, color: RED }}>{readError}</span> : null}
      {r && !r.ok ? <span role="alert" data-testid="prop-import-refusal" style={{ fontSize: 12, color: RED, overflowWrap: "anywhere" }}>{r.reason}</span> : null}
      {r && r.ok ? (
        <div data-testid="prop-import-result" data-basis={r.daily.basis} style={{ display: "grid", gap: 6 }}>
          <span data-testid="prop-import-provenance" style={{ fontSize: 12, color: INK, overflowWrap: "anywhere" }}>{r.imp.provenance}</span>
          <span style={{ fontSize: 12, color: INK, overflowWrap: "anywhere" }}>
            {r.imp.fills.length} fill{r.imp.fills.length === 1 ? "" : "s"} read of {r.imp.rowsInFile} row{r.imp.rowsInFile === 1 ? "" : "s"} · {r.daily.roundTrips} matched close{r.daily.roundTrips === 1 ? "" : "s"} ·{" "}
            <b data-testid="prop-import-basis" style={{ color: r.daily.basis === "BEFORE_COMMISSIONS" ? AMBER : INK }}>each day is {r.basisWords}</b>
          </span>
          {r.imp.disclosure ? <span data-testid="prop-import-partial" style={{ fontSize: 12, color: AMBER, fontWeight: 700, overflowWrap: "anywhere" }}>{r.imp.disclosure}</span> : null}
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 3 }}>
            {r.daily.notes.map(n => <li key={n} data-testid="prop-import-note" style={{ fontSize: 11, color: MUTED, overflowWrap: "anywhere" }}>{n}</li>)}
          </ul>
          {r.daily.days.length ? (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 2 }}>
              {r.daily.days.map(d => (
                <li key={d.date} data-testid="prop-import-day" style={{ display: "flex", gap: 12, fontSize: 12, color: INK, fontVariantNumeric: "tabular-nums" }}>
                  <span>{d.date}</span><span>{formatCents(d.netCents)}</span>
                </li>
              ))}
            </ul>
          ) : <span style={{ fontSize: 12, color: MUTED }}>No closed round trip in this file — no day has a result.</span>}
          {!sampleFile ? (
            <button type="button" data-testid="prop-import-use" disabled={disabled || !r.daily.days.length} onClick={() => onUseDays({ days: r.daily.days, source: r.source, basis: r.daily.basis })}
              style={{ ...BTN, justifySelf: "start", opacity: r.daily.days.length ? 1 : 0.5 }}>
              Put these {r.daily.days.length} day{r.daily.days.length === 1 ? "" : "s"} in the daily list (replaces it · stays UNVERIFIED)
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default PropFillsImportPanel;
