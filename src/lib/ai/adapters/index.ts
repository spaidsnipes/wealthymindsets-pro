/**
 * ai/adapters — registry of all AIAdapter implementations.
 *
 * Mirror of src/lib/broker/adapters/index.ts. The ONE place consumers look up
 * an AI provider adapter by AIProviderId. Adding a provider = one adapter file
 * + one registry line — never a new direct-call path (organism rule).
 *
 * Zero runtime side effects — importing only registers references; no upstream
 * calls.
 */

import type { AIAdapter, AIProviderId } from "../AIAdapter";
import { geminiAdapter } from "./geminiAdapter";

const REGISTRY: Partial<Record<AIProviderId, AIAdapter>> = {
  gemini: geminiAdapter,
};

/** Look up an adapter by provider id. null when not shipped (honest absence). */
export function getAIAdapter(id: AIProviderId): AIAdapter | null {
  return REGISTRY[id] ?? null;
}

/** All shipped adapters as an array — stable iteration order. */
export function listAIAdapters(): readonly AIAdapter[] {
  return (Object.values(REGISTRY) as AIAdapter[]).filter((a): a is AIAdapter => a != null);
}

/** True if an adapter has been registered for this provider. */
export function hasAIAdapter(id: AIProviderId): boolean {
  return REGISTRY[id] != null;
}
