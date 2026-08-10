export const DECISION_MEMORY_SCHEMA_VERSION = "wm.decision-memory.v1" as const;
export const DECISION_AMENDMENT_SCHEMA_VERSION = "wm.decision-amendment.v1" as const;

export type TradingDecisionAction = "ENTER" | "WAIT" | "PASS" | "MANAGE";
export type EvidenceState = "SUPPORTED" | "CONTRADICTED" | "UNKNOWN";
export type EvidenceFidelity = "OBSERVED" | "DERIVED" | "PROXY" | "UNAVAILABLE";

export interface DecisionEvidenceRef {
  evidenceId: string;
  observedAt: number;
  availableAt: number;
  source: string;
  fidelity: EvidenceFidelity;
  summary: string;
}

export interface DecisionDimension {
  state: EvidenceState;
  confidence: number | null;
  evidence: readonly DecisionEvidenceRef[];
  unknownReason?: string;
}

export type AvailableR =
  | { status: "AVAILABLE"; value: number; barrier: number; estimatedCosts: number }
  | { status: "UNKNOWN" | "UNAVAILABLE"; reason: string };

export interface DecisionRiskPlan {
  structuralInvalidation: number | null;
  plannedStop: number | null;
  plannedTarget: number | null;
  availableR: AvailableR;
  plannedPosition: number | null;
  plannedAccountRisk: number | null;
  managementRules: readonly string[];
}

export interface DecisionMemoryInput {
  decisionMemoryId: string;
  decidedAt: number;
  availableAt: number;
  action: TradingDecisionAction;
  symbol: string;
  session: string;
  timeframeContext: readonly string[];
  marketStateSnapshotId: string;
  marketStateCapturedAt: number;
  marketStateAvailableAt: number;
  direction: DecisionDimension;
  location: DecisionDimension;
  aggression: DecisionDimension;
  regime: string | null;
  playbookId: string | null;
  playbookVersion: string | null;
  thesis: string;
  trigger: string | null;
  contradictions: readonly string[];
  unknowns: readonly string[];
  risk: DecisionRiskPlan;
  dataQuality: string;
  orderFlowCapability: string;
  aiRecommendation?: {
    recommendation: string;
    modelVersion: string;
    provenance: string;
  };
  userDecision: string;
}

export interface SealedDecisionMemory extends DecisionMemoryInput {
  schemaVersion: typeof DECISION_MEMORY_SCHEMA_VERSION;
  sealed: true;
  sealedAt: number;
}

export interface DecisionMemoryAmendment {
  schemaVersion: typeof DECISION_AMENDMENT_SCHEMA_VERSION;
  amendmentId: string;
  decisionMemoryId: string;
  createdAt: number;
  author: "USER" | "SYSTEM";
  reason: string;
  note: string;
}

const validEpoch = (value: number) => Number.isFinite(value) && value > 0;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function validateDimension(name: string, dimension: DecisionDimension, decisionCutoff: number): string[] {
  const errors: string[] = [];
  if (dimension.confidence != null &&
      (!Number.isFinite(dimension.confidence) || dimension.confidence < 0 || dimension.confidence > 1)) {
    errors.push(`${name} confidence must be between 0 and 1.`);
  }
  if (dimension.state === "UNKNOWN" && !dimension.unknownReason?.trim()) {
    errors.push(`${name} UNKNOWN requires an explanation.`);
  }
  if (dimension.state !== "UNKNOWN" && dimension.evidence.length === 0) {
    errors.push(`${name} ${dimension.state} requires evidence.`);
  }
  for (const evidence of dimension.evidence) {
    if (!evidence.evidenceId.trim() || !evidence.source.trim() || !evidence.summary.trim()) {
      errors.push(`${name} evidence requires identity, source, and summary.`);
    }
    if (!validEpoch(evidence.observedAt) || !validEpoch(evidence.availableAt) ||
        evidence.availableAt < evidence.observedAt || evidence.availableAt > decisionCutoff) {
      errors.push(`${name} evidence was not available at decision time.`);
    }
  }
  return errors;
}

