/**
 * The registered live rooms (Garden 18 super order P0-B, 2026-10-05).
 *
 * /api/livekit minted a 4-hour token for ANY room name a signed-in user typed,
 * so anyone could open unlisted rooms (and spend participant minutes) that no
 * page offers. A token is now minted only for a room WM actually publishes:
 * the Lounge's live rooms and WM TV's stages. Adding a room = adding it here;
 * `liveRooms.test.ts` fails if a page offers a room this list does not hold.
 */
export const REGISTERED_LIVE_ROOMS: ReadonlySet<string> = new Set([
  // Lounge (src/app/lounge/page.tsx LIVE_ROOMS)
  "wm-wealthy-mindsets",
  "wm-nq-morning",
  "wm-crypto-talk",
  "wm-beats-vibes",
  "wm-market-open",
  // WM TV (src/app/tv/page.tsx: `wmtv-${channel.id}` + the brain-fitness room)
  "wmtv-live-room",
  "wmtv-podcast-stage",
  "wmtv-brain-fitness",
]);

export function isRegisteredLiveRoom(room: string | null | undefined): room is string {
  return typeof room === "string" && REGISTERED_LIVE_ROOMS.has(room);
}

/** A LiveKit identity WM itself minted: `wm:<account id>`. */
export function isWmParticipantIdentity(identity: unknown): identity is string {
  return typeof identity === "string" && /^wm:[A-Za-z0-9_-]{1,64}$/.test(identity);
}
