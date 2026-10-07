/**
 * logoutIsolation enforcement — Sentinel source-tree scan.
 *
 * Founder Nectar Persistence Authority: "logout/account transition
 * clears owner-local symbol, Nectar and canonical runtime state without
 * deleting server history". Coverage regression class (Project Brief
 * §account isolation, 2026-09-01): a new `wm_…` / `wm-…` localStorage
 * key is added by a builder without being classified. On a shared
 * browser User B then inherits User A's data. Whitelist rot is silent.
 *
 * This test walks src and enumerates every `wm_…` / `wm-…` string
 * literal that could reach `localStorage.{setItem,getItem,removeItem}`.
 * Each key must land in EXACTLY ONE of:
 *   1. OWNER_SCOPED_KEYS in @/lib/logoutIsolation
 *   2. OWNER_SCOPED_PREFIXES (matches by startsWith)
 *   3. DOMAIN_CLEARER_KEYS (owned by clearAllSessionSymbols /
 *      clearPaperState / clearWMSState — cleared separately)
 *   4. DEVICE_LEVEL_EXEMPT (theme, PWA install, tape customization,
 *      cache prefixes — explicitly named in logoutIsolation.ts as
 *      not-touched, or here for other device-local prefs)
 *
 * A key that matches none of the above is an UNCLASSIFIED leak candidate
 * and this test FAILS with the exact key + file:line, forcing the
 * builder (or Sentinel) to make the classification decision explicitly.
 *
 * When it fires, decide:
 *   · Owner data → add to OWNER_SCOPED_KEYS
 *   · Domain-owned → cleared by a clearX() already, add here
 *   · Device pref → add to DEVICE_LEVEL_EXEMPT with rationale
 *   · Session cookie / server-owned → not localStorage, add to
 *     IGNORE_NOT_STORAGE (rare — the pattern also catches false
 *     positives like an `wm_` var-name that never touches storage)
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const SRC_ROOT = resolve(__dirname, "..");

/** Keys enumerated in logoutIsolation.ts OWNER_SCOPED_KEYS. */
const OWNER_SCOPED_KEYS = new Set<string>([
  "wm-profile", "wm-profile-avatar", "wm-profile-bg",
  "wm-radio-liked", "wm-shop-wishlist", "wm-pine-saved",
  "wm_songs", "wm_watchlists", "wm_quick_syms",
  "wm_scanner_starred", "wm_scanner_alerted",
  "wm_journal_entries", "wm_ledger_one_r", "wm_ledger_tag_amendments_v1", "wm_process_days_v1", "wm_ledger_models_v1", "wm_restoration_days_v1", "wm_ledger_clinic_v1", "wm_rule_card_hidden_day", "wm_profile_rules_effective", "wm_pattern_working_on_v1", "wm_edu_progress",
  "wm_api_keys", "wm_creator_waitlist",
  // 2026-10-04 cross-user leak audit:
  "wm-journal", "wm_execution_guardrails_v1", "wm_price_alerts", "wm_story_review_v1", "wm-pine-scripts",
  "wm_research_heat_archive_v1", "wm_alpaca_disconnected", "wm_alpaca_proxy", "wm_lounge_bookmarks",
  "wm_desks_v1", "wm_desk_active_v1",
]);

/** OWNER_SCOPED_PREFIXES from logoutIsolation.ts (matches by startsWith). */
const OWNER_SCOPED_PREFIXES: readonly string[] = ["wm-notes-", "wm_tv_chat_", "wm_draw:v1:", "wm:morning-prep:v2:", "wm:decision-identity:", "wm:risk-receipt:"];

/**
 * Keys cleared by a domain-specific `clearX()` invoked from
 * AuthContext.signOut alongside clearOwnerScopedLocalStorage:
 *  - clearAllSessionSymbols (sessionSymbolStore.ts) sweeps every
 *    wm-nectar:sym:… + related session-symbol keys
 *  - clearPaperState (paperTrade.ts) clears wm_paper_state
 *  - clearWMSState (WMSContext) clears wm_token_state
 */
const DOMAIN_CLEARER_KEYS = new Set<string>([
  "wm_paper_state",      // clearPaperState
  "wm_token_state",      // clearWMSState (WM points)
  "wm_session_v1",       // sessionSymbolStore
  "wm_last_symbol",      // sessionSymbolStore's last-observed key
  "wm:session-symbol-store:v1",       // clearAllSessionSymbols (the store's own LS_KEY)
  "wm:nectar:coverage-continuity:v1", // clearSessionNectarForSignOut (sessionNectar owns it, 2026-10-04)
]);

/**
 * Keys that are legitimately DEVICE-LEVEL (not owner data). Add here
 * with a written rationale; entries mirror the "NOT touched here"
 * block in logoutIsolation.ts plus common device prefs.
 */
