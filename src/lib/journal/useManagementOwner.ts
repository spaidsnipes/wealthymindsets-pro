"use client";
/**
 * A counter that changes whenever the management owner changes (AuthContext
 * resolves a member, or nobody). Components that read plans / drafts / day
 * rules put it in their effect deps so they re-read under the right member —
 * a child's first effect runs before AuthContext's.
 */
import { useEffect, useState } from "react";
import { subscribeManagementOwner } from "./managementOwner";

export function useManagementOwnerVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => subscribeManagementOwner(() => setV(x => x + 1)), []);
  return v;
}
