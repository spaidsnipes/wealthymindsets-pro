export interface TickIdentityInput {
  time: number;
  price: number;
  size: number;
  side: string;
  marketEvent?: { eventId: string };
}

/** Prefer canonical provider/event identity; retain the legacy fingerprint only
 * for adapters that have not yet migrated to the Market Event contract. */
export function marketTickDedupeKey(tick: TickIdentityInput): string {
  const eventId = tick.marketEvent?.eventId?.trim();
  return eventId ? `event:${eventId}` : `legacy:${tick.time}|${tick.price}|${tick.size}|${tick.side}`;
}