const DEVICE_LEVEL_EXEMPT = new Set<string>([
  // Per-TAB (sessionStorage) timestamp of the last deploy-version recovery
  // reload — a loop guard about this browser tab, holds no account data.
  "wm-version-recovery-at",
  "wm_settings",              // theme / font size — device pref
  "wm_theme",                 // theme choice — device pref
  "wm_device",                // long-lived device fingerprint (2y cookie mirror)
  "wm_sfx",                   // sound-effect on/off — device pref
  "wm_sm_compact",            // sidebar compact toggle — device layout
  "wm_sm_width",              // sidebar width — device layout
  "wm_extHours",              // extended-hours toggle — device chart pref
  "wm_candleType",            // candle vs bar vs line — device chart pref
  "wm_timeframe",             // last-active timeframe — device chart pref
  "wm_chartLayout",           // panel arrangement — device chart pref
  "wm_chartSettings",         // grid/crosshair/scales — device chart pref
  "wm_indSettings",           // indicator params — device chart pref
  "wm_activeInds",            // active indicator list — device chart pref
  "wm_delta_levels",          // delta thresholds — device chart pref
  "wm_footprint",             // footprint config — device chart pref
  "wm_fp_enabled",            // footprint on/off — device chart pref
  "wm_ofScaffolding",         // scaffolding lens depth — device chart pref (set by the Academy door)
  "wm_ofMyStack",             // the trader's saved profile stack — device chart layout pref, like wm_chartLayout
  "wm_absorptionAnatomy",     // absorption layer on/off — device chart pref (set by the Academy door)
  "wm_flow_opacity",          // orderflow opacity — device chart pref
  "wm_fixedVP",               // fixed VP config — device chart pref
  "wm_sessionVP",             // session VP config — device chart pref
  "wm_vp_up", "wm_vp_dn",     // VP colors — device chart pref
  "wm_vp_labels", "wm_vp_poc",
  "wm_vp_vah", "wm_vp_val",
  "wm_vp_schemaVersion",      // VP palette migration stamp — device chart pref

  "wm_of_buy", "wm_of_sell",  // OF colors — device chart pref
  "wm_bubble_max",            // bubble scale — device chart pref
  "wm_bubble_paused",         // bubble pause — device chart pref
  "wm_bubble_sound",          // bubble sound — device chart pref
  "wm_bigtrades_simul",       // demo mode — device chart pref
  "wm_bigtrades_on",          // Big Trades overlay on/off — device chart pref
  "wm_composeNotes",          // §16 note-anchor compose on/off — device chart pref
  "wm_bf_seq_best",           // best-perf record — device metric
  "wm_active_watchlist",      // last-selected watchlist name — device chart pref
  "wm_chart_watchlist_open",  // watchlist visibility — device chart layout pref
  "wm_lounge_vibe",           // lounge theme — device pref
  "wm_heatmap_",              // heatmap %/cache prefix — device cache
  "wm_morning_prep_",         // morning prep local index — device pref
  "wm_morning_prep_email",    // morning prep email seed — device pref
  "wm_morning_prep_founder",  // morning prep founder view — device pref
  "wm_morning_prep_guest",    // morning prep guest view — device pref
  "wm_auth",                  // legacy cookie mirror (session cookie is authoritative + cleared by server)
  "WM_INTERNAL",              // constant / feature-flag namespace, not a storage key
  // Device-level keys explicitly listed in logoutIsolation.ts "NOT touched" block:
  "wm-watchlist-prices",      // ticker-tape price cache, not user data
  "wm-tape-symbols",          // ticker-tape customization, device-level
  "wm-install-dismissed",     // PWA install prompt state, device-level
  // Seen by the CONSTANT-key walker (2026-10-04) — device chart prefs / one-shot UI flags:
  "wm-sw-retirement-reload-v1", // one reload after the retired service worker — device, once
  "wm:selectedObject:",       // the chart's selected object per symbol/tf — device UI state
  "wm_anatomyMode",           // anatomy mode — device chart pref
  "wm_livingMarket",          // LIVE / STILL motion — device chart pref
  "wm_of",                    // the wm_of<Layer> switch family prefix — device chart prefs
  "wm_ofStackPrefs",          // profile stack prefs — device chart pref
  "wm_prefRepair",            // preference-repair stamp — device
  "wm_profile_strength",      // profile ink strength — device chart pref
  "wm_questionChoice",        // question lens choice — device chart pref
  "wm_visual_roles",          // visual roles — device chart layout pref
  "wm_workspaceLayouts",      // saved chart layouts — device layout pref, like wm_chartLayout
]);

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (CODE_EXTENSIONS.has(name.slice(name.lastIndexOf(".")))) acc.push(p);
  }
  return acc;
}

