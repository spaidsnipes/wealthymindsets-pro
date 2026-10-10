"use client";

/**
 * TRADE — Garden 18 §LXVII–§LXXX. ONE verb, context-aware, floating over the
 * market (never a drawer, never a modal that hides price).
 *
 * The panel reads WHAT is on the chart and offers the right ticket:
 *   FUTURE   the actual contract (MNQ1! → tastytrade's active month, /MNQH7 →
 *            that month), contracts 1·2·3·5, limit seeded from the live touch,
 *            tick nudges, point and tick value from the contract's economics.
 *   STOCK    shares on tastytrade, same grammar.
 *   OPTION / FUTURES OPTION  → the Options family (chain, shortlist, ticket).
 *   CRYPTO   spot, the exact pair (BTC → BTC/USD) at tastytrade, sized in coin
 *            units; tastytrade's dry run says whether the account may trade it.
 *            If the quote stream does not answer, the limit seeds from the
 *            chart's last price and the touch reads "—".
 *   FX       "NO CONNECTED SPOT-FX EXECUTION RAIL" — never a silent 6E swap.
 *
 * Execution is the existing firewall: tastytrade's dry run first, then the
 * armed Send LIVE (`TastytradeLiveOrder`) — the human presses it, nothing else.
 * Protection is real and stated: after the entry, a broker-native Stop and a
 * target Limit (both GTC, both closing) can each be armed and sent; they are
 * NOT linked (no OCO yet), and the panel says so.
 *
 * TRADE FROM CHART (Garden 19 §23): entry / stop / target can be picked on the
 * glass (when the chart hosts the pick) and are published to the chart as
 * STAGED lines — never drawn as working. Preview (dry run + the server gate)
 * → confirm sheet → send happen in TastytradeLiveOrder. tastytrade's own
 * working orders and position for the contract are read back
 * (useBrokerChartLines) and drawn as WORKING / RECONCILING / UNKNOWN /
 * POSITION lines. A SpaidBot PROPOSAL (§24) can be loaded into the ticket; it
 * never sends.
 */

import { openSettings } from "@/components/layout/shellPanels";
import { tastytradeEntryFields, type TastytradeEntryType } from "@/lib/broker/tastytradeEntryFields";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { TastytradeLiveOrder, type TastytradeIntent } from "@/components/chart/TastytradeLiveOrder";
import { chartDraftNote, chartEntryEffect, type ChartDraft, orderActionLine, prefillNote, protectBasisLine, quoteStreamLabel, SPAIDBOT_BOUNDARY, type Prefill } from "@/lib/execution/ticketTruth";
import { brokerStateWords, ticketBook, type WorkingOrderRow } from "@/lib/execution/ticketBook";
import type { WmOrderState } from "@/lib/broker/tastytradeOrderState";
import { TicketBookRows, type CancelAck } from "@/components/chart/TicketBookRows";
import { stepPriceText, ticketKeyAction } from "@/lib/execution/ticketKeys";
import { COMPACT_ACT_MAX_HEIGHT, COMPACT_HALF_MAX_HEIGHT, halfControl, halfFromDrag, halfInForce, COMPACT_PEEK_MAX_HEIGHT, COMPACT_TICKET_QUERY, WIDE_TICKET_MAX_HEIGHT, bookIsActive, compactRiskLine, detailsSummary, foldControl, reviewGate, ticketStage, ticketStep, type TicketSection } from "@/lib/execution/ticketLayout";
import { TicketSections } from "@/components/chart/TicketSections";
import { parseTicketFixture, TICKET_FIXTURE_BANNER, ticketFixtureChartLines, ticketFixtureLines, type TicketFixture } from "@/lib/execution/ticketFixture";
import { railSendGate } from "@/lib/broker/railSendGate";
import { selectTapeQuoteFreshness } from "@/lib/marketData/tapeQuoteFreshness";
import { PendingFillJournalOffers } from "@/components/journal/FillJournalOffer";
import { ManagementPlanCard } from "@/components/journal/ManagementPlanCard";
import { isOwnerRefusal, plainBrokerAnswer, TASTYTRADE_NOT_AVAILABLE } from "@/lib/broker/ownerRefusal";
import { useTastyQuotes } from "@/lib/broker/tastyQuoteStream";
import { instrumentEconomics } from "@/lib/marketData/contractEconomics";
import { useGuardrails } from "@/lib/execution/useGuardrails";
import { canonicalAssetClass } from "@/lib/marketData/canonicalIdentity";
import { continueOrMint, type DecisionIdentity } from "@/lib/traderMemory/decisionIdentity";
import { thisDeviceId } from "@/lib/traderMemory/deviceIdentity";
import { useBrokerAudience } from "@/lib/broker/useBrokerAudience";
import { armChartPricePick, cancelChartPricePick, publishChartOrderLines, useChartPricePick, useChartPricePickHosted, type ChartOrderLine } from "@/lib/execution/chartOrderLines";
import { datedFuturesContract } from "@/lib/execution/liveOrderPreflight";
import { isPreSendPhase, type LiveOrderPhase } from "@/lib/execution/liveOrderLifecycle";
import { changeServerOrderLimits, useServerOrderLimits } from "@/lib/execution/useServerOrderLimits";
import { useBrokerChartLines } from "@/lib/execution/useBrokerChartLines";
import { forgetUnresolvedContract, useBrokerContract } from "@/lib/execution/brokerReadbackStore";
import { proposalToTicket, recordProposalEvent, type SpaidBotProposal } from "@/lib/execution/spaidbotProposal";
import { dismissSpaidBotProposal, useSpaidBotProposal } from "@/lib/execution/spaidbotProposalInbox";

/** guest audit 2026-10-04: quote-stream states in plain words (the enum stays in data-state). */
const STREAM_WORDS: Readonly<Record<string, string>> = {
  IDLE: "quotes idle", CONNECTING: "connecting", DEGRADED: "reconnecting",
  NOT_OWNER: "live quotes not on your account", NOT_CONNECTED: "quotes not connected",
};
const GOLD = "#C9A55C";
const INK = "#ede6d3";
const MUTED = "#8a8271";
const LINE = "rgba(139,106,41,0.35)";
const GREEN = "#7fd1a8";
const RED = "#e0786b";
const MONO: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

type Kind = "FUTURE" | "STOCK" | "OPTION" | "CRYPTO" | "FX";

/** The newest chart draft this module has applied (outlives the panel — see the effect that reads it). */
let consumedChartDraftSeq = 0;

function kindOf(symbol: string): Kind {
  const c = canonicalAssetClass(symbol);
  return c === "futures" ? "FUTURE" : c === "crypto" ? "CRYPTO" : c === "forex" ? "FX" : c === "options" ? "OPTION" : "STOCK";
}

/** The tick's own decimal places (0.25 → 2, 0.01 → 2, 0.5 → 1, 1 → 0). */
export const decimals = (tick: number | null): number => {
  if (tick == null || !(tick > 0)) return 2;
  const t = String(Number(tick.toPrecision(8)));
  const e = /e-(\d+)$/.exec(t);
  if (e) return Math.min(8, Number(e[1]));
  return t.includes(".") ? Math.min(8, t.split(".")[1]!.length) : 0;
};

