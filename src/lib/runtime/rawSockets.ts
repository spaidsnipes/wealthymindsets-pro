/**
 * RAW TCP, ASKED HONESTLY.
 *
 * WM Pro needs exactly one raw socket: Webull pushes real-time quotes over
 * MQTT to `data-api.webull.com`, and there is no fetch-shaped way to reach a
 * broker. On Cloudflare that capability is `connect()` from
 * `cloudflare:sockets`.
 *
 * The import does NOT live here. It lives in `cloudflare-worker-entry.js`,
 * wrangler's entry module, because three separate bundlers stand between this
 * file and the deployed worker and only wrangler's understands a `cloudflare:`
 * specifier (the full measurement is recorded in that file's header). The entry
 * publishes the function on `globalThis`; this module reads it back and gives
 * it a type.
 *
 * WHY A MODULE AND NOT AN INLINE `globalThis` READ AT THE CALL SITE:
 * a missing capability must produce a SENTENCE, not an undefined. This seam
 * feeds the Webull real-time lane, where for three months every failure on our
 * side of the wire was reported to the Founder as a market-data subscription he
 * needed to buy — and had in fact already bought. So the unavailable case
 * returns a reason that names OUR runtime and refuses to imply anything about
 * any provider, entitlement or account.
 */
import type { SocketOptions, SocketAddress, Socket } from "cloudflare:sockets";

export type ConnectFn = (
  address: SocketAddress | string,
  options?: SocketOptions,
) => Socket;

/**
 * The name `cloudflare-worker-entry.js` writes. Kept in one place so the
 * producer and the consumer cannot drift apart silently.
 */
export const RAW_SOCKET_GLOBAL = "__wmCloudflareConnect" as const;

export type RawSocketSupport =
  | { readonly available: true; readonly connect: ConnectFn }
  | { readonly available: false; readonly reason: string };

/**
 * `scope` is injectable so this is testable under Node, where the capability is
 * genuinely absent and must be reported as absent rather than mocked away.
 */
export function rawSocketSupport(
  scope: Record<string, unknown> = globalThis as unknown as Record<string, unknown>,
): RawSocketSupport {
  const candidate = scope[RAW_SOCKET_GLOBAL];
  if (typeof candidate === "function") {
    return { available: true, connect: candidate as ConnectFn };
  }
  return {
    available: false,
    reason:
      "This runtime does not expose raw TCP sockets, so nothing was contacted. " +
      // Deliberately does not name the categories it is disclaiming. Saying
      // "this is not a subscription problem" still puts the word in front of
      // the reader, and this seam's whole job is to stop that word from being
      // reached for. The guard in rawSockets.test.ts enforces the omission.
      "That is a fact about where this code is executing, and it describes " +
      "nothing else — no provider, no account, and nothing anyone does or " +
      "does not already own.",
  };
}