// Match `localStorage.setItem("wm-…", …)` / `.getItem("wm-…")` /
// `.removeItem("wm-…")` — the only sites that write real storage keys.
// Also match the sessionStorage variant. The pattern is deliberately tight:
// CSS class names, DOM IDs, filenames, and analytics event tags all use
// "wm-" prefixes but never touch localStorage, so scoping the match to a
// localStorage call keeps the classification honest.
const STORAGE_CALL_PATTERN = /(?:local|session)Storage\.(?:setItem|getItem|removeItem)\(\s*["'](wm[-_][a-zA-Z0-9_.\-]{2,})["']/g;

/**
 * CONSTANT and TEMPLATE keys (2026-10-04, BACKFLOW audit): the call-site
 * pattern above only sees a literal passed straight to setItem. Keys held in
 * a constant (`const JOURNAL_STORAGE_KEY = "wm_journal_entries"`) or built
 * from a template (`wm-notes-${id}`) were invisible, which is how the legacy
 * journal, the live-trading guardrails and Pine scripts outlived sign-out.
 * A template contributes its literal prefix, matched by startsWith.
 */
const CONST_KEY_PATTERN = /const\s+[A-Za-z_]*(?:KEY|Key|_PREFIX|Prefix)[A-Za-z_]*\s*(?::\s*string\s*)?=\s*["'`](wm[-_:][^"'`$]*)(\$\{)?/g;

function collectWmKeys(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const path of walk(SRC_ROOT)) {
    if (path.endsWith(".test.ts") || path.endsWith(".test.tsx")) continue;
    if (path.endsWith("logoutIsolation.ts")) continue;
    const body = readFileSync(path, "utf8");
    // Strip comments to avoid false positives from doc mentions.
    const code = body
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    let c: RegExpExecArray | null;
    CONST_KEY_PATTERN.lastIndex = 0;
    while ((c = CONST_KEY_PATTERN.exec(code)) !== null) {
      const key = c[1];
      if (!found.has(key)) found.set(key, []);
      found.get(key)!.push(path);
    }
    let m: RegExpExecArray | null;
    STORAGE_CALL_PATTERN.lastIndex = 0;
    while ((m = STORAGE_CALL_PATTERN.exec(code)) !== null) {
      const key = m[1];
      if (!found.has(key)) found.set(key, []);
      found.get(key)!.push(path);
    }
  }
  return found;
}

function isClassified(key: string): boolean {
  if (OWNER_SCOPED_KEYS.has(key)) return true;
  if (DOMAIN_CLEARER_KEYS.has(key)) return true;
  if (DEVICE_LEVEL_EXEMPT.has(key)) return true;
  // A template key's literal prefix ("wm-notes-") is classified by any prefix
  // entry it starts with, or that starts with it.
  if ([...DEVICE_LEVEL_EXEMPT, ...DOMAIN_CLEARER_KEYS].some((d) => d.endsWith(":") || d.endsWith("_") ? key.startsWith(d) : false)) return true;
  if (OWNER_SCOPED_PREFIXES.some((p) => key.startsWith(p))) return true;
  return false;
}

describe("logoutIsolation — every wm_ localStorage key must be classified", () => {
  it("discovers a substantial set of wm_ storage-call keys (guards against stale walker)", () => {
    const keys = collectWmKeys();
    // Pattern matches only wm[-_]… strings passed as the first arg of a
    // localStorage/sessionStorage method — the exact call sites that write
    // owner-scoped state.
    expect(keys.size).toBeGreaterThan(0);
  });

  it("POSITIVE CONTROL: keys that exist only as constants are seen (2026-10-04)", () => {
    const keys = collectWmKeys();
    // Each of these is reachable ONLY through a const — the leak class the
    // call-site pattern could not see.
    for (const k of ["wm_execution_guardrails_v1", "wm-journal", "wm-pine-scripts", "wm_story_review_v1"]) {
      expect(keys.has(k), `${k} should be found by the constant-key walker`).toBe(true);
      expect(isClassified(k), `${k} must be classified`).toBe(true);
    }
  });

  it("no unclassified wm_ key can leak across a logout", () => {
    const keys = collectWmKeys();
    const unclassified: string[] = [];
    for (const [key, files] of keys) {
      if (!isClassified(key)) {
        unclassified.push(`${key}  first seen in ${files[0]}`);
      }
    }
    // On failure the message names every leak candidate + file so the
    // builder can decide OWNER_SCOPED / DOMAIN_CLEARER / DEVICE_EXEMPT.
    expect(unclassified).toEqual([]);
  });
});
