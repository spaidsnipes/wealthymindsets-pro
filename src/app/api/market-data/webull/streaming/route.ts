import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { webullDataConfigFromEnv } from "@/lib/marketData/adapters/webullMarketData";
import {
  handshakeWebullQuotes,
  type DuplexSocket,
} from "@/lib/marketData/webullQuotesHandshake";

export const dynamic = "force-dynamic";

/**
 * THE FIRST REQUEST WM PRO HAS EVER SENT TO WEBULL'S REAL-TIME HOST.
 *
 * Every Webull measurement in this project's history went to `api.webull.com`
 * and came back `403 MARKET_DATA_NOT_SUBSCRIBED`. That code names a
 * subscription, so it was read as a fact about the Founder's account, and for
 * roughly three months he was sent back to Webull to buy data he already owned.
 *
 * On 2026-09-21 the streaming lane was finally asked over HTTP and answered
 * something entirely different — `417 INVALID_SESSION` — because Webull's
 * `session_id` is not a value you mint. `quotes_client.py` uses it as the MQTT
 * `client_id`, and `_quotes_on_connect` calls the HTTP subscribe only AFTER the
 * broker returns rc == 0. The session id is the NAME OF AN ALREADY-OPEN SOCKET.
 * We had been naming a socket that never existed.
 *
 * This route opens it. It sends one MQTT CONNECT to `data-api.webull.com` and
 * reads one CONNACK, which is the cheapest measurement that bears on Webull's
 * REAL-TIME product rather than its REST pull product. It subscribes to
 * nothing, submits nothing, and cannot read an account.
 *
 * WHAT THE ANSWER IS ALLOWED TO MEAN is enforced in `readQuotesHandshake`, not
 * here, and deliberately so: a transport failure and a capacity refusal both
 * arrive looking like rejections, and turning either into "go buy market data"
 * is the precise mistake this endpoint exists to make impossible.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const env = webullDataConfigFromEnv(process.env);
  if (!env.appKey) {
    return NextResponse.json(
      {
        provider: "webull",
        lane: "REAL_TIME",
        note: "No Webull app key is configured on this deployment, so nothing was asked. This is a fact about our configuration and not about any entitlement.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  /**
   * `cloudflare:sockets` does not exist under Node, so it is imported at call
   * time rather than at module scope. A static import here would take the whole
   * test suite down with it, and a Webull lane that cannot be tested offline is
   * how this problem lasted three months in the first place.
   */
  let openSocket:
    | ((host: string, port: number) => Promise<DuplexSocket>)
    | null = null;
  try {
    const sockets = await import("cloudflare:sockets");
    openSocket = async (hostname, port) =>
      // `secureTransport: "on"` is TLS from the first byte, which is what
      // `tls_set()` means in `quotes_client.py`. Webull terminates TLS on the
      // conventionally-plaintext port 1883 — see WEBULL_QUOTES_PORT.
      sockets.connect({ hostname, port }, { secureTransport: "on", allowHalfOpen: false });
  } catch (error) {
    return NextResponse.json(
      {
        provider: "webull",
        lane: "REAL_TIME",
        transportOpen: false,
        accepted: false,
        credentialRejected: false,
        transportError: error instanceof Error ? error.message : String(error),
        note: "This runtime cannot open raw TCP sockets, so Webull's real-time host was never contacted. Evidence about our runtime, not about entitlement.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const random = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

  const receipt = await handshakeWebullQuotes(openSocket, {
    appKey: env.appKey,
    // The MQTT client id, which Webull also calls the session id. Minted here
    // exactly as `samples/data/data_streaming_client.py:36` does.
    sessionId: random(),
    // `username_pw_set(self._app_key, uuid.uuid4().hex)` — a throwaway nonce,
    // never a real credential. The transport is TLS and the app key is what the
    // broker authenticates.
    password: random(),
  });

  return NextResponse.json(
    { provider: "webull", lane: "REAL_TIME", ...receipt },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
