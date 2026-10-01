/**
 * VISUAL ROLES — Garden 18 §XXXVI–§XXXVIII. "OPACITY IS SEMANTIC."
 *
 *   PRIMARY     strongest — the sense the trader is reading right now
 *   SUPPORTING  clear      — the default; exactly the Founder's canon alpha
 *   AMBIENT     quiet
 *   LATENT      mostly context; still visible above the attention floor
 *
 * A role changes REPRESENTATION only: it is one factor inside the attention
 * governor, after depth, regime light and staleness. It never turns a sense
 * off, never moves geometry, and the candles (the face) are never given one.
 * A role is stored per tool (ProfileId) and saved inside a My View.
 */
import type { AttentionLayerKey } from "@/lib/marketData/viewModels/selectAttentionGovernor";
import { currentProofScene, proofSceneHoldsWrites } from "@/lib/chart/proofScene";
import { PROFILE_FAMILY, type ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";

export type VisualRole = "PRIMARY" | "SUPPORTING" | "AMBIENT" | "LATENT";
export const VISUAL_ROLES: readonly VisualRole[] = ["PRIMARY", "SUPPORTING", "AMBIENT", "LATENT"];
export type VisualRoles = Readonly<Partial<Record<ProfileId, VisualRole>>>;

export const VISUAL_ROLES_STORAGE_KEY = "wm_visual_roles";
export const VISUAL_ROLES_EVENT = "wm-visual-roles";

/** Which painting layers each tool owns (the governor's keys). */
export const ROLE_LAYERS: Readonly<Partial<Record<ProfileId, readonly AttentionLayerKey[]>>> = {
  // Clarity is price, not environment. Its own renderer consumes the role
  // with a protected ink floor rather than environmental attenuation.
  CLARITY_CANDLE: [],
  ABSORPTION: ["absorption"],
  EXHAUSTION: ["exhaustion"],
  VALUE_CANDLE: ["valueCandle"],
  IMBALANCE_STACK: ["stack"],
  DELTA_DIVERGENCE: ["divergence"],
  LIQUIDITY_WEATHER: ["weather"],
  EFFORT_MARK: ["effort"],
  DELTA_LEVELS: ["deltaLevels"],
  LIVING_PROFILE: ["livingProfile", "livingProfileMovie", "sessionGhosts"],
  PROFILE_DNA: ["profileDna"],
  TPO_PROFILE: ["tpo"],
  STRUCTURE_PROFILE: ["structureProfile"],
  COMPOSITE_PROFILE: ["compositeProfile"],
  VISIBLE_RANGE_PROFILE: ["visibleRangeProfile"],
  PROFILE_FUSION: ["profileFusion", "fusedObject"],
  PROFILE_MEMORY: ["profileMemory"],
  VALUE_MIGRATION: ["valueMigration"],
  MARKET_STRUCTURE: ["marketStructure"],
  ANATOMY_CARDS: ["anatomyCards"],
  EXPECTED_ENVELOPE: ["expectedEnvelope"],
  CONTRADICTION: ["contradiction"],
  LIQUIDITY_LIFECYCLE: ["liquidityLifecycle"],
  MTF_ANCESTRY: ["mtfAncestry"],
  DERIVATIVES_PRESSURE: ["derivativesPressure"],
  BRICK_WALLS: ["brickWalls"],
  MEMORY_GHOST: ["memoryGhost"],
};

export function clarityRoleOpacity(role: VisualRole | undefined): number {
  return role === "LATENT" ? 0.9 : role === "AMBIENT" ? 0.95 : 1;
}

/** The governor's view: role per painting layer. */
export function rolesByLayer(roles: VisualRoles): Partial<Record<AttentionLayerKey, VisualRole>> {
  const out: Partial<Record<AttentionLayerKey, VisualRole>> = {};
  // While one sense leads, every other composable sense without a role of
  // its own is SUPPORTING — so the governor can step it back behind the lead.
  if (Object.values(roles).includes("PRIMARY")) {
    for (const layers of Object.values(ROLE_LAYERS)) for (const layer of layers ?? []) out[layer] = "SUPPORTING";
  }
  for (const [id, role] of Object.entries(roles) as [ProfileId, VisualRole][]) {
    for (const layer of ROLE_LAYERS[id] ?? []) out[layer] = role;
  }
  return out;
}

export function parseVisualRoles(raw: unknown): VisualRoles {
  let v: unknown = raw;
  if (typeof raw === "string") { try { v = JSON.parse(raw); } catch { return {}; } }
  if (!v || typeof v !== "object") return {};
  const out: Partial<Record<ProfileId, VisualRole>> = {};
  for (const [k, r] of Object.entries(v as Record<string, unknown>)) {
    if (k in PROFILE_FAMILY && VISUAL_ROLES.includes(r as VisualRole)) out[k as ProfileId] = r as VisualRole;
  }
  return out;
}

export function nextRole(role: VisualRole | undefined): VisualRole {
  const at = VISUAL_ROLES.indexOf(role ?? "SUPPORTING");
  return VISUAL_ROLES[(at + 1) % VISUAL_ROLES.length]!;
}

/**
 * AUTO COMPOSE (§XXXVIII) — redistributes roles among what is ON; never
 * switches anything off. One PRIMARY: the first on-price order-flow sense,
 * else the first profile. Other order-flow and profile senses SUPPORT;
 * memory, context and market-sense readings go AMBIENT.
 */
export function autoCompose(activeIds: readonly ProfileId[]): VisualRoles {
  const out: Partial<Record<ProfileId, VisualRole>> = {};
  const primary = activeIds.find(id => PROFILE_FAMILY[id] === "ORDER_FLOW" && ROLE_LAYERS[id])
    ?? activeIds.find(id => PROFILE_FAMILY[id] === "PROFILE" && ROLE_LAYERS[id]);
  for (const id of activeIds) {
    if (!ROLE_LAYERS[id]) continue;
    out[id] = id === primary ? "PRIMARY" : PROFILE_FAMILY[id] === "READING" ? "AMBIENT" : "SUPPORTING";
  }
  return out;
}

/**
 * A proof scene holds its roles for the page only (serving BTC 15m,
 * 2026-10-01: setting Absorption = PRIMARY inside `scene=clean` rewrote the
 * trader's own wm_visual_roles). A clean scene starts from Founder Canon ({}).
 */
let sceneRoles: VisualRoles | null = null;

export function readStoredRoles(): VisualRoles {
  if (proofSceneHoldsWrites()) return sceneRoles ?? (currentProofScene().clean ? {} : readSavedRoles());
  return readSavedRoles();
}

function readSavedRoles(): VisualRoles {
  try { return parseVisualRoles(localStorage.getItem(VISUAL_ROLES_STORAGE_KEY)); } catch { return {}; }
}

export function writeStoredRoles(roles: VisualRoles): void {
  if (proofSceneHoldsWrites()) sceneRoles = parseVisualRoles(roles);
  else try { localStorage.setItem(VISUAL_ROLES_STORAGE_KEY, JSON.stringify(roles)); } catch { /* this visit only */ }
  try { window.dispatchEvent(new Event(VISUAL_ROLES_EVENT)); } catch { /* no window */ }
}
