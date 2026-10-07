/**
 * ACTIVE TOOLS — Drive Garden 18 snapshot 10-02 §B5 (2026-10-07).
 *
 * "One compact panel listing every sense/tool currently ON for this chart,
 * each with focus, configure, hide and remove; it must agree with what the
 * canvas actually paints."
 *
 * PURE. Rows are compiled from three existing owners and nothing else:
 *   · the switch state  — `selectProfileMenu` entries (`active`, availability)
 *   · the paint receipts — `senseEventStates` words (the chart's own receipts)
 *   · the visual roles  — `visualRoles` (PRIMARY … LATENT = opacity/priority)
 * so the panel can never say ON over a switch that is OFF, nor "on the chart"
 * over a layer whose receipt says it painted nothing.
 *
 * Hide = LATENT (kept on, mostly context). Focus = this one PRIMARY, every
 * other role-bearing ON tool AMBIENT. Neither switches anything off.
 */
import type { ProfileId, ProfileMenuEntry } from "@/lib/marketData/viewModels/selectProfileMenu";
import {
  SENSE_BROKEN,
  SENSE_NO_EVENT,
  SENSE_NOT_ENTITLED,
  SENSE_ON_CAMERA,
  SENSE_UNAVAILABLE,
  senseNeedsTradedVolume,
} from "@/lib/chart/senseEventStates";
import { ROLE_LAYERS, type VisualRole, type VisualRoles } from "./visualRoles";

/** What the glass is doing with an ON tool, in one word the panel can colour. */
export type ActiveToolPaint = "PAINTING" | "QUIET" | "BLOCKED" | "UNREPORTED";

export interface ActiveToolRow {
  readonly id: ProfileId;
  /** The catalogue's own name (the same one the ⓘ education card and every door print). */
  readonly label: string;
  readonly paint: ActiveToolPaint;
  /** "ON — nothing on this camera", "ON — needs traded volume", "ON — on the chart · 3 zones" … */
  readonly words: string;
  readonly role: VisualRole;
  /** Kept on but quiet (role LATENT). */
  readonly hidden: boolean;
  /** Has a painting layer a role can bring forward or quiet. */
  readonly composable: boolean;
}

const lower = (s: string) => s.toLowerCase();

/**
 * The words for one ON tool. A receipt, when the chart published one, outranks
 * the menu's availability: the receipt is what the frame actually painted.
 */
export function activeToolWords(entry: Pick<ProfileMenuEntry, "availability" | "availabilityNote" | "stateWords">, receipt: string | undefined): { paint: ActiveToolPaint; words: string } {
  if (receipt) {
    if (senseNeedsTradedVolume(receipt)) return { paint: "BLOCKED", words: "ON — needs traded volume" };
    if (receipt === SENSE_NO_EVENT) return { paint: "QUIET", words: "ON — nothing on this camera" };
    if (receipt === SENSE_UNAVAILABLE) return { paint: "BLOCKED", words: "ON — unavailable on this feed" };
    if (receipt === SENSE_NOT_ENTITLED) return { paint: "BLOCKED", words: "ON — not entitled" };
    if (receipt === SENSE_BROKEN) return { paint: "BLOCKED", words: "ON — broken / not wired" };
    if (receipt.startsWith(SENSE_ON_CAMERA)) {
      const detail = receipt.slice(SENSE_ON_CAMERA.length).replace(/^\s*·\s*/, "");
      return { paint: "PAINTING", words: detail ? `ON — on the chart · ${lower(detail)}` : "ON — on the chart" };
    }
    // A receipt word this panel does not know is printed verbatim, never upgraded.
    return { paint: "UNREPORTED", words: `ON — ${lower(receipt)}` };
  }
  if (entry.stateWords && /NEEDS TRADED VOLUME/.test(entry.stateWords)) return { paint: "BLOCKED", words: "ON — needs traded volume" };
  switch (entry.availability) {
    case "NEEDS_SIDED_TAPE": return { paint: "BLOCKED", words: "ON — needs sided tape" };
    case "WAITING_FOR_BARS": return { paint: "QUIET", words: "ON — waiting for bars" };
    case "WAITING_FOR_PRINTS": return { paint: "QUIET", words: "ON — waiting for prints" };
    case "REFUSED_BY_DATA": return { paint: "BLOCKED", words: "ON — these bars cannot build it" };
    // READY with no receipt: the switch is on and the data can carry it, but
    // the chart has not reported a paint for it — say ON and claim no more.
    default: return { paint: "UNREPORTED", words: "ON" };
  }
}

export function selectActiveTools(input: {
  readonly entries: readonly ProfileMenuEntry[];
  readonly receipts?: Readonly<Partial<Record<string, string>>>;
  readonly roles?: VisualRoles;
}): readonly ActiveToolRow[] {
  const roles = input.roles ?? {};
  return input.entries.filter(e => e.active).map(e => {
    const { paint, words } = activeToolWords(e, input.receipts?.[e.id]);
    const role = roles[e.id] ?? "SUPPORTING";
    // Clarity owns no governor layer but its renderer reads the role (visualRoles.ts).
    const composable = ROLE_LAYERS[e.id] !== undefined;
    return { id: e.id, label: e.label, paint, words: role === "LATENT" ? `${words} · hidden` : words, role, hidden: role === "LATENT", composable };
  });
}

/** FOCUS — bring this one forward, quiet the other ON tools. Nothing switches off. */
export function focusTool(roles: VisualRoles, activeIds: readonly ProfileId[], id: ProfileId): VisualRoles {
  const out: Partial<Record<ProfileId, VisualRole>> = { ...roles };
  for (const other of activeIds) {
    if (other === id || !ROLE_LAYERS[other]) continue;
    out[other] = "AMBIENT";
  }
  out[id] = "PRIMARY";
  return out;
}

/** Is this tool the one in focus? */
export function toolFocused(roles: VisualRoles, id: ProfileId): boolean {
  return roles[id] === "PRIMARY";
}

/** HIDE — keep it on, quiet (LATENT). Pressing again returns it to SUPPORTING. */
export function toggleHidden(roles: VisualRoles, id: ProfileId): VisualRoles {
  const out: Partial<Record<ProfileId, VisualRole>> = { ...roles };
  if (out[id] === "LATENT") delete out[id];
  else out[id] = "LATENT";
  return out;
}

/** UNFOCUS — every role this panel's focus set goes back to the default. */
export function clearFocus(roles: VisualRoles, activeIds: readonly ProfileId[]): VisualRoles {
  const out: Partial<Record<ProfileId, VisualRole>> = { ...roles };
  for (const id of activeIds) if (out[id] === "PRIMARY" || out[id] === "AMBIENT") delete out[id];
  return out;
}
