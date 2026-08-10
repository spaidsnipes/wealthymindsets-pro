export const WM_TAPE_PROTOCOL_VERSION = "v2-canonical-event" as const;

/**
 * Cross-tab leadership must be versioned. A tab may only follow a leader that
 * broadcasts the same canonical Market Event envelope contract.
 */
export function tapeProtocolChannel(feedKey: string): string {
  const normalized = feedKey.trim();
  if (!normalized) throw new Error("Tape protocol requires a feed key.");
  return `wm-tape:${WM_TAPE_PROTOCOL_VERSION}:${normalized}`;
}
