interface ClientRequestEntry<T> {
  data?: T;
  storedAt: number;
  inFlight?: Promise<T>;
}

const CLIENT_REQUESTS = new Map<string, ClientRequestEntry<unknown>>();
const CLIENT_REQUEST_LIMIT = 500;

/**
 * Shares one browser request across mounted consumers and briefly reuses its
 * result. This is intentionally payload-agnostic: durable retention belongs to
 * Nectar's rights gate, while this layer only prevents duplicate live fetches.
 */
export async function fetchJsonCoalesced<T>(
  url: string,
  ttlMs = 1_000,
  semanticKey = url,
): Promise<T> {
  const now = Date.now();
  const existing = CLIENT_REQUESTS.get(semanticKey);
  if (!existing && CLIENT_REQUESTS.size >= CLIENT_REQUEST_LIMIT) {
    for (const [oldestKey, value] of CLIENT_REQUESTS) {
      if (!value.inFlight) {
        CLIENT_REQUESTS.delete(oldestKey);
        break;
      }
    }
  }
  const entry = (existing ?? { storedAt: 0 }) as ClientRequestEntry<T>;
  CLIENT_REQUESTS.set(semanticKey, entry as ClientRequestEntry<unknown>);

  if (entry.data !== undefined && now - entry.storedAt < ttlMs) return entry.data;
  if (entry.inFlight) return entry.inFlight;

  const request = fetch(url, { cache: "no-store" })
    .then(async response => {
      const body = await response.json();
      if (!response.ok) {
        const error = new Error(body?.error ?? `Market data request failed (${response.status})`);
        Object.assign(error, { status: response.status, body });
        throw error;
      }
      entry.data = body as T;
      entry.storedAt = Date.now();
      return body as T;
    })
    .finally(() => {
      entry.inFlight = undefined;
    });

  entry.inFlight = request;
  return request;
}

export function clearClientRequestCoalescerForTests() {
  CLIENT_REQUESTS.clear();
}
