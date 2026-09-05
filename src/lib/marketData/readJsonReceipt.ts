/**
 * Read one no-store JSON receipt with a deadline that covers both response
 * headers and the complete body. The child signal is aborted on timeout or
 * when the owning surface unmounts, so a late body cannot repaint stale truth.
 */
export async function readJsonReceipt<T>(
  fetchImpl: typeof fetch,
  url: string,
  parentSignal: AbortSignal,
  timeoutMs = 12_000,
): Promise<T> {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parentSignal.reason);
  if (parentSignal.aborted) abortFromParent();
  else parentSignal.addEventListener("abort", abortFromParent, { once: true });

  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    const request = (async () => {
      const response = await fetchImpl(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() as T;
    })();
    const timeout = new Promise<never>((_, reject) => {
      deadline = setTimeout(() => {
        controller.abort(new DOMException("Receipt deadline exceeded", "TimeoutError"));
        reject(new Error("Receipt timed out"));
      }, timeoutMs);
    });
    return await Promise.race([request, timeout]);
  } finally {
    if (deadline) clearTimeout(deadline);
    parentSignal.removeEventListener("abort", abortFromParent);
  }
}

export interface ClassifiedJsonReceipt<T> {
  readonly ok: boolean;
  readonly status: number;
  readonly body: T | null;
}

/**
 * Variant for provider routes whose non-2xx JSON body contains the canonical
 * blocker classification. It preserves HTTP status while applying the same
 * complete-response deadline and never throws merely because an error body is
 * absent or malformed.
 */
export async function readClassifiedJsonReceipt<T>(
  fetchImpl: typeof fetch,
  url: string,
  parentSignal: AbortSignal,
  timeoutMs = 12_000,
): Promise<ClassifiedJsonReceipt<T>> {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parentSignal.reason);
  if (parentSignal.aborted) abortFromParent();
  else parentSignal.addEventListener("abort", abortFromParent, { once: true });

  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    const request = (async () => {
      const response = await fetchImpl(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null) as T | null;
      return { ok: response.ok, status: response.status, body };
    })();
    const timeout = new Promise<never>((_, reject) => {
      deadline = setTimeout(() => {
        controller.abort(new DOMException("Receipt deadline exceeded", "TimeoutError"));
        reject(new Error("Receipt timed out"));
      }, timeoutMs);
    });
    return await Promise.race([request, timeout]);
  } finally {
    if (deadline) clearTimeout(deadline);
    parentSignal.removeEventListener("abort", abortFromParent);
  }
}
