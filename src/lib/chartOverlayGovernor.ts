export const STANDARD_OVERLAY_FRAME_MS = 33;
export const PROFILE_OVERLAY_FRAME_MS = 50;

export function overlayFrameBudgetMs(profilesActive: boolean): number {
  return profilesActive ? PROFILE_OVERLAY_FRAME_MS : STANDARD_OVERLAY_FRAME_MS;
}

export function shouldDrawOverlay(input: {
  hidden: boolean;
  now: number;
  lastDrawAt: number;
  frameBudgetMs: number;
}): boolean {
  if (input.hidden) return false;
  if (!Number.isFinite(input.now) || !Number.isFinite(input.lastDrawAt)) return false;
  return input.now - input.lastDrawAt >= input.frameBudgetMs;
}
