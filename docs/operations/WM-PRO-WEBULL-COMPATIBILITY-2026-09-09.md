# Webull compatibility and the WM Pro options boundary

## Finding

WM Pro's current options path is not production-proven. The ordinary chart requests FMP options data and the observed local and hosted route returned NOT CONFIGURED. A connected brokerage account would not, by itself, supply this route. The current recovery objective is one ordinary TSLA single-leg long-premium lifecycle through one shared Decision/Position authority, not expansion to every broker or product. The September 8 section of the living Current Project Brief supersedes its historical repository facts.[1]

The Webull protocol investigation establishes a compatibility gap, not a diagnosis of every observed authentication failure. At WM source revision f6815a2, the common signer supports explicit `legacy-sha1` and `sdk-sha256` profiles. Both production market-data and broker-read callers remain explicitly pinned to `legacy-sha1`; there is no silent fallback. The official SDK tree inspected on September 9 selects HMAC-SHA256 and SHA256 body hashing, while retaining signature version 1.0.[2][3] A 401 alone does not identify key, host, environment, token, signature, or entitlement as the failed edge.

## Verified request contracts

| Capability | Official request | Boundaries |
|---|---|---|
| Option snapshot | GET /market-data/options/snapshots/list | symbols, category US_OPTION; up to 20 comma-separated option symbols; SDK request version v3 |
| Contract discovery | GET /trading/instruments/options/contracts/list | underlying_symbols, option_symbols, filters and pagination_key; SDK request version v3 |
| Existing WM stock prints | GET /openapi/market-data/stock/tick | Existing bodyless signed request; not an option response |
| Existing WM broker-read probe | GET /trading/accounts/list | Account-list access only; not order or options certification |

The first two contracts are grounded in official SDK request classes.[4][5] The rendered option snapshot reference identifies the endpoint and purpose but did not expose a usable response schema during inspection.[6] No response-field mapping, pagination completion, executable quote freshness, or options entitlement is inferred from these request definitions.

## Signing differences and controlled preparation

The official composer sorts raw signature fields, prefixes the path, appends an uppercase body digest when present, and percent-encodes the canonical string with Python quote(..., safe=''). Only its generated signature headers plus host and query fields enter that signature set. The request's x-version and optional access token are not automatically added to that set.[2]

JavaScript encodeURIComponent leaves five characters unescaped that this SDK encoding escapes: exclamation, apostrophe, parentheses and asterisk. That difference is reproducible, but ordinary TSLA query values need not exercise it. It cannot be used to explain their 401 without a controlled comparison.

The scoped local preparation introduces explicit legacy-sha1 and sdk-sha256 profiles and one header builder. Both production callers remain explicitly legacy-sha1. No environment variable, credential or production profile has been changed. This prevents an algorithm change from producing headers that advertise a different algorithm. It does not establish that the provider accepts the modern profile for this account.

The existing signer's body argument is already-serialized outgoing text. The modern profile hashes those exact bytes; it does not serialize an arbitrary object. Undefined means no body, while an explicit empty string is an empty byte body. The SDK serializes its object input before hashing; callers of this helper must pass the same bytes they actually send. The two current production callers are bodyless GETs.

## Reproducible evidence and limitations

Public dummy inputs were evaluated independently using Python standard-library hmac, hashlib and urllib.parse, then compared with TypeScript tests. Coverage includes the two actual legacy caller request shapes, a modern option-snapshot request shape, exact body bytes, query ordering, Unicode, spaces, plus, percent, slash, comma, and the five punctuation differences. Existing redirect, timeout and secret-redaction tests remain applicable. These are deterministic protocol tests, not provider responses.

The earlier expression and tablet/proxy candidate bd12c9f passed an exact isolated 477-file / 5,320-test suite and a webpack production build with TypeScript before being pushed. The later signing preparation f6815a2 passed an exact isolated 478-file / 5,326-test suite and a webpack production build with TypeScript before being pushed. Existing Next.js middleware/Edge warnings remain recorded. Cloudflare's authenticated dashboard subsequently showed the f6815a2 commit as the active 100% version; that proves deployment identity for that revision, not provider receipt success. The newer chart-expression commit 1e2a5f2 entered a Cloudflare build after push and must not be called deployed until that build finishes and its production allocation is verified.

At 18:30 CDT, two separately profiled, read-only TSLA stock-tick requests used the existing local credential lane against `api.webull.com`. Both the legacy SHA1 and SDK SHA256 requests returned provider code `MARKET_DATA_NOT_SUBSCRIBED` with HTTP 403 and zero normalized ticks. No credential value was logged or changed. This is direct evidence for the subscription edge on that exact credential/host/request lane; it is not proof of options entitlement and does not transfer the selected connector's separate success into WM runtime. The selected Webull connector independently returned five TSLA prints with advancing provider timestamps, which is useful parser evidence only.

The visual reference emphasizes a central market canvas with supporting order-flow, Passport and evidence surfaces.[7] The tablet correction preserves usable chart width when inspecting options. It does not complete that scene, make the illustrative reference numbers real, or turn absent options into a trading-ready surface.

## Required next evidence

A future controlled read-only comparison must continue to identify the exact candidate, endpoint, host/environment, signing profile and sanitized provider outcome. It must not automatically retry or downgrade after 401/403. The current comparison narrowed one local credential lane to a provider-reported market-data subscription edge; it did not establish option scope. Market tick success proves only observed market-data access; account-list success proves only broker-read access. Genuine option contracts and quote responses still need symbol/contract identity, timestamps, bid/ask/size, freshness and canonical consumer proof before any executable label. No orders are necessary to establish those read-only boundaries.

Release remains unproven until the same candidate is deployed and exercised on the ordinary Founder route. A local fixture, reference graphic, passing test suite or GitHub push cannot close that requirement.[1]

## Sources

1. [WM Pro — Current Project Brief](https://docs.google.com/document/d/1WH6-8WwjpIKdPibjT_NyALUQesm4Tv0QdQhtKh6LvmQ), September 8 recovery section; reread September 9. Historical sections explicitly retained as lineage.
2. Webull official SDK, [default_signature_composer.py](https://github.com/webull-inc/webull-openapi-python-sdk/blob/8e970dbeff93fcda8ea22a1c9bba6d60851ae428/webull/core/auth/composer/default_signature_composer.py), pinned tree8e970dbe.
3. Webull official SDK, [sha_hmac256_new.py](https://github.com/webull-inc/webull-openapi-python-sdk/blob/8e970dbeff93fcda8ea22a1c9bba6d60851ae428/webull/core/auth/algorithm/sha_hmac256_new.py).
4. Webull official SDK, [get_option_snapshot_request.py](https://github.com/webull-inc/webull-openapi-python-sdk/blob/8e970dbeff93fcda8ea22a1c9bba6d60851ae428/webull/data/request/get_option_snapshot_request.py).
5. Webull official SDK, [get_option_contracts_request_v2.py](https://github.com/webull-inc/webull-openapi-python-sdk/blob/8e970dbeff93fcda8ea22a1c9bba6d60851ae428/webull/data/request/get_option_contracts_request_v2.py).
6. Webull, [List Option Snapshots](https://developer.webull.com/apis/docs/reference/option-snapshot/), read September 9.
7. [WM Transformation UI Asset 10](https://drive.google.com/file/d/1DajhzL8sl799-TehpfikSQNBffU8mYUM/view), visually inspected September 9; design reference, not runtime evidence.