export function validateDecisionMemory(input: DecisionMemoryInput): string[] {
  const errors: string[] = [];
  if (!input.decisionMemoryId.trim() || !input.symbol.trim() || !input.marketStateSnapshotId.trim() ||
      !input.userDecision.trim()) errors.push("Decision identity and user decision are required.");
  if (!input.session.trim() || input.timeframeContext.length === 0 || !input.thesis.trim() ||
      !input.dataQuality.trim() || !input.orderFlowCapability.trim()) {
    errors.push("Decision context, thesis, data quality, and capability are required.");
  }
  if (Boolean(input.playbookId) !== Boolean(input.playbookVersion)) {
    errors.push("Playbook identity and version must be captured together.");
  }
  if (!validEpoch(input.decidedAt) || !validEpoch(input.availableAt) || input.availableAt < input.decidedAt) {
    errors.push("Decision chronology is invalid.");
  }
  if (!validEpoch(input.marketStateCapturedAt) || !validEpoch(input.marketStateAvailableAt) ||
      input.marketStateAvailableAt < input.marketStateCapturedAt || input.marketStateAvailableAt > input.decidedAt) {
    errors.push("Market State was not available at decision time.");
  }
  errors.push(...validateDimension("Direction", input.direction, input.decidedAt));
  errors.push(...validateDimension("Location", input.location, input.decidedAt));
  errors.push(...validateDimension("Aggression", input.aggression, input.decidedAt));

  if (input.action === "ENTER" || input.action === "MANAGE") {
    if (input.risk.structuralInvalidation == null || input.risk.plannedStop == null) {
      errors.push(`${input.action} requires structural invalidation and a planned stop.`);
    }
    if (input.risk.plannedTarget == null) errors.push(`${input.action} requires a planned target.`);
  }
  if (input.action === "ENTER") {
    if (!input.trigger?.trim()) errors.push("ENTER requires a declared trigger.");
    if ([input.direction, input.location, input.aggression].some(dimension => dimension.state === "UNKNOWN")) {
      errors.push("ENTER requires resolved Direction, Location, and Aggression evidence.");
    }
    if (input.risk.availableR.status !== "AVAILABLE") errors.push("ENTER requires resolved Available R.");
    if (input.risk.plannedPosition == null || input.risk.plannedPosition <= 0 ||
        input.risk.plannedAccountRisk == null || input.risk.plannedAccountRisk <= 0) {
      errors.push("ENTER requires positive planned position and account risk.");
    }
  }
  for (const value of [input.risk.structuralInvalidation, input.risk.plannedStop, input.risk.plannedTarget]) {
    if (value != null && (!Number.isFinite(value) || value <= 0)) errors.push("Risk price levels must be positive finite values.");
  }
  if (input.risk.availableR.status === "AVAILABLE" &&
      (!Number.isFinite(input.risk.availableR.value) || input.risk.availableR.value < 0)) {
    errors.push("Available R must be a non-negative finite value.");
  }
  if (input.risk.availableR.status !== "AVAILABLE" && !input.risk.availableR.reason.trim()) {
    errors.push("Unknown or unavailable R requires an explanation.");
  }
  return [...new Set(errors)];
}

/** Seals only pre-decision facts. Outcomes intentionally have no field here. */
export function sealDecisionMemory(input: DecisionMemoryInput, sealedAt = Date.now()): SealedDecisionMemory {
  const errors = validateDecisionMemory(input);
  if (!validEpoch(sealedAt) || sealedAt < input.availableAt) errors.push("Seal time precedes decision availability.");
  if (errors.length) throw new Error(errors.join(" "));
  return deepFreeze({ ...structuredClone(input), schemaVersion: DECISION_MEMORY_SCHEMA_VERSION, sealed: true, sealedAt });
}

/** Corrections append context; they never rewrite the sealed decision. */
export function createDecisionMemoryAmendment(
  memory: SealedDecisionMemory,
  amendment: Omit<DecisionMemoryAmendment, "schemaVersion" | "decisionMemoryId">,
): DecisionMemoryAmendment {
  if (!amendment.amendmentId.trim() || !amendment.reason.trim() || !amendment.note.trim()) {
    throw new Error("Decision Memory amendments require identity, reason, and note.");
  }
  if (!validEpoch(amendment.createdAt) || amendment.createdAt < memory.sealedAt) {
    throw new Error("Decision Memory amendment chronology is invalid.");
  }
  return deepFreeze({
    ...amendment,
    schemaVersion: DECISION_AMENDMENT_SCHEMA_VERSION,
    decisionMemoryId: memory.decisionMemoryId,
  });
}