export function TradePanel({ symbol, price, bornDecision, onIdentity, onOpenOptions, onOpenPaper, onClose }: {
  readonly symbol: string;
  readonly price: number | null;
  readonly bornDecision: DecisionIdentity | null;
  readonly onIdentity: (identity: DecisionIdentity) => void;
  readonly onOpenOptions: () => void;
  readonly onOpenPaper: () => void;
  readonly onClose: () => void;
}) {
  const kind = kindOf(symbol);
  // The broker rails behind this ticket are the OWNER's. A guest saw the full
  // live ticket and the arm switch, then refusals after pressing; they get one
  // sentence and Paper instead (garden pass 2026-10-05). null = still asking.
  const audience = useBrokerAudience();
  // §LXXX: the trader's master switch, visible before any order is built.
  const liveArmed = useGuardrails().liveArmed;
  // Garden 18 §4: the contract belongs to the symbol it was named for — the
  // first frame after a switch used to quote the PREVIOUS symbol's contract.
  // ONE contract resolution for the chart room (brokerReadbackStore): the ticket and the chart strip read the same
  // answer, keyed by the chart symbol — so the first frame after a switch can never quote the previous symbol's
  // contract, and never a continuous symbol routed blind (§LXX). A future whose contract could not be named is
  // asked again when the ticket opens (a rail may have connected since).
  useEffect(() => { forgetUnresolvedContract(symbol); }, [symbol]);
  const contractAnswer = useBrokerContract(symbol, kind === "FUTURE" || kind === "STOCK" || kind === "CRYPTO");
  const contract = contractAnswer.state === "RESOLVED" ? contractAnswer.contract : null;
  const contractWhy = contractAnswer.state === "NONE" ? contractAnswer.why : null;

  // PROOF SCENE (`scene=ticket-fixture`): asked by the URL, granted only to the signed-in owner (see below).
  const [sceneAsked, setSceneAsked] = useState<TicketFixture | null>(null);
  useEffect(() => { setSceneAsked(typeof window !== "undefined" ? parseTicketFixture(window.location.search) : null); }, []);
  const scene = audience === "OWNER" ? sceneAsked : null;

  const snap = useTastyQuotes(contract ? [contract.streamer] : []);
  // `state=noquote`: the sample has NO quote for this contract — so no limit is prefilled and the review gate's
  // reason can be read without typing. Every other state shows the real quote stream.
  const q = contract && scene?.state !== "noquote" ? snap.quotes.get(contract.streamer) : undefined;
  const econ = useMemo(() => instrumentEconomics(contract?.symbol ?? symbol, price), [contract?.symbol, symbol, price]);
  const tick = econ.status === "PRICED" ? econ.tickSize : null;
  const pointValue = econ.status === "PRICED" ? econ.pointValue : null;
  const dp = decimals(tick);

  // Sheriff P2-6: no side is pre-staged — nothing is built until the member picks BUY or SELL.
  const [side, setSide] = useState<"BUY" | "SELL" | null>(null);
  useEffect(() => { setSide(null); }, [symbol]);
  // PROOF SCENE (`scene=ticket-fixture`): a SAMPLE book and a pre-picked side, for the signed-in owner only.
  // Every send / cancel / flatten control is refused at the control and no order route can be reached.
  const sceneGate = scene ? railSendGate("PROOF_SCENE", "tastytrade") : null;
  useEffect(() => { if (scene) setSide(scene.side); }, [scene, symbol]);
  // A clock for the quote's age and the prefill's staleness (said, not assumed).
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNowMs(Date.now()), 1000); return () => clearInterval(t); }, []);
  const [closing, setClosing] = useState(false);
  const [qty, setQty] = useState(1);
  // Crypto sizes in coin units; reset when the instrument kind changes.
  useEffect(() => { setQty(kind === "CRYPTO" ? 0.001 : 1); }, [kind]);
  const [entryType, setEntryType] = useState<TastytradeEntryType>("Limit");
  const [entryTrigger, setEntryTrigger] = useState("");
  useEffect(() => { setEntryTrigger(""); }, [symbol]);
  const effectiveEntryType = kind === "FUTURE" || kind === "STOCK" ? entryType : "Limit";
  const [limit, setLimit] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Seed the limit from the touch you would trade against, once per contract + side — only after a
  // side is picked, only from a LIVE quote, and it names its source and age (ticketTruth.prefillNote).
  const seeded = useRef("");
  // A limit the trader set from the chart is never overwritten by the quote prefill.
  const chartLimit = useRef(false);
  useEffect(() => { chartLimit.current = false; }, [symbol]);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  useEffect(() => {
    if (!side) return;
    const key = `${contract?.symbol}|${side}`;
    const touch = side === "BUY" ? q?.ask : q?.bid;
    const fresh = q?.quoteAt != null && selectTapeQuoteFreshness(q.quoteAt, Date.now()).kind === "FRESH";
    if (contract && touch != null && fresh && seeded.current !== key && !chartLimit.current) {
      seeded.current = key;
      const px = Number(touch.toFixed(dp));
      setLimit(touch.toFixed(dp));
      setPrefill({ px, touch: side === "BUY" ? "ASK" : "BID", atMs: q!.quoteAt as number, source: "tastytrade" });
    }
  }, [contract, side, q?.ask, q?.bid, q?.quoteAt, dp]); // eslint-disable-line react-hooks/exhaustive-deps

  const limitNum = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : null;
  const triggerNum = Number.isFinite(Number(entryTrigger)) && Number(entryTrigger) > 0 ? Number(entryTrigger) : null;
  const entryFields = tastytradeEntryFields(effectiveEntryType, limitNum, triggerNum);
  const referenceEntry = effectiveEntryType === "Limit" || effectiveEntryType === "Stop Limit" ? limitNum : null;
  const nudge = (dir: 1 | -1) => { if (limitNum == null || tick == null) return; setLimit((Math.round((limitNum + dir * tick) / tick) * tick).toFixed(dp)); };
  const setTo = (v: number | null | undefined) => { if (v == null) return; setLimit((tick ? Math.round(v / tick) * tick : v).toFixed(dp)); };

  const action: TastytradeIntent["action"] | null = side === "BUY" ? (closing ? "Buy to Close" : "Buy to Open") : side === "SELL" ? (closing ? "Sell to Close" : "Sell to Open") : null;
  const instrumentType: TastytradeIntent["instrumentType"] | null = kind === "FUTURE" ? "Future" : kind === "STOCK" ? "Equity" : kind === "CRYPTO" ? "Cryptocurrency" : null;
  const fractional = kind === "CRYPTO";

  // Risk on the ticket (§LXXVII): $ at the stop, $ at the target, R.
  const stopNum = Number(stop) > 0 ? Number(stop) : null;
  const targetNum = Number(target) > 0 ? Number(target) : null;
  const perUnit = pointValue ?? 1;
  const riskUsd = referenceEntry != null && stopNum != null ? Math.abs(referenceEntry - stopNum) * perUnit * qty : null;
  const rewardUsd = referenceEntry != null && targetNum != null ? Math.abs(targetNum - referenceEntry) * perUnit * qty : null;
  const stopWrongSide = side != null && referenceEntry != null && stopNum != null && (side === "BUY" ? stopNum >= referenceEntry : stopNum <= referenceEntry);
  const notional = referenceEntry != null ? referenceEntry * perUnit * qty : null;

  // ── Garden 19 §23 — TRADE FROM CHART ──────────────────────────────────────
  const owner = audience === "OWNER";
  const tradable = kind === "FUTURE" || kind === "STOCK" || kind === "CRYPTO";
  const server = useServerOrderLimits(owner);
  const [entryPhase, setEntryPhase] = useState<LiveOrderPhase>("DISARMED");
  const pickHosted = useChartPricePickHosted();
  const { pick, picked } = useChartPricePick();
  // A draft price from the chart — an armed pick, a drag of the staged line, or "Trade at <price>" — edits the
  // DRAFT only. It is applied once (consumedChartDraftSeq outlives the panel, so a draft delivered while the
  // ticket was closed is applied when it opens, and one already applied is never re-applied on a reopen).
  // It only sets fields: no focus, no scroll, no step change — a drag never pulls the ticket around.
  const [chartDrafts, setChartDrafts] = useState<readonly ChartDraft[]>([]);
  useEffect(() => { setChartDrafts([]); }, [symbol]);
  useEffect(() => {
    if (!picked || picked.seq <= consumedChartDraftSeq || picked.symbol !== symbol.toUpperCase()) return;
    consumedChartDraftSeq = picked.seq;
    const px = tick ? Math.round(picked.price / tick) * tick : picked.price;
    const v = px.toFixed(dp);
    const source = picked.source ?? "PICK";
    if (picked.role === "STOP") setStop(v);
    else if (picked.role === "TARGET") setTarget(v);
    else {
      const fx = chartEntryEffect(source, effectiveEntryType);
      if (fx.entryType !== effectiveEntryType) setEntryType(fx.entryType);
      if (fx.field === "TRIGGER") setEntryTrigger(v); else { setLimit(v); chartLimit.current = true; }
    }
    setChartDrafts(ds => [...ds.filter(d => d.role !== picked.role), { role: picked.role, px: Number(v), source }]);
    setAnswer(null);
  }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => cancelChartPricePick(), []);
  const pickBtn = (role: "ENTRY" | "STOP" | "TARGET") => pickHosted && owner ? (
    <button type="button" data-testid={`trade-pick-${role.toLowerCase()}`} aria-label={`Pick the ${role.toLowerCase()} on the chart`} aria-pressed={pick?.role === role}
      onClick={() => (pick?.role === role ? cancelChartPricePick() : armChartPricePick(role))} style={{ ...btn(pick?.role === role), minHeight: 26, padding: "0 6px" }}>⌖</button>
  ) : null;

  // STAGED lines on the chart while nothing has been sent from this ticket.
  const stagedEntryPx = referenceEntry ?? (effectiveEntryType === "Stop" ? triggerNum : null);
  useEffect(() => {
    const c = contract?.symbol;
    if (!c || !owner || !tradable || !side || !isPreSendPhase(entryPhase)) { publishChartOrderLines("ticket", symbol, []); return; }
    const exit = side === "BUY" ? "SELL" : "BUY";
    const lines: ChartOrderLine[] = [];
    if (stagedEntryPx != null) lines.push({ id: "ticket-entry", role: "ENTRY", status: "STAGED", price: stagedEntryPx, contract: c, detail: `${side} ${qty} ${effectiveEntryType.toUpperCase()}` });
    if (stopNum != null && !closing) lines.push({ id: "ticket-stop", role: "STOP", status: "STAGED", price: stopNum, contract: c, detail: `${exit} ${qty}`, pnlUsd: riskUsd != null ? -riskUsd : null });
    if (targetNum != null && !closing) lines.push({ id: "ticket-target", role: "TARGET", status: "STAGED", price: targetNum, contract: c, detail: `${exit} ${qty}`, pnlUsd: rewardUsd });
    publishChartOrderLines("ticket", symbol, lines);
  }, [contract?.symbol, owner, tradable, entryPhase, stagedEntryPx, stopNum, targetNum, side, qty, effectiveEntryType, closing, riskUsd, rewardUsd, symbol]);
  useEffect(() => () => publishChartOrderLines("ticket", symbol, []), [symbol]);

  // tastytrade's own working orders and position for this contract (read routes only).
  const mark = q?.bid != null && q?.ask != null ? (q.bid + q.ask) / 2 : q?.last ?? null;
  const brokerRead = useBrokerChartLines({ enabled: owner && tradable && !scene, chartSymbol: symbol, contract: contract?.symbol ?? null, mark, pointValue: kind === "FUTURE" ? pointValue : 1 });
  // In the proof scene the book is the SAMPLE readback, through the same selector; the broker is not read.
  const broker = scene && contract ? ticketFixtureLines(scene, contract.symbol, mark ?? price, kind === "FUTURE" ? pointValue : 1, nowMs) : brokerRead;
  // Proof scene: the SAMPLE position and its working stop are drawn on the chart too, labelled SAMPLE
  // (the broker publisher stays off in a scene — the account is never read).
  const sampleLinesKey = scene && contract ? JSON.stringify(ticketFixtureChartLines(broker)) : "[]";
  useEffect(() => {
    publishChartOrderLines("sample", symbol, JSON.parse(sampleLinesKey));
  }, [sampleLinesKey, symbol]);
  useEffect(() => () => publishChartOrderLines("sample", symbol, []), [symbol]);
  const dated = kind === "FUTURE" && contract ? datedFuturesContract(contract.symbol, Date.now()) : null;
  const quoteForGate = q ? { bid: q.bid, ask: q.ask, atMs: q.quoteAt } : null;

  // §24 — a SpaidBot PROPOSAL waits here; loading it stages the ticket, never sends.
  const proposal = useSpaidBotProposal(symbol);
  const [loadedProposal, setLoadedProposal] = useState<SpaidBotProposal | null>(null);
  const [proposalWhy, setProposalWhy] = useState<string | null>(null);
  function loadProposal(p: SpaidBotProposal) {
    const cap = kind === "STOCK" ? server.limits?.maxSharesPerOrder ?? null : server.limits?.maxContractsPerOrder ?? null;
    const r = proposalToTicket(p, cap, Date.now());
    if (!r.ok) { setProposalWhy(r.reasons.join(" ")); return; }
    const t = r.ticket;
    setSide(t.side); setClosing(false); setQty(t.qty); setEntryType("Limit");
    setLimit(t.limitPx.toFixed(dp)); setStop(t.stopPx.toFixed(dp)); setTarget(t.targetPx != null ? t.targetPx.toFixed(dp) : "");
    seeded.current = `${contract?.symbol}|${t.side}`;
    decisionRef.current = t.decisionId;
    setLoadedProposal(recordProposalEvent(p, "LOADED_INTO_TICKET", "TRADER", Date.now()));
    setProposalWhy(null);
    dismissSpaidBotProposal(symbol);
  }

  const decisionRef = useRef<string | null>(null);
  useEffect(() => { decisionRef.current = bornDecision?.decisionId ?? null; }, [bornDecision]);
  function ensureDecision(): string | null {
    // PROOF SCENE: no decision is ever minted, so the live-order block refuses its preview and its send
    // before either reaches a route ("No decision to express") — the block itself is not edited.
    if (scene) return null;
    if (decisionRef.current) return decisionRef.current;
    const born = continueOrMint(bornDecision, { cause: "EXPLICIT_INTENT", deviceId: bornDecision?.bornOnDeviceId ?? thisDeviceId(), nowMs: Date.now(), nonce: crypto.randomUUID() });
    if (!born.ok) { setAnswer(born.reason); return null; }
    if (!bornDecision) onIdentity(born.identity);
    decisionRef.current = born.identity.decisionId;
    return born.identity.decisionId;
  }

  async function dryRun() {
    if (!contract || !instrumentType || !entryFields || !action || busy || scene) return;
    setBusy(true);
    try {
      const decisionId = ensureDecision();
      if (!decisionId) return;
      const r = await fetch("/api/broker/tastytrade/order-dry-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instrumentType, symbol: contract.symbol, action, qty, ...entryFields, decisionId, environment: server.environment, protectiveStopPx: closing ? null : stopNum, quote: quoteForGate }),
      });
      const j = await r.json().catch(() => null);
      // Garden 19 §23: the server's own gate answers beside the broker. The account
      // is named in the live ticket below, so this check leaves that one refusal to it.
      const gateRefusals = Array.isArray(j?.preflight?.refusals) ? (j.preflight.refusals as { code: string; reason: string }[]).filter(x => x.code !== "ACCOUNT_UNSTATED") : [];
      const gateWords = j?.preflight ? (gateRefusals.length ? ` SERVER GATE would refuse the send: ${gateRefusals.map(x => x.reason).join(" ")}` : " SERVER GATE: inside your limits.") : "";
      if (j?.state === "DRY_RUN_OK") {
        const bp = j.result?.["buying-power-effect"];
        const fee = j.result?.["fee-calculation"];
        setAnswer(`tastytrade accepted the dry run${bp?.["change-in-buying-power"] ? ` · buying power ${bp["change-in-buying-power-effect"] === "Debit" ? "−" : "+"}${bp["change-in-buying-power"]}` : ""}${fee?.["total-fees"] ? ` · fees ${fee["total-fees"]}` : ""} — nothing was placed.${gateWords}`);
      } else if (isOwnerRefusal(j, r.status)) {
        // guest audit 2026-10-04: the owner gate's 403 is "not on your account", not "HTTP 403".
        setAnswer(TASTYTRADE_NOT_AVAILABLE);
      } else {
        const why = j?.reason ?? j?.error;
        setAnswer(`${j?.state ? plainBrokerAnswer(j.state) : `The dry run did not go through (${r.status}).`}${why ? ` · ${why}` : ""}${gateWords}`);
      }
    } catch {
      setAnswer("The dry run did not return.");
    } finally {
      setBusy(false);
    }
  }

  const btn = (on: boolean, color = GOLD): React.CSSProperties => ({
    minHeight: 30, padding: "0 10px", borderRadius: 6, border: `1px solid ${on ? color : LINE}`,
    background: on ? `${color}22` : "transparent", color: on ? color : INK, fontSize: 12, fontWeight: 600, cursor: "pointer",
  });
  const sizes = kind === "STOCK" ? [1, 10, 50, 100] : kind === "CRYPTO" ? [0.001, 0.01, 0.1, 1] : [1, 2, 3, 5];
  // Compact phone ticket (≤ 430 px): the same ticket, action path first, the rest behind one Details disclosure.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = typeof window !== "undefined" ? window.matchMedia?.(COMPACT_TICKET_QUERY) : null;
    if (!mq) return;
    const on = () => setCompact(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  const riskLine = compactRiskLine({ stopWrongSide, riskUsd, rewardUsd, entryKnown: referenceEntry != null });
  // PEEK / ACT: folded to see the chart, or grown to act. CSS only — nothing unmounts; never folded while an order is in flight.
  const [folded, setFolded] = useState(false);
  useEffect(() => { if (side) setFolded(false); }, [side]);
  const stageInput = { compact, sidePicked: side != null, folded, preSend: isPreSendPhase(entryPhase) && scene?.state !== "inflight" };
  const stage = ticketStage(stageInput);
  const fold = foldControl(stageInput);
  // HALF: the trader's own option on a phone — ACT at half height so the chart's order lines stay in view.
  const [half, setHalf] = useState(false);
  const halfInput = { compact, stage, half, preSend: stageInput.preSend };
  const halfCtl = halfControl(halfInput);
  const halfOn = halfInForce(halfInput);
  const gripY = useRef<number | null>(null);
  // Keyboard (order §6): B / S side, Esc closes, ↑ / ↓ steps a focused price by a tick — and Enter NEVER sends.
  const onTicketKey = (e: React.KeyboardEvent<HTMLElement>) => {
    const t = e.target as HTMLElement;
    const a = ticketKeyAction({ key: e.key, ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey, composing: e.nativeEvent.isComposing, tag: t.tagName, label: t.getAttribute("aria-label"), preSend: stageInput.preSend });
    if (!a) return;
    e.preventDefault();
    if (a.kind === "SWALLOW_ENTER") return;
    if (a.kind === "CLOSE") { onClose(); return; }
    if (a.kind === "SIDE") { if (owner && tradable) setSide(a.side); return; }
    const set = a.field === "LIMIT" ? setLimit : a.field === "TRIGGER" ? setEntryTrigger : a.field === "STOP" ? setStop : setTarget;
    const cur = a.field === "LIMIT" ? limit : a.field === "TRIGGER" ? entryTrigger : a.field === "STOP" ? stop : target;
    const next = stepPriceText(cur, a.dir, tick, dp);
    if (next !== null) set(next);
  };
  // ACT has two steps on a phone: BUILD (closing, size, price, stop / target, risk) and REVIEW (the live-order
  // block alone). CSS only — both stay mounted. REVIEW is forced while an order is in flight.
  const [reviewing, setReviewing] = useState(false);
  useEffect(() => { setReviewing(false); }, [side, symbol]);
  const step = ticketStep({ stage, reviewing, preSend: stageInput.preSend, compact });
  const review = reviewGate({ priceOk: entryFields != null, entryType: effectiveEntryType, stopWrongSide });
  // Sheriff P1-2: a chart's bar close is not a quote — the limit is never prefilled from it.
  const quoteLabel = quoteStreamLabel({ stream: snap.stream, bid: q?.bid, ask: q?.ask, quoteAtMs: q?.quoteAt, nowMs, contract: contract?.symbol ?? null, streamWords: STREAM_WORDS });
  // Beside the fields: which draft prices came from the chart, for as long as each field still holds that price.
  const draftOf = (role: ChartDraft["role"]) => chartDrafts.find(d => d.role === role) ?? null;
  const chartDraftNotes = [
    chartDraftNote(draftOf("ENTRY"), effectiveEntryType === "Stop" || effectiveEntryType === "Stop Limit" ? triggerNum : limitNum, "ENTRY"),
    chartDraftNote(draftOf("STOP"), stopNum, "STOP"),
    chartDraftNote(draftOf("TARGET"), targetNum, "TARGET"),
  ].filter((n): n is string => !!n);
  const prefillLine = prefillNote({ prefill, limitPx: limitNum, currentTouch: prefill?.touch === "ASK" ? q?.ask : q?.bid, tick, nowMs });
  // §23 — POSITION STATE · WORKING ORDERS · MODIFY · FLATTEN, from the broker readback only; fail-closed.
  const book = ticketBook(broker, contract?.symbol ?? null, { killSwitch: !!server.limits?.killSwitch, limitsSet: server.state === "SET", proofRefusal: sceneGate?.reason ?? null });
  const [cancelAcks, setCancelAcks] = useState<Record<string, CancelAck>>({});
  const [cancelBusy, setCancelBusy] = useState<string | null>(null);
  useEffect(() => { setCancelAcks({}); setCancelBusy(null); }, [contract?.symbol]);
  /** Cancel one working order read back from tastytrade. The words after are the broker's readback, never this ticket's. */
  async function cancelWorking(o: WorkingOrderRow) {
    if (scene || !o.cancel.allowed || o.accountIndex == null || cancelBusy) return;
    setCancelBusy(o.id);
    try {
      const r = await fetch(`/api/broker/tastytrade/orders?accountIndex=${o.accountIndex}&id=${encodeURIComponent(o.id)}`, { method: "DELETE" });
      const j = await r.json().catch(() => null);
      const back = j?.order && typeof j.order.state === "string" ? (j.order as { state: WmOrderState }) : null;
      const ack: CancelAck = back
        ? { state: back.state, words: brokerStateWords(back) }
        : isOwnerRefusal(j, r.status) ? { state: "NOT_AVAILABLE", words: TASTYTRADE_NOT_AVAILABLE }
        : { state: j?.state ?? `HTTP ${r.status}`, words: `${j?.state ? plainBrokerAnswer(j.state) : `tastytrade did not answer clearly (${r.status})`}${j?.reason ? ` · ${j.reason}` : ""} — the order may still be working.` };
      setCancelAcks(prev => ({ ...prev, [o.id]: ack }));
    } catch {
      setCancelAcks(prev => ({ ...prev, [o.id]: { state: "NOT_SENT", words: "The cancel request did not return — the order may still be working. Check with tastytrade." } }));
    } finally {
      setCancelBusy(null);
    }
  }

  // ── The ticket's sections, built ONCE; ticketLayout decides their order (phone: action first, the rest behind Details). ──
  const sectionEl: Record<TicketSection, React.ReactNode> = {
    QUOTE: (<>
          {/* Live touch */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, ...MONO }}>
            <span style={{ color: MUTED }}>bid</span><strong>{q?.bid != null ? q.bid.toFixed(dp) : "—"}</strong>
            <span style={{ color: MUTED }}>ask</span><strong>{q?.ask != null ? q.ask.toFixed(dp) : "—"}</strong>
            <span data-testid="trade-quote-state" data-state={snap.stream} data-live={quoteLabel.live ? "yes" : "no"} style={{ marginLeft: "auto", color: quoteLabel.live ? GREEN : GOLD }}>● {quoteLabel.text}</span>
          </div>
          {contractWhy ? <p style={{ color: GOLD }}>{contractWhy}</p> : null}
    </>),
    PROPOSAL: (<>
          {/* §24 — SpaidBot PROPOSES; the trader decides. */}
          {proposal ? (
            <div data-testid="trade-spaidbot-proposal" style={{ border: `1px dashed ${GOLD}`, borderRadius: 8, padding: 8, display: "grid", gap: 4 }}>
              <strong style={{ color: GOLD, fontSize: 11, letterSpacing: 1 }}>SPAIDBOT PROPOSES · PROPOSE ONLY — nothing is sent</strong>
              {/* §24 boundary, on the glass: observe → propose → you authorise. */}
              <span data-testid="trade-proposal-boundary" style={{ color: MUTED, fontSize: 11 }}>{SPAIDBOT_BOUNDARY}</span>
              <span style={MONO}>{proposal.side} {proposal.qty} @ {proposal.entryPx} · stop {proposal.stopPx}{proposal.targetPx != null ? ` · target ${proposal.targetPx}` : ""}</span>
              <span>{proposal.reason}</span>
              {proposal.evidence.map((e, i) => <span key={i} style={{ color: MUTED, fontSize: 11 }}>· {e.claim} — {e.source}</span>)}
              <span style={{ color: MUTED, fontSize: 10 }}>{proposal.decisionId} · {proposal.orderIntentId}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" data-testid="trade-load-proposal" onClick={() => loadProposal(proposal)} style={btn(true)}>Load into ticket</button>
                <button type="button" onClick={() => dismissSpaidBotProposal(symbol)} style={btn(false)}>Dismiss</button>
              </div>
            </div>
          ) : null}
          {proposalWhy ? <p role="status" style={{ color: GOLD }}>{proposalWhy}</p> : null}
          {loadedProposal ? <p data-testid="trade-proposal-loaded" style={{ color: MUTED, fontSize: 11 }}>Loaded from SpaidBot proposal {loadedProposal.proposalId} ({loadedProposal.reason}). Preview and confirmation are still yours.</p> : null}
    </>),
    BOOK: (<>
          {/* §23 — the book, from tastytrade's readback only: position state, working orders (cancel), modify, flatten. */}
          <TicketBookRows book={book} acks={cancelAcks} busyId={cancelBusy} onCancel={o => { void cancelWorking(o); }}
            onFlatten={() => {
              const f = book.flatten.plan;
              if (!f) return;
              setSide(f.action === "Sell to Close" ? "SELL" : "BUY"); setClosing(true); setQty(f.qty); setEntryType("Market");
              setAnswer("FLATTEN loaded: a closing MARKET order for the held quantity. Preview and confirm below to send it.");
            }} />
    </>),
    SIDE: (<>
          {/* Side + open/close */}
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" data-testid="trade-buy" aria-pressed={side === "BUY"} onClick={() => setSide("BUY")} style={{ ...btn(side === "BUY", GREEN), flex: 1, minHeight: 36, fontSize: 13 }}>BUY</button>
            <button type="button" data-testid="trade-sell" aria-pressed={side === "SELL"} onClick={() => setSide("SELL")} style={{ ...btn(side === "SELL", RED), flex: 1, minHeight: 36, fontSize: 13 }}>SELL</button>
          </div>
    </>),
    CLOSING: (<>
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: MUTED }}>
            <input type="checkbox" checked={closing} onChange={e => setClosing(e.target.checked)} /> This closes a position I hold
          </label>
    </>),
    ACTION_LINE: (<>
          <p data-testid="trade-order-action" style={{ color: side ? INK : GOLD, fontSize: 11, margin: 0 }}>{orderActionLine(side, closing)}</p>
    </>),
    SIZE: (<>
          {/* Size */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: MUTED, width: 64 }}>{kind === "FUTURE" ? "Contracts" : kind === "CRYPTO" ? (contract?.symbol.split("/")[0] ?? "Coins") : "Shares"}</span>
            {sizes.map(n => <button key={n} type="button" data-testid={`trade-size-${n}`} aria-pressed={qty === n} onClick={() => setQty(n)} style={btn(qty === n)}>{n}</button>)}
            <input type="number" min={fractional ? 0.00000001 : 1} step={fractional ? "any" : 1} value={qty} aria-label="Quantity"
              onChange={e => { const v = Number(e.target.value); setQty(fractional ? (v > 0 ? v : 0.001) : Math.max(1, Math.floor(v || 1))); }}
              style={{ width: 64, background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: 4, borderRadius: 4, ...MONO }} />
          </div>
    </>),
    ENTRY_TYPE: (<>
          {(kind === "FUTURE" || kind === "STOCK") ? <label style={{ color: MUTED }}>Entry order type
            <select aria-label="Entry order type" value={entryType} onChange={e => { setEntryType(e.target.value as TastytradeEntryType); setAnswer(null); }} style={{ marginLeft: 8, background: "#0b0a08", color: INK }}>
              {(["Market", "Limit", "Stop", "Stop Limit"] as const).map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </label> : null}
    </>),
    PRICE: (<>
          {effectiveEntryType === "Market" ? <p style={{ color: MUTED }}>Market entry: fill price and entry risk are unknown until execution.</p> : null}
          {(effectiveEntryType === "Stop" || effectiveEntryType === "Stop Limit") ? <label style={{ color: MUTED }}>Entry stop trigger
            <input aria-label="Entry stop trigger" inputMode="decimal" value={entryTrigger} onChange={e => setEntryTrigger(e.target.value)} style={{ marginLeft: 8, width: 110, background: "#0b0a08", color: INK }} />
            {pickBtn("ENTRY")}
            {effectiveEntryType === "Stop" ? " · fill price is not guaranteed" : " · activates the limit order"}
          </label> : null}
          {(effectiveEntryType === "Limit" || effectiveEntryType === "Stop Limit") ? <>
          {/* Limit */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ color: MUTED, width: 64 }}>Limit</span>
            {pickBtn("ENTRY")}
            <button type="button" aria-label="One tick lower" onClick={() => nudge(-1)} style={btn(false)}>−</button>
            <input inputMode="decimal" value={limit} aria-label="Limit price" onChange={e => setLimit(e.target.value)}
              style={{ width: 110, background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: 4, borderRadius: 4, ...MONO }} />
            <button type="button" aria-label="One tick higher" onClick={() => nudge(1)} style={btn(false)}>+</button>
            <button type="button" onClick={() => setTo(q?.bid)} style={btn(false)}>BID</button>
            <button type="button" onClick={() => setTo(q?.bid != null && q?.ask != null ? (q.bid + q.ask) / 2 : null)} style={btn(false)}>MID</button>
            <button type="button" onClick={() => setTo(q?.ask)} style={btn(false)}>ASK</button>
          </div>
          {prefillLine ? <p data-testid="trade-prefill-note" data-stale={prefillLine.stale ? "yes" : "no"} style={{ color: prefillLine.stale ? GOLD : MUTED, fontSize: 11, margin: 0 }}>{prefillLine.text}</p> : null}

          </> : null}
    </>),
    RISK_INPUTS: (<>
          {/* Risk on the ticket */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <label style={{ color: MUTED }}>Stop / invalidation {pickBtn("STOP")}
              <input inputMode="decimal" value={stop} aria-label="Stop price" onChange={e => setStop(e.target.value)}
                style={{ width: "100%", background: "#0b0a08", border: `1px solid ${stopWrongSide ? RED : LINE}`, color: INK, padding: 4, borderRadius: 4, ...MONO }} />
            </label>
            <label style={{ color: MUTED }}>Target {pickBtn("TARGET")}
              <input inputMode="decimal" value={target} aria-label="Target price" onChange={e => setTarget(e.target.value)}
                style={{ width: "100%", background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: 4, borderRadius: 4, ...MONO }} />
            </label>
          </div>
    </>),
    ECONOMICS: (<>
          <div data-testid="trade-economics" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, ...MONO }}>
            {kind === "FUTURE" ? <><span style={{ color: MUTED }}>Point value</span><span>{pointValue != null ? `$${pointValue}/pt · tick ${tick} = $${econ.status === "PRICED" ? econ.tickValue : "—"}` : "not on file"}</span></> : null}
            <span style={{ color: MUTED }}>{kind === "FUTURE" ? "Notional" : "Cost"}</span><span>{notional != null ? `$${notional.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}</span>
            <span style={{ color: MUTED }}>Planned risk at stop</span><span style={{ color: riskUsd != null ? RED : MUTED }}>{stopWrongSide ? "stop is on the wrong side" : riskUsd != null ? `−$${riskUsd.toFixed(2)}` : referenceEntry == null ? "entry fill unknown" : "set a stop"}</span>
            <span style={{ color: MUTED }}>Reward at target</span><span style={{ color: rewardUsd != null ? GREEN : MUTED }}>{rewardUsd != null ? `+$${rewardUsd.toFixed(2)}${riskUsd ? ` · ${(rewardUsd / riskUsd).toFixed(2)}R` : ""}` : "—"}</span>
          </div>
    </>),
    PICK_STATUS: (<>
          {chartDraftNotes.map(n => <p key={n} data-testid="trade-chart-draft-note" style={{ color: GOLD, fontSize: 11, margin: 0 }}>{n}</p>)}
          {pick ? <p role="status" data-testid="trade-pick-armed" style={{ color: GOLD, fontSize: 11 }}>Click a price on the chart for the {pick.role.toLowerCase()}.</p> : null}
    </>),
    PROTECTION_DRYRUN: (<>
          <p data-testid="trade-protection" style={{ color: MUTED, fontSize: 11 }}>
            An opening order is refused without a protective stop on the right side of the entry; the server checks the loss at that stop against your ceiling.{" "}
            Protection is sent separately below, once you hold the position: a <strong style={{ color: GOLD }}>broker-native stop</strong> (a resting Stop at tastytrade, GTC) and a target (a resting Limit, GTC). They are <strong style={{ color: GOLD }}>not linked</strong> (no OCO yet) — if one fills, cancel the other.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" data-testid="trade-dry-run" disabled={!contract || !entryFields || !action || busy || !!scene} onClick={() => void dryRun()} style={{ ...btn(true), opacity: !contract || !entryFields || !action || scene ? 0.5 : 1 }}>
              {busy ? "Asking tastytrade…" : "Dry run on tastytrade"}
            </button>
            <span style={{ color: MUTED, fontSize: 11 }}>{sceneGate ? sceneGate.reason : "Validates against your real account; places nothing."}</span>
          </div>
          {answer ? <p role="status" style={{ color: /accepted/.test(answer) ? GREEN : GOLD }}>{answer}</p> : null}
    </>),
    PLAN: (<>
          {/* Garden 19 §27: what the ticket does not carry — frozen with its stop and target at the send. */}
          <ManagementPlanCard mode="ticket" symbol={symbol} />
    </>),
    LIVE_ORDER: (<>
          {sceneGate ? <p role="status" data-testid="trade-proof-refusal" style={{ color: GOLD, fontSize: 11, margin: 0, fontWeight: 700 }}>{sceneGate.reason}</p> : null}
          {/* In the scene the real block is shown at its real size inside a disabled fieldset: no control in it can be pressed. */}
          <fieldset data-testid="trade-live-fieldset" disabled={!!scene} style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
            <TastytradeLiveOrder
              intent={contract && instrumentType && action ? { instrumentType, symbol: contract.symbol, action, qty, orderType: effectiveEntryType, limitPx: effectiveEntryType === "Limit" || effectiveEntryType === "Stop Limit" ? limitNum : null, stopPx: effectiveEntryType === "Stop" || effectiveEntryType === "Stop Limit" ? triggerNum : null, describe: contract.symbol, protectiveStopPx: closing ? null : stopNum, quote: quoteForGate, chartSymbol: symbol } : null}
              ensureDecision={ensureDecision}
              onPhase={setEntryPhase}
              journal={{ targetPx: closing ? null : targetNum, plannedStopPx: stopNum, orderIntentId: loadedProposal?.orderIntentId ?? null, multiplier: kind === "FUTURE" ? pointValue : kind === "STOCK" ? 1 : null }}
            />
          </fieldset>
          {scene ? null : <PendingFillJournalOffers />}
    </>),
    PROTECT: (<>
          {/* §LXXVIII — PROTECTION, broker-native, each armed and pressed by the human. */}
          {kind !== "CRYPTO" && contract && instrumentType && side ? (
            <details data-testid="trade-protect" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "6px 8px" }}>
              <summary style={{ cursor: "pointer", color: GOLD, fontWeight: 600 }}>Protect the position — stop & target at the broker</summary>
              {sceneGate ? <p role="status" style={{ color: GOLD, fontSize: 11, fontWeight: 700 }}>{sceneGate.reason}</p> : null}
              <p data-testid="trade-protect-basis" style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>
                {/* Sheriff P1 (2026-10-08): this used to speak of "1 /NQZ6 long" from the STAGED side, as if it were a position. */}
                {protectBasisLine({ positionState: book.position.state, held: broker?.position ? { direction: broker.position.row.direction, quantity: broker.position.row.quantity } : null, stagedSide: side, stagedQty: qty, contract: contract.symbol })}
              </p>
              {/* PROOF SCENE: the protect blocks are natively disabled too (and refused by the null decision). */}
              <fieldset data-testid="trade-protect-fieldset" disabled={!!scene} style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
              {stopNum != null && !stopWrongSide ? (
                <TastytradeLiveOrder
                  intent={{ instrumentType, symbol: contract.symbol, action: side === "BUY" ? "Sell to Close" : "Buy to Close", qty, limitPx: null, orderType: "Stop", stopPx: stopNum, tif: "GTC", describe: `${contract.symbol} protective stop`, quote: quoteForGate, chartSymbol: symbol }}
                  ensureDecision={ensureDecision}
                  journal={{ plannedStopPx: stopNum, targetPx: targetNum, multiplier: kind === "FUTURE" ? pointValue : kind === "STOCK" ? 1 : null }}
                />
              ) : <p style={{ color: GOLD, fontSize: 11 }}>{stopWrongSide ? "The stop is on the wrong side of the entry." : "Type a stop above to send it as a resting Stop."}</p>}
              {targetNum != null ? (
                <TastytradeLiveOrder
                  intent={{ instrumentType, symbol: contract.symbol, action: side === "BUY" ? "Sell to Close" : "Buy to Close", qty, limitPx: targetNum, tif: "GTC", describe: `${contract.symbol} target`, quote: quoteForGate, chartSymbol: symbol }}
                  ensureDecision={ensureDecision}
                  journal={{ plannedStopPx: stopNum, targetPx: targetNum, multiplier: kind === "FUTURE" ? pointValue : kind === "STOCK" ? 1 : null }}
                />
              ) : <p style={{ color: MUTED, fontSize: 11 }}>Type a target above to send it as a resting Limit.</p>}
              </fieldset>
            </details>
          ) : null}
    </>),
    RISK_LINE: (
      <p data-testid="trade-risk-compact" role={riskLine.refusal ? "status" : undefined} style={{ color: riskLine.refusal ? RED : MUTED, fontSize: 11, margin: 0, ...MONO }}>{riskLine.text}</p>
    ),
  };
  return (
    <section
      data-testid="trade-panel"
      onKeyDown={onTicketKey}
      data-layout={compact ? "compact" : "full"}
      data-stage={stage}
      data-step={step ?? undefined}
      data-half={halfOn ? "yes" : undefined}
      aria-label={`Trade ${symbol}`}
      style={{
        // §XIV: a market instrument never covers the forming candle, the live
        // price or a stop/target on price — all at the chart's right edge
        // (serving MNQ 1m, 2026-10-01: the panel at right:24 hid the forming
        // bar). It stands at the chart's lower LEFT, over settled history.
        position: "fixed", left: 24, bottom: 64, zIndex: 60, width: "min(400px, calc(100vw - 48px))", maxHeight: !compact ? WIDE_TICKET_MAX_HEIGHT : stage === "PEEK" ? COMPACT_PEEK_MAX_HEIGHT : halfOn ? COMPACT_HALF_MAX_HEIGHT : COMPACT_ACT_MAX_HEIGHT, overflowY: "auto", overflowX: "hidden",
        background: "#0d0b08", border: `1px solid ${LINE}`, borderRadius: 12, boxShadow: "0 18px 48px rgba(0,0,0,0.6)", color: INK, fontSize: 12,
      }}
    >
      {/* The HALF grip: drag the sheet's top edge down to half height, up to full (snaps on release). Same rules as
          the HALF ▾ button beside KILL — refused while an order is in flight. */}
      {halfCtl.shown ? (
        <div data-testid="trade-half-grip" role="separator" aria-orientation="horizontal" aria-label={halfCtl.ariaLabel}
          onPointerDown={e => { gripY.current = e.clientY; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); }}
          onPointerUp={e => { const y0 = gripY.current; gripY.current = null; if (y0 == null) return; const next = halfFromDrag(e.clientY - y0, halfCtl); if (next !== null) setHalf(next); }}
          onPointerCancel={() => { gripY.current = null; }}
          style={{ height: 20, display: "grid", placeItems: "center", cursor: halfCtl.enabled ? "ns-resize" : "not-allowed", touchAction: "none" }}>
          <span aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 2, background: halfCtl.enabled ? GOLD : MUTED, opacity: 0.7 }} />
        </div>
      ) : null}
      <header data-testid="trade-header" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: compact ? "2px 8px" : "6px 8px", padding: compact ? "6px 10px" : "10px 12px", borderBottom: `1px solid ${LINE}`, minWidth: 0 }}>
        <strong style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 15, letterSpacing: 1 }}>TRADE</strong>
        <span data-testid="trade-kind" style={{ fontSize: 10, letterSpacing: 1.2, color: GOLD, border: `1px solid ${LINE}`, borderRadius: 4, padding: "1px 6px" }}>{kind === "FUTURE" ? "FUTURE" : kind}</span>
        <span style={{ fontWeight: 600, minWidth: 0, overflowWrap: "anywhere" }}>{contract?.symbol ?? symbol}</span>
        {kind === "FUTURE" && contract && contract.symbol !== symbol.toUpperCase() ? <span data-testid="trade-dated-contract" title={`${symbol} → ${dated?.label ?? contract.symbol}`} style={{ color: MUTED, whiteSpace: "nowrap" }}>{dated ? `${dated.month} ${dated.year}` : `from ${symbol}`}</span> : null}
        {audience === "OWNER" && <button type="button" data-testid="trade-live-arm" onClick={() => openSettings("execution")}
          title={liveArmed ? "Live orders can be armed — open Settings › Execution" : "Live trading is disarmed — open Settings › Execution; nothing can be sent until it is armed there"}
          style={{ fontSize: 9.5, letterSpacing: 1.1, fontWeight: 700, borderRadius: 4, padding: "2px 6px", border: `1px solid ${liveArmed ? RED : LINE}`, color: liveArmed ? RED : MUTED, background: "none", cursor: "pointer" }}>
          {liveArmed ? "LIVE ARMED" : "LIVE DISARMED"}
        </button>}
        {owner && <button type="button" data-testid="trade-kill-switch" disabled={!!server.limits?.killSwitch || !!scene}
          onClick={() => { if (!scene) void changeServerOrderLimits({ killSwitch: true }); }}
          title={server.limits?.killSwitch ? "Kill switch engaged — release it in Settings › Execution" : "Kill switch: one press refuses every new live order (cancel stays open)"}
          style={{ fontSize: 9.5, letterSpacing: 1.1, fontWeight: 700, borderRadius: 4, padding: "2px 6px", border: `1px solid ${RED}`, color: server.limits?.killSwitch ? "#fff" : RED, background: server.limits?.killSwitch ? "#7a2a22" : "none", cursor: "pointer" }}>
          {server.limits?.killSwitch ? "KILLED" : "KILL"}
        </button>}
        {fold.shown ? <button type="button" data-testid="trade-fold" aria-label={fold.ariaLabel} aria-pressed={folded} disabled={!fold.enabled}
          onClick={() => { if (fold.enabled) setFolded(v => !v); }}
          style={{ fontSize: 9.5, letterSpacing: 1.1, fontWeight: 700, borderRadius: 4, padding: "2px 6px", minHeight: 24, border: `1px solid ${LINE}`, color: fold.enabled ? GOLD : MUTED, background: "none", cursor: fold.enabled ? "pointer" : "not-allowed" }}>
          {fold.label}
        </button> : null}
        {halfCtl.shown ? <button type="button" data-testid="trade-half" aria-label={halfCtl.ariaLabel} aria-pressed={halfOn} disabled={!halfCtl.enabled}
          onClick={() => { if (halfCtl.enabled) setHalf(v => !v); }}
          style={{ fontSize: 9.5, letterSpacing: 1.1, fontWeight: 700, borderRadius: 4, padding: "2px 6px", minHeight: 24, border: `1px solid ${LINE}`, color: halfCtl.enabled ? GOLD : MUTED, background: "none", cursor: halfCtl.enabled ? "pointer" : "not-allowed" }}>
          {halfCtl.label}
        </button> : null}
        <button type="button" data-testid="trade-close" aria-label="Close trade panel" onClick={onClose} style={{ marginLeft: "auto", flexShrink: 0, minWidth: 32, minHeight: 32, color: MUTED, fontSize: 16, background: "none", border: "none", cursor: "pointer" }}>×</button>
      </header>
      {scene ? <p role="status" data-testid="trade-proof-banner" data-scene-state={scene.state} style={{ margin: 0, padding: "4px 12px", borderBottom: `1px solid ${GOLD}`, color: GOLD, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6 }}>{TICKET_FIXTURE_BANNER}</p> : null}

      {audience !== "OWNER" ? (
        <div data-testid="trade-guest" style={{ padding: 12 }}>
          <p style={{ color: MUTED }}>
            {audience === null ? "Checking which broker rails are open on your account…" : "Live broker orders aren't available on your account. Practise this exact trade in Paper — same chart, same levels, no money at risk."}
          </p>
          {audience === "GUEST" && <button type="button" onClick={onOpenPaper} style={{ ...btn(true), marginTop: 8 }}>Open Paper</button>}
        </div>
      ) : kind === "FX" ? (
        <p data-testid="trade-fx-truth" style={{ padding: 12, color: GOLD }}>
          NO CONNECTED SPOT-FX EXECUTION RAIL. Neither tastytrade nor Webull offers spot FX here, and WM never swaps in a currency future (6E) on its own. The chart, levels and risk still work.
        </p>
      ) : kind === "OPTION" ? (
        <div style={{ padding: 12 }}>
          <p style={{ color: MUTED }}>Options trade from the Options family — chain, shortlist and ticket with live quotes.</p>
          <button type="button" onClick={onOpenOptions} style={{ ...btn(true), marginTop: 8 }}>Open Options</button>
        </div>
      ) : (
        <div style={{ padding: compact ? "8px 10px" : 12, display: "grid", gap: compact ? 6 : 10 }}>
          <TicketSections compact={compact} bookActive={bookIsActive(book)} peek={stage === "PEEK"} step={step} review={review} inFlight={!stageInput.preSend}
            onReview={() => { if (review.allowed) setReviewing(true); }} onEdit={() => { if (stageInput.preSend) setReviewing(false); }}
            sections={sectionEl} summary={detailsSummary(book, { inside: owner && tradable })} />
        </div>
      )}

      <footer data-testid="trade-footer" hidden={step === "REVIEW"} style={{ padding: "8px 12px", borderTop: `1px solid ${LINE}`, display: step === "REVIEW" ? "none" : "flex", gap: 10 }}>
        {kind === "STOCK" || kind === "FUTURE" ? (
          <button type="button" data-testid="trade-express-option" onClick={onOpenOptions} style={{ background: "none", border: "none", color: GOLD, fontSize: 11, cursor: "pointer" }}>
            Express it with an option →
          </button>
        ) : null}
        {/* Alpaca paper has no spot FX either — the door is not offered beside the FX refusal. */}
        {kind !== "FX" ? <button type="button" data-testid="trade-open-paper" onClick={onOpenPaper} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, textDecoration: "underline", cursor: "pointer" }}>Alpaca paper account</button> : null}
      </footer>
    </section>
  );
}
