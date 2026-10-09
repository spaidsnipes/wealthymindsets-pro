"use client";

/**
 * PROP EVALUATION DESK — the owner's own evaluation account, inside the Journal (Founder order §7,
 * 2026-10-09). Mounted ONLY through PropEvaluationGate (owner audience); never for a member or a guest.
 *
 * Two panels, kept visibly apart:
 *   ACCOUNT TRUTH   what the trader typed in from the firm's dashboard. Every figure is UNVERIFIED
 *                   until the trader presses "Read back from the firm's dashboard"; any later edit
 *                   clears that stamp.
 *   SCENARIO LAB    illustrative rows the trader types (profits and losses), recomputed live.
 *                   ILLUSTRATIVE ARITHMETIC — NOT A TARGET. No amount is ever worded as something
 *                   to make on a day, and nothing promises a pass.
 *
 * All arithmetic is propEvaluation.ts (the one owner). This file holds no balance, no account number
 * and no default figure: the desk opens empty. v1 storage is THIS DEVICE ONLY, under an owner-scoped
 * key, and the glass says so. In a proof scene nothing is read from or written to storage.
 */

import React, { useEffect, useMemo, useState } from "react";

import { PropFillsImportPanel } from "@/components/journal/PropFillsImportPanel";
import { proofSceneHoldsWrites } from "@/lib/chart/proofScene";
import {
  DRAWDOWN_METHODS, DRAWDOWN_METHOD_LABEL, EMPTY_PROP_INPUTS, PROP_DEVICE_LINE, PROP_SCENARIO_LABEL, PROP_STORAGE_KIND, PROP_UNVERIFIED, PROP_VERIFY_ACTION,
  editInputs, formatCents, parseMoneyToCents, pct, planDaysVerdict, propSampleInputs, readPropEvaluation, readPropScenario, readPropStored, stampVerified,
  type Cents, type DrawdownMethod, type Known, type PropInputs, type PropStored,
} from "@/lib/journal/propEvaluation";

