import { beforeEach, describe, expect, it } from "vitest";
import { persistentRoles, readStoredRoles, writeStoredRoles, VISUAL_ROLES_SESSION_KEY, VISUAL_ROLES_STORAGE_KEY } from "./visualRoles";

// Founder's Chrome, NQ1! 5m 2026-10-23: a Focus set days earlier held every other tool at 0.25 ("the colors got dark").
class MemStore { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, String(v)); } removeItem(k: string) { this.m.delete(k); } clear() { this.m.clear(); } }
(globalThis as any).localStorage = new MemStore();
(globalThis as any).sessionStorage = new MemStore();

describe("Focus and Quiet last one visit; Hide is kept", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it("a stored lead from an earlier visit is lifted on read", () => {
    localStorage.setItem(VISUAL_ROLES_STORAGE_KEY, JSON.stringify({ EXHAUSTION: "PRIMARY", STRUCTURE_PROFILE: "AMBIENT", BRICK_WALLS: "LATENT" }));
    expect(readStoredRoles()).toEqual({ BRICK_WALLS: "LATENT" });
  });
  it("this visit keeps what the trader set; the next visit keeps only Hide", () => {
    writeStoredRoles({ EXHAUSTION: "PRIMARY", BRICK_WALLS: "LATENT" });
    expect(readStoredRoles()).toEqual({ EXHAUSTION: "PRIMARY", BRICK_WALLS: "LATENT" });
    expect(JSON.parse(sessionStorage.getItem(VISUAL_ROLES_SESSION_KEY)!)).toEqual({ EXHAUSTION: "PRIMARY", BRICK_WALLS: "LATENT" });
    sessionStorage.clear();
    expect(readStoredRoles()).toEqual({ BRICK_WALLS: "LATENT" });
  });
  it("persistentRoles keeps LATENT only", () => {
    expect(persistentRoles({ ABSORPTION: "AMBIENT", EXHAUSTION: "PRIMARY", TPO_PROFILE: "SUPPORTING", MEMORY_GHOST: "LATENT" })).toEqual({ MEMORY_GHOST: "LATENT" });
  });
});
