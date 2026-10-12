/**
 * loungeWrite — the only way the browser changes Lounge data.
 *
 * Writes go to /api/lounge, which takes identity from the signed WM session.
 * The anon Supabase client is read-only for the Lounge tables.
 */
export type LoungeAction =
  | { action: "post"; content: string; type: string; tradeCard?: unknown; tags?: string[]; color?: string }
  | { action: "delete_post"; postId: number }
  | { action: "like" | "unlike"; postId: number }
  | { action: "comment"; postId: number; body: string; color?: string }
  | { action: "follow" | "unfollow"; handle: string };

export async function loungeWrite<T = Record<string, unknown>>(
  payload: LoungeAction,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  try {
    const res = await fetch("/api/lounge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: typeof data.error === "string" ? data.error : "Lounge is unavailable", status: res.status };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "We could not reach the Lounge. Check your connection.", status: 0 };
  }
}
