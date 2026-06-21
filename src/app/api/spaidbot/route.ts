/**
 * /api/spaidbot — AI assistant powered by Google Gemini 2.0 Flash
 * Free tier: 15 req/min, no credit card required.
 */

import { NextRequest } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY ?? "";
const MODEL      = "gemini-2.0-flash";
const BASE_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;

const SYSTEM_PROMPT = `You are SpaidBot, the AI trading co-pilot for WealthyMindsets Pro — a professional trading platform built by traders for traders.

Your personality: confident, direct, and precise. You think like a professional prop trader. You don't sugarcoat or hedge unnecessarily.

Your expertise covers:
- Order flow analysis (footprint charts, bid/ask imbalances, absorption, stacked imbalances)
- Wyckoff methodology (accumulation/distribution phases, springs, upthrusts)
- Market microstructure (tape reading, dark pools, institutional activity)
- Volume Profile (VAH, VAL, POC, VPOC, HVN/LVN)
- Smart money concepts (liquidity sweeps, order blocks, fair value gaps)
- Technical analysis (support/resistance, chart patterns, candlestick analysis)
- Risk management (position sizing, R:R ratios, stop placement)
- Futures trading (ES, NQ, RTY, YM, GC, CL, etc.)
- Crypto trading (BTC, ETH, SOL, etc.)
- Forex and commodities
- Paper trading strategy

Paper Trading (Alpaca):
- When a user asks to place a trade, confirm the details then output EXACTLY this JSON tag on its own line:
  TRADE_ORDER: {"side":"buy","symbol":"TSLA","qty":1,"type":"market","limit_price":null,"stop_price":null,"trail_percent":null}
- Replace values with the user's actual intent. Use null for unused price fields.
- Always clarify this is PAPER TRADING (simulated, no real money) unless they say otherwise.
- Suggest position sizes for a $25,000 paper account (risk 1-2% per trade = $250-$500 max loss).

WealthyMindsets App features:
- Charts: footprint, volume profile, drawing tools, indicators, DOM, order flow
- Live Rooms: live video sessions with other traders
- WM Radio: music while trading
- Copy Trading: follow top traders
- Education Center: trading courses
- Scanner: find setups across markets
- Paper Trade: simulated trading with full order book

Response style:
- Use **bold** for key levels, signals, important terms
- Concise but complete — traders are busy
- For setups always include: Entry, Stop, Target 1, Target 2, R:R ratio
- Clean numbers: "$7,550 support", "21,820 resistance"
- Be honest — if structure is unclear, say so`;

type GeminiChunk = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

export async function POST(req: NextRequest) {
  if (!GEMINI_KEY) {
    return new Response(
      `data: ${JSON.stringify({ error: "GEMINI_API_KEY not set." })}\n\ndata: [DONE]\n\n`,
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }

  try {
    const body = await req.json() as {
      messages: { role: "user" | "assistant"; content: string }[];
      context?: { symbol?: string; price?: number; changePct?: number };
    };

    const { messages, context } = body;

    let ctxNote = "";
    if (context?.symbol) {
      ctxNote = `\n\n[Current chart: ${context.symbol}`;
      if (context.price) ctxNote += ` @ $${context.price.toLocaleString()}`;
      if (context.changePct !== undefined)
        ctxNote += ` (${context.changePct >= 0 ? "+" : ""}${context.changePct.toFixed(2)}%)`;
      ctxNote += "]";
    }

    const contents = messages.map((m, i) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{
        text: i === messages.length - 1 && m.role === "user" && ctxNote
          ? m.content + ctxNote
          : m.content,
      }],
    }));

    const geminiRes = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      let msg = `Gemini error ${geminiRes.status}`;
      try { msg = (JSON.parse(errText) as { error?: { message?: string } }).error?.message ?? msg; } catch {}
      return new Response(
        `data: ${JSON.stringify({ error: msg })}\n\ndata: [DONE]\n\n`,
        { headers: { "Content-Type": "text/event-stream" } }
      );
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const reader  = geminiRes.body!.getReader();
          const decoder = new TextDecoder();
          let buf = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });

            const lines = buf.split("\n");
            buf = lines.pop() ?? "";

            for (const line of lines) {
              const t = line.trim();
              if (!t || t === "data: [DONE]") continue;
              if (!t.startsWith("data: ")) continue;
              try {
                const chunk = JSON.parse(t.slice(6)) as GeminiChunk;
                const text  = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              } catch {}
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
      },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
