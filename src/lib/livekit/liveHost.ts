import { tastytradeOwnerGate } from "@/lib/broker/brokerOwner";

/**
 * WHO MAY GO LIVE (2026-10-04, guest audit). /api/livekit minted a publishing
 * token for any signed-in user who asked for role=host, in any room — so any
 * guest could broadcast into WM TV in front of every viewer — and
 * /api/livekit/approve let any signed-in user grant publish rights to anyone.
 *
 * A host is the deployment's owner, or a WM user id the Founder lists in
 * LIVEKIT_HOST_USER_IDS (comma-separated). Everyone else joins as a viewer.
 */
export function isLiveHost(userId: string, env: Readonly<Record<string, string | undefined>>): boolean {
  if (!userId) return false;
  if (tastytradeOwnerGate(userId, env).allowed) return true;
  return (env.LIVEKIT_HOST_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean).includes(userId);
}

export const LIVE_HOST_REFUSAL = "Only WM hosts can go live. You can join this room as a viewer.";
