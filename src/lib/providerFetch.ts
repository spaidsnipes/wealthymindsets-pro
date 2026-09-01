export interface ProviderFetchOptions {
  readonly timeoutMs?: number;
}

/**
 * Bound an upstream provider request so a silent vendor cannot pin the Worker.
 * The caller still owns classification of the resulting AbortError; this helper
 * deliberately does not translate transport failure into entitlement truth.
 */
export async function fetchProviderWithTimeout(
  fetchImpl: typeof fetch,
  input: string | URL | Request,
  init: RequestInit = {},
  options: ProviderFetchOptions = {},
): Promise<Response> {
  const timeoutMs = Math.max(250, Math.min(30_000, options.timeoutMs ?? 8_000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
