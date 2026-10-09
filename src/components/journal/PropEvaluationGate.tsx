"use client";

/**
 * THE ONLY DOOR TO THE PROP EVALUATION DESK (Founder order §7, 2026-10-09).
 *
 * Owner-only. The audience is the server's own answer (useBrokerAudience → /api/broker/readiness,
 * "OWNER" | "GUEST"; fails closed), the same question the Journal's owner panels already ask. For a
 * member, a guest, or while the answer is pending this renders NOTHING — no heading, no placeholder,
 * no name — and the desk's code is not even requested (it is a lazy chunk loaded after OWNER).
 *
 * The storage key is scoped to the signed-in owner's id, on this device only.
 */

import dynamic from "next/dynamic";
import React from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useBrokerAudience } from "@/lib/broker/useBrokerAudience";
import { memberKeyOf } from "@/lib/journal/managementOwner";

export const PROP_EVALUATION_BASE_KEY = "wm:prop-evaluation:v1";

const PropEvaluationDesk = dynamic(() => import("@/components/journal/PropEvaluationDesk").then(m => m.PropEvaluationDesk), { ssr: false });

export function PropEvaluationGate({ sample = false }: { readonly sample?: boolean }): React.ReactElement | null {
  const { user } = useAuth();
  const audience = useBrokerAudience();
  if (audience !== "OWNER" || !user?.id) return null;
  return <PropEvaluationDesk storageKey={sample ? null : memberKeyOf(PROP_EVALUATION_BASE_KEY, user.id)} sample={sample} />;
}

export default PropEvaluationGate;
