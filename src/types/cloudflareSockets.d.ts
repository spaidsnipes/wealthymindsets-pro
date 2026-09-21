/**
 * The Workers runtime gives us raw TCP. TypeScript, running under Node, has
 * never heard of it.
 *
 * `cloudflare:sockets` is a built-in module that exists ONLY inside a Cloudflare
 * Worker isolate. Without this declaration `tsc` fails to resolve the dynamic
 * import in `src/app/api/market-data/webull/streaming/route.ts`, and the
 * tempting fix — an `any`-typed indirection — would hide the one field that
 * actually matters here:
 *
 *   `secureTransport: "on"` is TLS FROM THE FIRST BYTE.
 *
 * Webull's real-time broker terminates TLS on port 1883, the port that is
 * conventionally PLAINTEXT MQTT (`data_streaming_client.py` defaults
 * `mqtt_port=1883` and `tls_enable=True` together, and `quotes_client.py` calls
 * `self.tls_set()`). Connect there without TLS and the handshake fails in a way
 * that says nothing about entitlement — which, in this corner of the codebase,
 * is exactly the kind of failure that has historically been reported to the
 * Founder as though it were a billing problem.
 *
 * Only the surface we actually use is declared. A fuller shim would be more
 * guesses about a runtime this repo cannot execute in a test.
 */
declare module "cloudflare:sockets" {
  export interface Socket {
    readonly readable: ReadableStream<Uint8Array>;
    readonly writable: WritableStream<Uint8Array>;
    readonly closed: Promise<void>;
    close(): Promise<void>;
    /** Upgrades a plaintext socket after a StartTLS-style negotiation. Unused
     *  here: Webull expects TLS immediately, not an upgrade mid-stream. */
    startTls(): Socket;
  }

  export interface SocketAddress {
    readonly hostname: string;
    readonly port: number;
  }

  export interface SocketOptions {
    /** "on" = TLS immediately. "starttls" = plaintext until `startTls()`. */
    readonly secureTransport?: "off" | "on" | "starttls";
    readonly allowHalfOpen?: boolean;
  }

  export function connect(address: SocketAddress | string, options?: SocketOptions): Socket;
}
