import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { webullDataConfigFromEnv } from "@/lib/marketData/adapters/webullMarketData";
import { rawSocketSupport } from "@/lib/runtime/rawSockets";
import type { DuplexSocket } from "@/lib/marketData/webullQuotesHandshake";
import {
  WEBULL_CATEGORIES,
  WEBULL_SUB_TYPES,
  type WebullCategory,
  type WebullSubType,
} from "@/lib/marketData/webullQuotesSubscribe";
import { streamWebullQuotes, type WebullStreamEvent } from "@/lib/marketData/webullQuotesStream";

export const dynamic = "force-dynamic";

/**
 * THE LANE THAT ACTUALLY CARRIES A PRICE.
 *
 * `/streaming` proves the door opens — one CONNECT, one CONNACK, hang up. This
 * route walks through it: it holds the socket, sends the signed subscribe with
 * that socket's own id, and forwards every PUBLISH to the browser as it lands.
 * The choreography and every rule about what an answer may MEAN live in
 * `webullQuotesStream.ts`, which is provable offline; this file is transport
 * and nothing else.
 *
 * WHY SERVER-SENT EVENTS: the handshake and the subscribe answer must reach the
 * glass the MOMENT they are known. A surface that shows nothing for eight
 * seconds and then an error is indistinguishable, to the person watching, from
 * a surface that was never wired — and "never wired" is the reading that cost
 * this project three months. Each event below is a sentence about whose side
 * the thing happened on, delivered immediately.
 *
 * WHAT NEVER CROSSES THIS BOUNDARY: the app key, the app secret, the session
 * id, the MQTT password and the signature. The event union in the stream module
 * carries provider scalars only, and this route forwards it without addition.
 */
const MAX_SYMBOLS = 20;

function parseSymbols(raw: string | null): readonly string[] {
  return (raw ?? "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => /^[A-Z0-9.\-]{1,12}$/.test(symbol))
    .slice(0, MAX_SYMBOLS);
}

function sse(event: WebullStreamEvent): string {
  return `event: ${event.kind}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const symbols = parseSymbols(url.searchParams.get("symbols"));
  if (symbols.length === 0) {
    return NextResponse.json(
      {
        provider: "webull",
        lane: "REAL_TIME",
        note: "No usable symbols were requested, so nothing was subscribed. Pass ?symbols=AAPL,TSLA.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const requestedCategory = (url.searchParams.get("category") ?? "US_STOCK") as WebullCategory;
  const category = WEBULL_CATEGORIES.includes(requestedCategory) ? requestedCategory : "US_STOCK";
  const requestedSubTypes = (url.searchParams.get("subTypes") ?? "QUOTE")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is WebullSubType =>
      (WEBULL_SUB_TYPES as readonly string[]).includes(value),
    );
  const subTypes = requestedSubTypes.length > 0 ? requestedSubTypes : (["QUOTE"] as const);

  const env = webullDataConfigFromEnv(process.env);
  if (!env.appKey || !env.appSecret) {
    return NextResponse.json(
      {
        provider: "webull",
        lane: "REAL_TIME",
        note: "Webull signing credentials are not configured on this deployment, so nothing was asked. That is a fact about our configuration and about nothing else.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sockets = rawSocketSupport();
  if (!sockets.available) {
    return NextResponse.json(
      {
        provider: "webull",
        lane: "REAL_TIME",
        note: `${sockets.reason} Webull's real-time host was never contacted.`,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const appKey = env.appKey;
  const appSecret = env.appSecret;

  const events = streamWebullQuotes(
    {
      openSocket: async (hostname, port): Promise<DuplexSocket> =>
        // TLS from the first byte on port 1883 — see WEBULL_QUOTES_PORT for why
        // that pairing is correct rather than a typo.
        sockets.connect({ hostname, port }, { secureTransport: "on", allowHalfOpen: false }),
      send: async (signed) => {
        const response = await fetch(signed.url, {
          method: signed.method,
          headers: { ...signed.headers },
          // The EXACT string that was signed. Re-serializing here would change
          // key order and invalidate the signature.
          body: signed.body,
        });
        const text = await response.text();
        let payload: unknown = text;
        try {
          payload = JSON.parse(text);
        } catch {
          // A non-JSON body is reported as text rather than swallowed.
        }
        return { status: response.status, payload };
      },
      mintId: () =>
        Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join(""),
    },
    { appKey, appSecret, symbols, category, subTypes, host: env.apiHost, profile: "sdk-sha256" },
  );

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encoder.encode(sse(event)));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.enqueue(
          encoder.encode(
            sse({
              kind: "closed",
              reason: `This stream ended on our side (${message}). Webull refused nothing.`,
            }),
          ),
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      // The browser went away. `streamWebullQuotes` closes its socket in a
      // `finally`, and abandoning the generator runs it.
      void events.return(undefined as never);
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
