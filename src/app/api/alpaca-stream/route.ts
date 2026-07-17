/**
 * /api/alpaca-stream?sym=TSLA — real-time per-trade tape (Server-Sent Events)
 *
 * Opens Alpaca's FREE real-time IEX trade WebSocket server-side and streams each
 * executed trade to the browser as SSE. This is what makes Big Trades bubbles
 * populate on EVERY US stock live — the free REST trades endpoint is delayed 15
 * minutes, but the IEX websocket is real-time even on the free data plan.
 *
 * The API key/secret NEVER reach the browser (they auth the server→Alpaca socket
 * only). Emits `{p,s,t}` per trade, `{hb:1}` heartbeats, `{err}` on Alpaca error.
 * Recycles just before the serverless max duration so the browser's EventSource
 * transparently reconnects. Real IEX prints only — never synthetic.
 *
 * NOTE: Alpaca's free data plan allows ONE concurrent market-data websocket, so
 * this is meant for a single active tab (multiple tabs would contend). Extended
 * hours: IEX carries no pre/post-market trades, so the stream is simply quiet.
 */

import type { NextRequest } from "next/server";
import WebSocket from "ws";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel Pro: 5 min, then the client reconnects

const ALPACA_KEY    = process.env.ALPACA_KEY    ?? process.env.NEXT_PUBLIC_ALPACA_KEY    ?? "";
const ALPACA_SECRET = process.env.ALPACA_SECRET ?? process.env.NEXT_PUBLIC_ALPACA_SECRET ?? "";

export async function GET(request: NextRequest) {
  const sym = (new URL(request.url).searchParams.get("sym") ?? "").toUpperCase();
  if (!sym) return new Response("sym required", { status: 400 });
  if (!ALPACA_KEY || !ALPACA_SECRET) return new Response("Alpaca keys not set", { status: 503 });

  const encoder = new TextEncoder();
  let ws: WebSocket | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: unknown) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)); } catch { /* stream gone */ }
      };
      const shutdown = () => {
        if (closed) return;
        closed = true;
        try { ws?.close(); } catch { /* already closed */ }
        try { controller.close(); } catch { /* already closed */ }
      };

      // Defeat intermediary/serverless response buffering: an immediate ~2KB
      // comment padding forces the SSE stream to flush and open right away, and
      // an instant heartbeat proves to the client the stream is live before any
      // trade arrives. Without this, Vercel can hold the whole response buffered.
      try {
        controller.enqueue(encoder.encode(":" + " ".repeat(2048) + "\n\n"));
      } catch { /* stream gone */ }
      send({ hb: 1 });

      try {
        ws = new WebSocket("wss://stream.data.alpaca.markets/v2/iex");
      } catch (e) { send({ err: "ws construct failed: " + String(e) }); shutdown(); return; }

      ws.on("open", () => {
        try { ws!.send(JSON.stringify({ action: "auth", key: ALPACA_KEY, secret: ALPACA_SECRET })); } catch { shutdown(); }
      });

      ws.on("message", (raw: unknown) => {
        let msgs: unknown;
        try { msgs = JSON.parse(String(raw)); } catch { return; }
        if (!Array.isArray(msgs)) return;
        for (const m of msgs as Array<Record<string, unknown>>) {
          if (m?.T === "success" && m?.msg === "authenticated") {
            try { ws!.send(JSON.stringify({ action: "subscribe", trades: [sym] })); } catch { shutdown(); }
          } else if (m?.T === "t" && typeof m?.p === "number") {
            send({ p: m.p, s: m.s, t: typeof m.t === "string" ? Date.parse(m.t) : Date.now() });
          } else if (m?.T === "error") {
            send({ err: String(m?.msg ?? "alpaca error") });
          }
        }
      });

      ws.on("error", () => shutdown());
      ws.on("close",  () => shutdown());

      // Heartbeat keeps intermediary proxies from idle-closing the SSE; recycle
      // just before maxDuration so EventSource reconnects cleanly.
      const hb      = setInterval(() => send({ hb: 1 }), 15_000);
      const recycle = setTimeout(shutdown, 285_000);
      request.signal.addEventListener("abort", () => { clearInterval(hb); clearTimeout(recycle); shutdown(); });
    },
    cancel() {
      closed = true;
      try { ws?.close(); } catch { /* already closed */ }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