const GOLD = "#c9a55c", MUTED = "#9a927f", INK = "#ede6d3", LINE = "rgba(139,106,41,0.35)", AMBER = "#d9a441", RED = "#d97a6c", GREEN = "#7fbf8f";
const FIELD: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: `1px solid ${LINE}`, borderRadius: 6, color: INK, fontSize: 13, padding: "6px 8px", minHeight: 44, width: "100%", boxSizing: "border-box", fontVariantNumeric: "tabular-nums" };
const LABEL: React.CSSProperties = { display: "grid", gap: 3, fontSize: 11, color: MUTED, minWidth: 0 };
const GRID: React.CSSProperties = { display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" };
const BTN: React.CSSProperties = { minHeight: 44, padding: "6px 12px", borderRadius: 6, border: `1px solid ${LINE}`, background: "none", color: GOLD, fontSize: 12, fontWeight: 700, cursor: "pointer" };

export const PROP_SAMPLE_BANNER = "SAMPLE ACCOUNT — synthetic numbers, no one's evaluation. Nothing here is saved.";
export const PROP_SAMPLE_ROWS: readonly Cents[] = [100_000, -30_000, 100_000, 63_334];
/** A synthetic fills export for the sample mount: made-up fills on a sample day, one row with no price (so the PARTIAL line shows), no commission column. */
export const PROP_SAMPLE_FILE = {
  name: "SAMPLE-fills.csv",
  openedAtMs: Date.UTC(2026, 0, 8, 15, 0, 0),
  text: [
    "Timestamp,Contract,B/S,Quantity,Price,Fill ID",
    "01/05/2026 09:31:05,MNQH6,Buy,1,21000.00,S1",
    "01/05/2026 09:44:10,MNQH6,Sell,1,21050.00,S2",
    "01/06/2026 10:02:00,MNQH6,Sell,1,21100.00,S3",
    "01/06/2026 10:20:30,MNQH6,Buy,1,21112.50,S4",
    "01/06/2026 11:00:00,MNQH6,Buy,1,,S5",
  ].join("\n"),
} as const;

function loadStored(key: string | null): PropStored | null {
  if (!key || typeof window === "undefined") return null;
  try { return readPropStored(JSON.parse(window.localStorage.getItem(key) ?? "null")); } catch { return null; }
}

/** A money box: the trader's text, parsed to cents; anything that is not a plain amount is said, never guessed. */
function MoneyField({ label, valueCents, onCommit, allowNegative = false, testId }: {
  readonly label: string; readonly valueCents: Cents | null; readonly onCommit: (c: Cents | null) => void; readonly allowNegative?: boolean; readonly testId?: string;
}) {
  const [text, setText] = useState(valueCents === null ? "" : (valueCents / 100).toFixed(2));
  const [bad, setBad] = useState(false);
  useEffect(() => { setText(t => (parseMoneyToCents(t) === valueCents || (t.trim() === "" && valueCents === null) ? t : valueCents === null ? "" : (valueCents / 100).toFixed(2))); }, [valueCents]);
  return (
    <label style={LABEL}>
      <span>{label}</span>
      <input inputMode="decimal" data-testid={testId} value={text} aria-invalid={bad} placeholder="—"
        onChange={e => {
          const t = e.target.value; setText(t);
          if (t.trim() === "") { setBad(false); onCommit(null); return; }
          const c = parseMoneyToCents(t);
          const ok = c !== null && (allowNegative || c >= 0);
          setBad(!ok);
          if (ok) onCommit(c);
        }}
        style={{ ...FIELD, borderColor: bad ? RED : LINE }} />
      {bad ? <span role="alert" style={{ color: RED, fontSize: 11 }}>{allowNegative ? "Not a money amount." : "Not a money amount (no minus sign here)."}</span> : null}
    </label>
  );
}

const say = <T,>(k: Known<T>, fmt: (v: T) => string): string => (k.known ? fmt(k.value) : k.why);

function Fact({ label, value, tone, testId }: { readonly label: string; readonly value: string; readonly tone?: string; readonly testId?: string }) {
  return (
    <div data-testid={testId} style={{ display: "grid", gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 11, color: MUTED }}>{label}</span>
      <span style={{ fontSize: 13, color: tone ?? INK, overflowWrap: "anywhere", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

export function PropEvaluationDesk({ storageKey, sample = false }: {
  /** The owner-scoped localStorage key, or null (sample / no owner). */
  readonly storageKey: string | null;
  /** Proof-scene mode: synthetic numbers, no storage at all. */
  readonly sample?: boolean;
}): React.ReactElement {
  const [inputs, setInputs] = useState<PropInputs>(sample ? propSampleInputs() : EMPTY_PROP_INPUTS);
  const [rows, setRows] = useState<readonly Cents[]>(sample ? PROP_SAMPLE_ROWS : []);
  const [loaded, setLoaded] = useState(sample);
  const [planDays, setPlanDays] = useState("");
  // Read once per owner key. The desk opens empty when nothing is stored.
  useEffect(() => {
    if (sample) return;
    const s = loadStored(storageKey);
    setInputs(s?.inputs ?? EMPTY_PROP_INPUTS);
    setRows(s?.scenarioRowsCents ?? []);
    setLoaded(true);
  }, [storageKey, sample]);
  // Written only after the trader's own edits, on this device only; never in a proof scene.
  useEffect(() => {
    if (sample || !loaded || !storageKey || proofSceneHoldsWrites()) return;
    try {
      const rec: PropStored = { kind: PROP_STORAGE_KIND, version: 1, inputs, scenarioRowsCents: rows };
      window.localStorage.setItem(storageKey, JSON.stringify(rec));
    } catch { /* storage full or blocked: the desk still works for this visit */ }
  }, [inputs, rows, loaded, storageKey, sample]);

  const edit = (patch: Partial<Omit<PropInputs, "verifiedAtMs">>) => setInputs(prev => editInputs(prev, patch));
  const r = useMemo(() => readPropEvaluation(inputs), [inputs]);
  const sc = useMemo(() => readPropScenario(inputs, rows), [inputs, rows]);
  const plan = planDays.trim() === "" ? null : planDaysVerdict(inputs, Number(planDays));
  const asOf = inputs.verifiedAtMs === null ? null : new Date(inputs.verifiedAtMs).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const canStamp = r.netBasis !== "NONE" || inputs.profitTargetCents !== null;

  return (
    <section aria-label="Prop evaluation desk" data-testid="prop-evaluation-desk" data-sample={sample ? "yes" : undefined}
      style={{ display: "grid", gap: 12, padding: 16, color: INK }}>
      <header style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 11, letterSpacing: 1, color: GOLD, fontWeight: 800 }}>PROP EVALUATION · your own account, your own numbers</span>
        <span data-testid="prop-device-line" style={{ fontSize: 11, color: MUTED }}>
          {sample ? PROP_SAMPLE_BANNER : `${PROP_DEVICE_LINE} It is cleared when you sign out. Nothing is sent to WM or to the firm, and WM reads nothing from the firm — you type what its dashboard shows.`}
        </span>
      </header>

      {/* ── ACCOUNT TRUTH ─────────────────────────────────────────────────── */}
      <div data-testid="prop-account" data-verified={r.verified ? "yes" : "no"}
        style={{ border: `1px solid ${LINE}`, borderRadius: 10, background: "rgba(11,11,13,0.9)", padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: 1, color: GOLD, fontWeight: 800 }}>ACCOUNT TRUTH · as you entered it</span>
          {r.verified ? (
            <span data-testid="prop-verified" style={{ fontSize: 11, color: GREEN, border: `1px solid ${GREEN}`, borderRadius: 999, padding: "2px 8px" }}>READ BACK FROM THE FIRM&apos;S DASHBOARD · as of {asOf}</span>
          ) : (
            <span data-testid="prop-unverified" style={{ fontSize: 11, color: AMBER, border: `1px solid ${AMBER}`, borderRadius: 999, padding: "2px 8px", fontWeight: 700 }}>{PROP_UNVERIFIED} · every figure below is as typed, not checked</span>
          )}
        </div>
        <div style={GRID}>
          <label style={LABEL}><span>Nickname (free text — not an account number)</span>
            <input value={inputs.nickname} maxLength={40} onChange={e => edit({ nickname: e.target.value })} style={FIELD} autoComplete="off" /></label>
          <label style={LABEL}><span>Firm</span><input value={inputs.firm} maxLength={60} onChange={e => edit({ firm: e.target.value })} style={FIELD} autoComplete="off" /></label>
          <label style={LABEL}><span>Program</span><input value={inputs.program} maxLength={60} onChange={e => edit({ program: e.target.value })} style={FIELD} autoComplete="off" /></label>
        </div>
        <div style={GRID}>
          <MoneyField label="Starting balance" valueCents={inputs.startingBalanceCents} onCommit={c => edit({ startingBalanceCents: c })} testId="prop-start" />
          <MoneyField label="Current balance" valueCents={inputs.currentBalanceCents} onCommit={c => edit({ currentBalanceCents: c })} testId="prop-current" />
          <MoneyField label="Original profit target" valueCents={inputs.profitTargetCents} onCommit={c => edit({ profitTargetCents: c })} testId="prop-target" />
          <label style={LABEL}><span>Consistency limit (largest day ÷ net profit, e.g. 0.30)</span>
            <input inputMode="decimal" defaultValue={String(inputs.consistencyLimit)} key={`lim-${loaded}`} data-testid="prop-limit"
              onChange={e => { const v = Number(e.target.value); if (Number.isFinite(v) && v > 0 && v <= 1) edit({ consistencyLimit: v }); }} style={FIELD} /></label>
        </div>
        <div style={GRID}>
          <label style={LABEL}><span>Drawdown method</span>
            <select value={inputs.drawdownMethod} onChange={e => edit({ drawdownMethod: e.target.value as DrawdownMethod })} style={FIELD} data-testid="prop-dd-method">
              {DRAWDOWN_METHODS.map(m => <option key={m} value={m}>{DRAWDOWN_METHOD_LABEL[m]}</option>)}
            </select></label>
          <MoneyField label="Maximum drawdown" valueCents={inputs.maxDrawdownCents} onCommit={c => edit({ maxDrawdownCents: c })} />
          <MoneyField label="Drawdown floor shown on the firm's dashboard (if you have read it)" valueCents={inputs.drawdownFloorCents} onCommit={c => edit({ drawdownFloorCents: c })} testId="prop-floor" />
          <MoneyField label="Commissions per traded day (optional)" valueCents={inputs.commissionsPerDayCents} onCommit={c => edit({ commissionsPerDayCents: c })} />
        </div>
        <div style={GRID}>
          <label style={LABEL}><span>Contract limit</span>
            <input inputMode="numeric" value={inputs.contractLimit ?? ""} onChange={e => { const v = e.target.value.trim(); edit({ contractLimit: v === "" ? null : /^\d{1,4}$/.test(v) ? Number(v) : inputs.contractLimit }); }} style={FIELD} /></label>
          <label style={LABEL}><span>Minimum trading days</span>
            <input inputMode="numeric" value={inputs.minTradingDays ?? ""} data-testid="prop-min-days" onChange={e => { const v = e.target.value.trim(); edit({ minTradingDays: v === "" ? null : /^\d{1,4}$/.test(v) ? Number(v) : inputs.minTradingDays }); }} style={FIELD} /></label>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <PropFillsImportPanel sampleFile={sample ? PROP_SAMPLE_FILE : null}
            onUseDays={x => edit({ days: x.days, daysSource: x.source, ...(x.basis === "AFTER_COMMISSIONS" ? { commissionsPerDayCents: null } : {}) })} />
          <span style={{ fontSize: 11, color: MUTED }}>Daily net results, one row per traded day (losses with a minus sign)</span>
          {inputs.daysSource ? (
            <span data-testid="prop-days-source" style={{ fontSize: 11, color: AMBER, overflowWrap: "anywhere" }}>
              From an {inputs.daysSource} — {PROP_UNVERIFIED} until you read it back against the firm&apos;s dashboard.
            </span>
          ) : null}
          {inputs.days.map((d, i) => (
            <div key={i} data-testid="prop-day-row" style={{ display: "grid", gap: 6, gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto", alignItems: "end" }}>
              <label style={LABEL}><span>Date</span>
                <input type="date" value={d.date} onChange={e => edit({ daysSource: null, days: inputs.days.map((x, k) => (k === i ? { ...x, date: e.target.value } : x)) })} style={FIELD} /></label>
              <MoneyField label="Net for the day" allowNegative valueCents={d.netCents} onCommit={c => { if ((c ?? 0) !== d.netCents) edit({ daysSource: null, days: inputs.days.map((x, k) => (k === i ? { ...x, netCents: c ?? 0 } : x)) }); }} />
              <button type="button" aria-label={`Remove day ${i + 1}`} onClick={() => edit({ daysSource: null, days: inputs.days.filter((_, k) => k !== i) })} style={BTN}>Remove</button>
            </div>
          ))}
          <button type="button" data-testid="prop-add-day" onClick={() => edit({ daysSource: null, days: [...inputs.days, { date: "", netCents: 0 }] })} style={{ ...BTN, justifySelf: "start" }}>Add a traded day</button>
        </div>

        <div style={{ ...GRID, borderTop: `1px solid ${LINE}`, paddingTop: 10 }} data-testid="prop-reading">
          <Fact testId="prop-net" label={`Net evaluation profit${r.netBasis === "BALANCES" ? " (current − starting balance)" : r.netBasis === "DAILY_RESULTS" ? " (daily results" + (r.feesCents ? " − commissions)" : ")") : ""}`} value={say(r.netProfitCents, formatCents)} />
          <Fact testId="prop-largest" label="Largest profitable day" value={r.daysTraded ? (r.largestDayCents > 0 ? `${formatCents(r.largestDayCents)}${r.largestDayDate ? ` · ${r.largestDayDate}` : ""}` : "No profitable day entered") : "Enter the daily results"} />
          <Fact testId="prop-share" label={`Best-day share (limit ${pct(inputs.consistencyLimit)})`} value={say(r.bestDayShare, v => pct(v))} tone={r.bestDayShare.known && r.bestDayShare.value > inputs.consistencyLimit ? AMBER : undefined} />
          <Fact testId="prop-required" label="Net profit required (the larger of the original target and largest day ÷ limit)" value={say(r.requiredNetProfitCents, formatCents) + (r.targetRaisedByBestDay ? " — raised above the original target by the largest day" : "")} />
          <Fact testId="prop-remaining" label="Remaining to the requirement" value={say(r.remainingCents, formatCents)} />
          <Fact testId="prop-headroom" label="Drawdown headroom (current balance − floor)" value={say(r.drawdownHeadroomCents, formatCents)} tone={r.drawdownHeadroomCents.known && r.drawdownHeadroomCents.value <= 0 ? RED : undefined} />
          <Fact testId="prop-days" label="Days traded against the minimum" value={r.minDaysRemaining.known ? `${r.daysTraded} traded · ${r.minDaysRemaining.value} more needed` : `${r.daysTraded} traded · ${r.minDaysRemaining.why}`} />
          <Fact testId="prop-min-further" label="Fewest further profitable days the arithmetic allows, if no day exceeds the current largest" value={say(r.minimumFurtherProfitableDays, v => `${v} day${v === 1 ? "" : "s"}`)} />
          {inputs.contractLimit !== null ? <Fact label="Contract limit (as entered — not checked against any order here)" value={`${inputs.contractLimit}`} /> : null}
        </div>
        {r.balanceVsDaysGapCents !== null && r.balanceVsDaysGapCents !== 0 ? (
          <span data-testid="prop-gap" style={{ fontSize: 11, color: AMBER, overflowWrap: "anywhere" }}>
            The balances and the daily results differ by {formatCents(r.balanceVsDaysGapCents)} — a day, a fee or a typing slip is missing from one of them. The balance figure is used.
          </span>
        ) : null}
        {!sample ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <button type="button" data-testid="prop-stamp" disabled={!canStamp || r.verified} onClick={() => setInputs(prev => stampVerified(prev, Date.now()))}
              style={{ ...BTN, opacity: !canStamp || r.verified ? 0.5 : 1, cursor: !canStamp || r.verified ? "default" : "pointer" }}>{PROP_VERIFY_ACTION}</button>
            <span style={{ fontSize: 11, color: MUTED, overflowWrap: "anywhere" }}>Press only after you have compared every figure above with the firm&apos;s own page. Changing any figure clears it.</span>
          </div>
        ) : null}
      </div>

      {/* ── SCENARIO LAB — visibly apart ──────────────────────────────────── */}
      <div data-testid="prop-scenario" data-verdict={sc.verdict}
        style={{ border: `1px dashed ${AMBER}`, borderRadius: 10, background: "rgba(217,164,65,0.05)", padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 2 }}>
          <span data-testid="prop-scenario-label" style={{ fontSize: 11, letterSpacing: 1, color: AMBER, fontWeight: 800 }}>SCENARIO LAB · {PROP_SCENARIO_LABEL}</span>
          <span style={{ fontSize: 11, color: MUTED, overflowWrap: "anywhere" }}>Rows you type here are what-if days added after the account above — profits and losses. They change nothing in the account, and no row is a goal for any day.</span>
        </div>
        {rows.map((v, i) => (
          <div key={i} data-testid="prop-scenario-row" style={{ display: "grid", gap: 6, gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "end" }}>
            <MoneyField label={`What-if day ${i + 1}`} allowNegative valueCents={v} onCommit={c => setRows(rs => rs.map((x, k) => (k === i ? c ?? 0 : x)))} />
            <button type="button" aria-label={`Remove what-if day ${i + 1}`} onClick={() => setRows(rs => rs.filter((_, k) => k !== i))} style={BTN}>Remove</button>
          </div>
        ))}
        <button type="button" data-testid="prop-add-scenario" onClick={() => setRows(rs => (rs.length >= 60 ? rs : [...rs, 0]))} style={{ ...BTN, justifySelf: "start", color: AMBER, borderColor: AMBER }}>Add a what-if day</button>
        <div style={GRID} data-testid="prop-scenario-reading">
          <Fact label="What-if rows total" value={sc.rows ? `${formatCents(sc.rowsSumCents)} over ${sc.rows} day${sc.rows === 1 ? "" : "s"}` : "No what-if rows yet"} />
          {sc.feesCents ? <Fact label="Commissions on those rows" value={formatCents(sc.feesCents)} /> : null}
          <Fact testId="prop-sc-net" label="Net profit with the rows" value={say(sc.after.netProfitCents, formatCents)} />
          <Fact label="Largest day with the rows" value={sc.after.largestDayCents > 0 ? formatCents(sc.after.largestDayCents) : "No profitable day"} />
          <Fact label="Best-day share with the rows" value={say(sc.after.bestDayShare, v => pct(v))} />
          <Fact testId="prop-sc-required" label="Net profit required with the rows" value={say(sc.after.requiredNetProfitCents, formatCents)} />
          <Fact label="Remaining with the rows" value={say(sc.after.remainingCents, formatCents)} />
          <Fact label="Lowest end-of-day balance on the rows" value={sc.lowestBalanceCents === null ? "Enter the current balance" : formatCents(sc.lowestBalanceCents)} />
        </div>
        {sc.newBestDay ? (
          <span data-testid="prop-new-best" style={{ fontSize: 12, color: AMBER, overflowWrap: "anywhere" }}>
            A row here is larger than the account&apos;s largest day, so the requirement rises{sc.requiredRoseByCents ? ` by ${formatCents(sc.requiredRoseByCents)}` : ""} — a bigger best day asks for a bigger total.
          </span>
        ) : null}
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
          {sc.conditions.map(c => (
            <li key={c.id} data-testid="prop-condition" data-condition={c.id} data-state={c.state} style={{ fontSize: 12, color: c.state === "MET" ? INK : c.state === "NOT_MET" ? RED : MUTED, overflowWrap: "anywhere" }}>
              <b style={{ fontWeight: 700 }}>{c.label}:</b> {c.words}
            </li>
          ))}
        </ul>
        <p role="status" data-testid="prop-verdict" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: sc.verdict === "SATISFIES_VERIFIED" ? GREEN : sc.verdict === "DOES_NOT" ? RED : AMBER, overflowWrap: "anywhere" }}>{sc.verdictLine}</p>
        <div style={{ display: "grid", gap: 4, gridTemplateColumns: "minmax(0, 220px)", borderTop: `1px dashed ${LINE}`, paddingTop: 8 }}>
          <label style={LABEL}><span>Check a number of further days (arithmetic only)</span>
            <input inputMode="numeric" value={planDays} data-testid="prop-plan-days" onChange={e => setPlanDays(e.target.value.replace(/[^\d]/g, "").slice(0, 3))} style={FIELD} placeholder="—" /></label>
        </div>
        {plan ? <span data-testid="prop-plan-verdict" data-verdict={plan.verdict} style={{ fontSize: 12, color: plan.verdict === "IMPOSSIBLE" ? RED : MUTED, overflowWrap: "anywhere" }}>{plan.words}</span> : null}
        <span style={{ fontSize: 11, color: MUTED, overflowWrap: "anywhere" }}>The firm&apos;s own dashboard decides every rule. This lab only adds and compares the numbers typed here.</span>
      </div>
    </section>
  );
}

export default PropEvaluationDesk;
