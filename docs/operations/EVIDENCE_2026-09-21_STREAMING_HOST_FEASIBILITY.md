<!-- ath-standing-authority: 2026-09-21 -->

# Can Cloudflare Workers host the real-time tape? — MEASURED 2026-09-21

> **Why this one is NOT demoted to lineage.** The dated-docs sentinel is right
> about almost every evidence file: a measurement of a *provider's answer to us*
> goes stale the moment the provider, the account or the key changes. This
> document measures something else — what the HOST we deploy to is capable of,
> read out of Cloudflare's own platform documentation. That does not go stale
> because a token expired. It goes stale when Cloudflare changes the platform,
> and the day above is the day it was last read. Re-read it before citing the
> 15-minute number in a design decision.

**Question the Founder asked:** *"check if the workers can host it they should if they
cant we build something that can no blocks with ath, we need this wired so me and
the guest can finally trade from wm pro."*

**Answer: yes, for both providers. No new infrastructure is required.** One real
constraint applies, and it is a design input, not a blocker.

This supersedes the constraint recorded in memory as `bubble-tape-feed-constraint`
("Vercel serverless can't host the WS proxy"). That was true of Vercel. Production
moved to Cloudflare Workers on 2026-08-24, and the constraint did not move with it.

## What each provider actually speaks

Both were read out of the vendors' own material, not assumed.

| Provider | Real-time transport | Source |
|---|---|---|
| tastytrade | **WebSocket** — DXLink JSON at `wss://tasty-openapi-ws.dxfeed.com/realtime`, token from `GET /api-quote-tokens` (24h expiry) | developer.tastytrade.com/docs/guides/stream-market-data |
| Webull | **MQTT over TLS, port 1883** | `webull/data/internal/quotes_client.py` imports `paho.mqtt.client`; `data_streaming_client.py:31` declares `mqtt_port=1883, tls_enable=True`; `quotes_client.py:121` calls `tls_set()` |

The Webull line is the newly-surfaced lane from the entitlement evidence doc. It is
**not** a WebSocket, which is why no amount of work on the REST host was ever going
to open it.

## What Cloudflare Workers can do

| Capability | Verdict | Source |
|---|---|---|
| Outbound WebSocket from a Durable Object | **Yes** | Cloudflare DO WebSockets guide |
| Outbound raw TCP with TLS (`connect()` from `cloudflare:sockets`) | **Yes** — docs name MQTT explicitly among supported protocols; `secureTransport: "on"` | Workers TCP Sockets API |
| Arbitrary destination port (1883) | **Yes** — port 25 is the named exception; Cloudflare IP ranges and private IPs are blocked | Workers TCP Sockets API |
| Durable Objects on the current plan | **Yes** — SQLite-backed DOs are available on the Workers **Free** plan | DO pricing |

So the transport for both providers is available on the host we are already on, at
the plan we are already on.

## The one real constraint

> An open outbound WebSocket or TCP socket keeps a Durable Object in memory and
> incurs duration charges for **up to 15 minutes per connection**, and
> **hibernation does not apply to outbound connections** — it is supported only
> when a DO acts as a WebSocket *server*.

Consequence: a relay holding an upstream feed will be evicted and must reconnect on
roughly a 15-minute cadence. **Reconnect seams are therefore a designed-in certainty
on this host, not an anomaly.**

This is not a reason to build elsewhere. It is a reason the product must be able to
say *when* a seam happened. A bar assembled across a reconnect is a weaker claim than
one watched end to end, and rendering both identically would be a lie with a
timestamp on it — the same class of defect as the four surfaces that printed UNKNOWN
about data the product already had.

`src/lib/marketData/dxlinkProtocol.ts` therefore attaches `coverage: FULL |
PARTIAL` to every bar it mints, derived from whether observation actually covered
the whole window. Tested, including the guards-the-guard case that would catch an
aggregator that stamped PARTIAL on everything.

It mints a **`CanonicalBar`** — it does not declare a bar shape of its own. The
first draft did, and `canonicalBarAdoption.sentinel.test.ts` refused it: the M8
census of private bar shapes holds at four and may only shrink, because two
modules that each decide what a bar is can hold a different 09:31 for the same
symbol and neither is wrong by its own lights. Coverage therefore lands in two
places instead of inside the bar: as `fidelity: DEGRADED` (the algebra's existing
word for "admitted with a known wound", which every renderer already knows how to
dim), and as an `ObservedWindow` sidecar carrying the exact word and the trade
count for a surface that wants to say *why*.

## What was deliberately NOT built

A Candle-event subscription. dxFeed exposes a Candle event and the obvious guess is a
symbol-attribute syntax like `AAPL{=15s}` — but that syntax appears nowhere in
tastytrade's guide, and a guessed subscription that silently returns nothing is
indistinguishable from an entitlement denial. That exact confusion is what cost three
months on Webull.

WM Pro builds its 15-second candles from `Trade` events instead, whose field list IS
published verbatim. Aggregating ticks we can see beats subscribing to a frame shape we
invented. A test asserts no `Candle` and no `{=` appears in any frame we send, so the
guess cannot creep back in quietly.

## Still blocked on, and by whom

- **tastytrade:** `TASTYTRADE_REFRESH_TOKEN`. Founder-only — the grant is created in
  the tastytrade dashboard under *Manage OAuth Grants* and installed in the host
  runtime secrets. Client ID and secret are already present. Nothing downstream can be
  measured against a live socket until it exists.
- **Webull:** nothing measured yet on the MQTT lane. It is an unexplored lane, and
  until a connection has actually been attempted, nothing may be said about what it
  would return.
