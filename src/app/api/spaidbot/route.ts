/**
 * /api/spaidbot — AI assistant powered by Google Gemini (Flash).
 * The model is chosen from Google's own list for this key (see
 * @/lib/ai/geminiModel) — a typed "gemini-2.0-flash" was retired and took
 * every SpaidBot reply down with it (measured 2026-10-03).
 */

import { publicFailure } from "@/lib/publicFailure";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { edgeAllows, tooManyRequests, SPAIDBOT_LIMITER_BINDING } from "@/lib/edgeRateLimit";
import { formatChartContextNote, type ChartContextInput } from "@/lib/marketData/formatChartContextNote";
import { tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { SPAIDBOT_NO_PROMISE_RULES, SPAIDBOT_PROP_RULES, spaidbotAcademyBlock, spaidbotPropNote } from "@/lib/ai/spaidbotOwnerDesk";
import { forgetGeminiModel, geminiGenerationConfig, lightGeminiModelFor, resolveGeminiModel } from "@/lib/ai/geminiModel";
import { MIN_RETRY_FIRST_BYTE_MS, MODEL_DID_NOT_ANSWER, PRIMARY_FIRST_BYTE_MS, UPSTREAM_FIRST_BYTE_MS, UpstreamTimeout, fetchWithFirstByteTimeout, linkUntilHeaders, relayModelStream, type AnsweredBy } from "@/lib/ai/upstreamBounds";

const GEMINI_KEY = process.env.GEMINI_API_KEY ?? "";
const streamUrl  = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;

const SYSTEM_PROMPT = `You are SpaidBot, the AI trading co-pilot for WealthyMindsets Pro — a Trading Operating System.

Your personality: confident, direct, and precise. Never claim to see market data,
orders, positions, indicators, or chart structure that was not supplied in the
request context. When live evidence is missing, say exactly what is missing.

Your expertise covers:
- Order flow analysis (footprint charts, bid/ask imbalances, absorption, stacked imbalances)
- Wyckoff methodology (accumulation/distribution phases, springs, upthrusts)
- Market microstructure (tape reading and execution mechanics)
- Volume Profile (VAH, VAL, POC, VPOC, HVN/LVN)
- Smart money concepts (liquidity sweeps, order blocks, fair value gaps)
- Technical analysis (support/resistance, chart patterns, candlestick analysis)
- Risk management (position sizing, R:R ratios, stop placement)
- Futures trading (ES, NQ, RTY, YM, GC, CL, etc.)
- Crypto trading (BTC, ETH, SOL, etc.)
- Forex and commodities
- Paper-trading education and planning

Execution boundary:
- You cannot access broker accounts, credentials, balances, positions, or orders.
- You cannot stage, submit, replace, or cancel paper or live orders.
- Never output machine-readable order tags or instructions intended to trigger execution.
- If a user asks you to trade, explain that execution is unavailable through AI and help
  them review evidence, invalidation, risk inputs, and the dedicated manual paper workflow.
- Never guess an account size, risk allowance, or position size.

WealthyMindsets App features:
- Charts: footprint, volume profile, drawing tools, indicators, DOM, order flow
- Live Rooms: live video sessions with other traders
- WM Radio: music while trading
- Copy Trading: unavailable until verified trader accounts and audited performance data are connected
- Education Center: trading courses
- Scanner: find setups across markets
- Paper Trade: clearly labeled local simulation using available market quotes; it is not a broker order book

Response style:
- Use **bold** for key levels, signals, important terms
- Concise but complete — traders are busy
- Only provide exact Entry, Stop, Target 1, Target 2, or R:R when the user supplies
  sufficient prices/context. Otherwise explain what data is required.
- Clean numbers: "$7,550 support", "21,820 resistance"
- Never invent current prices, order flow, support/resistance, win rates, or performance.
- Be honest — if structure is unclear or data is stale, say so

Evidence citation (Garden 18 §8):
- Every chart fact you use (price, change, role, levels) is cited with its source and
  its as-of time exactly as the bracketed chart line gives them, e.g. "(source tastytrade,
  last observed 14:32:05Z, 12s before this question)". If the line says the as-of time is
  UNKNOWN, say the figures may be stale and do not treat them as current.
- A price marked [role CLOSED] is the session's last verified value: say the market is closed and
  give the time it was last verified ("closed · last verified …"). Never call a closed market's price stale or live.
- State your uncertainty in words: what the evidence supports, what it does not, and what
  would change your read. Never turn a possibility into a certainty.
- You keep no record of decisions. If you propose a thesis, tie it to the Decision_ID in the
  chart line when there is one, and say it is recorded only when the trader records it in
  the Journal. Never invent a Decision_ID.

Fair value gaps / imbalances (Garden 19):
- Never say price has to fill an imbalance; distinguish observed fact, derived measurement, inference and hypothesis.
- FVG facts arrive in the chart line from the chart's one FVG engine, each tagged OBSERVED FACT or
  DERIVED MEASUREMENT, with evidence per sense (FULL / PARTIAL / DEGRADED / SILENCE) and its limitations.
  Keep those tags when you use them; label anything you add as INFERENCE or HYPOTHESIS. A sense marked
  SILENCE is not evidence either way. Never score a gap or give a chance it will be revisited.

Plan review and patience (Garden 19 §25–§31):
- Never name an emotion, motive or mental state the trader did not write themselves ("you were
  afraid", "you got greedy", "revenge", "FOMO" are forbidden unless quoting the trader's own words).
- Compare the trader's recorded plan with what happened as facts — "You exited before the
  management condition recorded in your plan" — then ASK what caused the change.
- Keep MARKET facts, the trader's PLAN, and what the trader DID separate. No shame, no verdicts.

${SPAIDBOT_NO_PROMISE_RULES}

${spaidbotAcademyBlock()}`;


export async function POST(req: NextRequest) {
  // WM-SEC-P0-06: was unauthenticated. Uses GEMINI_API_KEY — open quota abuse.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  // WM-SEC-P0-07: signed-in users can still burn free-tier quota (15/min).
  // 10 requests per minute per user leaves headroom for concurrent tabs.
  const rl = checkRateLimit(`spaidbot:${auth.user.sub}`, { max: 10, windowMs: 60_000 });
  if (!rl.ok) return rl.response;
  // The in-memory count is per isolate; this one holds across them (2026-10-04).
  if (!(await edgeAllows([`user:${auth.user.sub}`], SPAIDBOT_LIMITER_BINDING))) return tooManyRequests();
  if (!GEMINI_KEY) {
    return new Response(
      // API audit P1-5: no variable name to a member. The panel reads "not configured" as "not switched on".
      `data: ${JSON.stringify({ error: "SpaidBot is not configured on this server.", code: "NOT_CONFIGURED" })}\n\ndata: [DONE]\n\n`,
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }

  try {
    const body = await req.json() as {
      messages: { role: "user" | "assistant"; content: string }[];
      context?: ChartContextInput;
    };

    const { context } = body;
    // Input is capped (security pass 2026-10-05): only output tokens were, so a
    // multi-MB history spent the whole model context on our key per request.
    if (!Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: "messages must be a list." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const messages = body.messages
      .filter(m => m && typeof m.content === "string")
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content.slice(0, 4_000) }));
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "Nothing to answer." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Built by an owner that refuses to print an unbacked percentage and
    // discloses the gap instead. Inline, this was `if (changePct !== undefined)`
    // — which is true of the zero-pair absence sentinel, so a closed Saturday
    // reached the model as "(+0.00%)" while SYSTEM_PROMPT above told it never
    // to invent a price. Re-derived server-side on purpose: this route accepts
    // a client-supplied body and must not be talked into the claim.
    // Supermax §8: the owner's prop-evaluation record rides ONE request, is re-validated here
    // and run through the desk's own engine — for the owner only. A member's `prop` is ignored;
    // nothing is stored.
    const ownerAllowed = tastytradeOwnerGate(auth.user.sub, process.env).allowed;
    const ctxNote = formatChartContextNote(context, Date.now())
      + spaidbotPropNote((context as { prop?: unknown } | undefined)?.prop, ownerAllowed);
    const systemText = SYSTEM_PROMPT + (ownerAllowed ? `\n\n${SPAIDBOT_PROP_RULES}` : "");

    const contents = messages.map((m, i) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{
        text: i === messages.length - 1 && m.role === "user" && ctxNote
          ? m.content + ctxNote
          : m.content,
      }],
    }));

    // The config depends on the model (thinking off where it is on by default — geminiModel.ts).
    const payloadFor = (model: string) => JSON.stringify({
      system_instruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: geminiGenerationConfig(model),
    });
    // Garden 18 §8 server bounds (2026-10-06): the upstream is aborted when the
    // trader's request goes away, its headers must arrive within 30 s, and the
    // relay below ends a stream silent for 45 s. No total cap — a healthy long
    // answer is never cut.
    // The request's own signal is linked only while we wait for the headers
    // (linkUntilHeaders): on the Workers runtime it fired after the Response was
    // handed back and cut answers mid-sentence. After that, the relay's cancel()
    // is the "trader left" bound.
    let upstreamCtl = new AbortController();
    let answered: { model: string | null; answeredBy: AnsweredBy } = { model: null, answeredBy: "PRIMARY" };
    const attempt = async (model: string, firstByteMs: number) => {
      const link = linkUntilHeaders(req.signal);
      upstreamCtl = link.controller;
      try {
        return await fetchWithFirstByteTimeout(fetch, streamUrl(model), { method: "POST", headers: { "Content-Type": "application/json" }, body: payloadFor(model) }, upstreamCtl, firstByteMs);
      } finally {
        link.release();
      }
    };
    // FIRST-BYTE RESILIENCE (2026-10-07: 1 in 6 Sends waited past 30 s). With a
    // lighter Gemini model configured, the main model gets PRIMARY_FIRST_BYTE_MS;
    // if its headers have not come, ONE retry on the lighter model gets what is
    // left of the same 30 s. Without one, the main model keeps the whole 30 s.
    // A trader who cancels is never retried for.
    const ask = async () => {
      const startedAt = Date.now();
      const model = await resolveGeminiModel(GEMINI_KEY);
      if (!model) return null;
      const light = lightGeminiModelFor(model);
      answered = { model, answeredBy: "PRIMARY" };
      try {
        return await attempt(model, light ? PRIMARY_FIRST_BYTE_MS : UPSTREAM_FIRST_BYTE_MS);
      } catch (err) {
        const left = UPSTREAM_FIRST_BYTE_MS - (Date.now() - startedAt);
        if (!(err instanceof UpstreamTimeout) || !light || req.signal.aborted || left < MIN_RETRY_FIRST_BYTE_MS) throw err;
        answered = { model: light, answeredBy: "LIGHTER" };
        return await attempt(light, left);
      }
    };
    let geminiRes: Response | null;
    try {
      geminiRes = await ask();
    } catch (err) {
      if (err instanceof UpstreamTimeout) {
        return new Response(JSON.stringify({ error: `${MODEL_DID_NOT_ANSWER}.` }), { status: 504, headers: { "Content-Type": "application/json" } });
      }
      throw err;
    }
    // A model retired since we chose it: choose again, once.
    if (geminiRes && !geminiRes.ok) {
      const said = await geminiRes.clone().text().catch(() => "");
      if (geminiRes.status === 404 || /no longer available|is not found|not supported/i.test(said)) {
        forgetGeminiModel();
        geminiRes = await ask().catch(e => { if (e instanceof UpstreamTimeout) return null; throw e; });
      } else if (geminiRes.status === 503 || /high demand|overloaded/i.test(said)) {
        // Google's own "high demand" spikes are short (measured 2026-10-03:
        // the next ask a few seconds later answered). One pause, one retry.
        await new Promise(r => setTimeout(r, 1_500));
        geminiRes = await ask().catch(e => { if (e instanceof UpstreamTimeout) return null; throw e; });
      }
    }
    if (!geminiRes) {
      return new Response(
        `data: ${JSON.stringify({ error: "SpaidBot's model did not answer.", code: "UPSTREAM_UNAVAILABLE" })}\n\ndata: [DONE]\n\n`,
        { headers: { "Content-Type": "text/event-stream" } }
      );
    }

    if (!geminiRes.ok) {
      // API audit P1-5: the provider's own message stays in the server log; the member reads plain words + a code.
      const errText = await geminiRes.text().catch(() => "");
      const said = publicFailure(new Error(`HTTP ${geminiRes.status} ${errText.slice(0, 300)}`), "spaidbot");
      const busy = said.code === "UPSTREAM_BUSY";
      return new Response(
        `data: ${JSON.stringify({ error: busy ? "SpaidBot's model is busy — too many requests right now." : "SpaidBot's model did not answer.", code: busy ? "UPSTREAM_BUSY" : "UPSTREAM_UNAVAILABLE" })}\n\ndata: [DONE]\n\n`,
        { headers: { "Content-Type": "text/event-stream" } }
      );
    }

    const readable = relayModelStream(geminiRes, upstreamCtl, undefined, answered);

    return new Response(readable, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
      },
    });

  } catch (err) {
    return new Response(
      JSON.stringify(publicFailure(err, "spaidbot")),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
