/**
 * Deploy-version recovery (Garden 18 super order P0-A, 2026-10-05).
 *
 * MEASURED 2026-10-05 03:36 CDT: /command-deck fell to the room error page once,
 * 2 s after a deploy went LIVE — an old page meeting the new build's chunks.
 * A trader should not be left on "This room didn't open" for that. When a room
 * crashes and the cause is version skew — a chunk that no longer exists, or the
 * server now answering a different build than this page was built from — the
 * page reloads ONCE onto the current build. A guard stops reload loops: a second
 * crash inside the window shows the error page as before.
 */
const CHUNK_PATTERNS = [
  /ChunkLoadError/i,
  /Loading (CSS )?chunk [\w-]+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: unknown; message?: unknown };
  const text = `${typeof e.name === "string" ? e.name : ""} ${typeof e.message === "string" ? e.message : ""}`;
  return CHUNK_PATTERNS.some(re => re.test(text));
}

/** This page's own build, inlined at build time (next.config `env`). Empty when unstamped. */
export function pageBuildSha(): string {
  return (process.env.WM_BUILD_SHA ?? "").trim();
}

/** True when the serving build differs from the one this page was built from. */
export async function servingBuildDiffers(
  fetchImpl: typeof fetch,
  ownSha: string = pageBuildSha(),
): Promise<boolean> {
  if (!ownSha) return false; // an unstamped page cannot prove skew
  try {
    const res = await fetchImpl(`/api/build-identity?r=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return false;
    const j = (await res.json()) as { sha?: unknown };
    return typeof j.sha === "string" && j.sha.length > 0 && j.sha !== ownSha;
  } catch {
    return false;
  }
}

export const RECOVERY_KEY = "wm-version-recovery-at";
export const RECOVERY_WINDOW_MS = 60_000;

/** Whether a reload is allowed now (no recovery reload in the last window). */
export function recoveryAllowed(storage: Pick<Storage, "getItem"> | null, nowMs: number): boolean {
  try {
    const last = Number(storage?.getItem(RECOVERY_KEY) ?? 0);
    return !(Number.isFinite(last) && last > 0 && nowMs - last < RECOVERY_WINDOW_MS);
  } catch {
    return false; // storage refused: never risk a loop
  }
}

/**
 * Decide and act: returns true when a recovery reload was started. The error
 * page stays on screen (unchanged) whenever this returns false.
 */
export async function recoverFromVersionSkew(
  error: unknown,
  deps: { fetchImpl: typeof fetch; storage: Storage | null; reload: () => void; nowMs?: number },
): Promise<boolean> {
  const now = deps.nowMs ?? Date.now();
  if (!recoveryAllowed(deps.storage, now)) return false;
  const skew = isChunkLoadError(error) || (await servingBuildDiffers(deps.fetchImpl));
  if (!skew) return false;
  try { deps.storage?.setItem(RECOVERY_KEY, String(now)); } catch { return false; }
  deps.reload();
  return true;
}
