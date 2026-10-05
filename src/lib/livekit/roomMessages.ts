/**
 * Live-room data messages, read through the SENDER LiveKit authenticated
 * (Garden 18 super order P0-B, 2026-10-05).
 *
 * The room trusted fields INSIDE the message: any viewer could publish
 * `JOIN_APPROVED` naming itself (the client then showed publish controls), file
 * a raise-hand under another participant's identity, or cancel someone else's
 * request. LiveKit stamps every data packet with the sender's identity, and the
 * token's metadata (`{"role":"host"|"viewer"}`) is signed by our server — those
 * two facts, not the payload, decide what a message may do.
 */
export type RoomMsg =
  | { type: "JOIN_REQUEST"; identity: string; name: string }
  | { type: "JOIN_APPROVED"; identity: string }
  | { type: "JOIN_DENIED"; identity: string }
  | { type: "REQUEST_CANCEL"; identity: string };

export interface RoomSender { readonly identity: string; readonly metadata?: string | null }

/** The server-signed role carried in a participant's token metadata. */
export function senderIsHost(sender: RoomSender | undefined): boolean {
  if (!sender?.metadata) return false;
  try { return (JSON.parse(sender.metadata) as { role?: unknown }).role === "host"; } catch { return false; }
}

/**
 * The message as the room may act on it, or null. Requests and cancels are
 * re-addressed to the authenticated sender; approvals and denials count only
 * from a host. Unknown shapes are dropped.
 */
export function admitRoomMessage(raw: unknown, sender: RoomSender | undefined): RoomMsg | null {
  if (!sender?.identity || !raw || typeof raw !== "object") return null;
  const m = raw as { type?: unknown; identity?: unknown; name?: unknown };
  switch (m.type) {
    case "JOIN_REQUEST":
      return { type: "JOIN_REQUEST", identity: sender.identity, name: typeof m.name === "string" ? m.name.slice(0, 40) : "Viewer" };
    case "REQUEST_CANCEL":
      return { type: "REQUEST_CANCEL", identity: sender.identity };
    case "JOIN_APPROVED":
    case "JOIN_DENIED":
      if (!senderIsHost(sender) || typeof m.identity !== "string") return null;
      return { type: m.type, identity: m.identity };
    default:
      return null;
  }
}
