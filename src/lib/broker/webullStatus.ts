import type { WebullBrokerConnectionState } from "@/lib/broker/adapters/webullBrokerConnection";

export interface WebullStatus {
  readonly provider: "webull";
  readonly authMode: "SIGNED_OPENAPI";
  readonly implemented: boolean;
  readonly configured: boolean;
  readonly connected: boolean;
  readonly state: WebullBrokerConnectionState;
  readonly accountCount: number;
  readonly accountTypes: readonly string[];
  readonly note: string;
  readonly checkedAt: string;
  readonly missing: readonly string[];
  readonly credentialPresence: {
    readonly appKey: boolean;
    readonly appSecret: boolean;
    readonly accessToken: boolean;
  };
  /**
   * Presence-only readiness for Webull's separate multi-user Connect API.
   * This does not imply that a redirect, callback, token vault, or trading
   * capability exists; those are separate implementation and provider gates.
   */
  readonly connectOAuth: WebullConnectOAuthReadiness;
}

export interface WebullConnectOAuthReadiness {
  readonly state: "NOT_CONFIGURED" | "CONFIGURED_NOT_IMPLEMENTED";
  readonly missing: readonly string[];
  readonly note: string;
}

/** Presence-only receipt. Credential values never leave the server. */
export function webullCredentialPresence(
  env: Readonly<Record<string, string | undefined>>,
): WebullStatus["credentialPresence"] {
  return {
    appKey: Boolean((env.WEBULL_APP_KEY || env.WEBULL_API_KEY)?.trim()),
    appSecret: Boolean((env.WEBULL_APP_SECRET || env.WEBULL_API_SECRET)?.trim()),
    accessToken: Boolean(env.WEBULL_ACCESS_TOKEN?.trim()),
  };
}

/**
 * Webull's signed OpenAPI account check and its Connect OAuth product are
 * different lanes. Keep this receipt presence-only so the UI can explain why
 * a Webull website login cannot return to WM Pro yet without leaking a client
 * identifier or secret, and without promoting configuration to connectivity.
 */
export function webullConnectOAuthReadiness(
  env: Readonly<Record<string, string | undefined>>,
): WebullConnectOAuthReadiness {
  const missing: string[] = [];
  if (!env.WEBULL_CONNECT_CLIENT_ID?.trim()) missing.push("WEBULL_CONNECT_CLIENT_ID");
  if (!env.WEBULL_CONNECT_CLIENT_SECRET?.trim()) missing.push("WEBULL_CONNECT_CLIENT_SECRET");
  if (missing.length > 0) {
    return {
      state: "NOT_CONFIGURED",
      missing,
      note: "Webull Connect OAuth is not configured. A website login cannot return an account to WM Pro until the provider-approved client registration and callback implementation exist.",
    };
  }
  return {
    state: "CONFIGURED_NOT_IMPLEMENTED",
    missing: [],
    note: "Webull Connect client credentials are present, but WM Pro has no OAuth callback, token vault, refresh, disconnect, or per-user execution flow. No redirect is initiated.",
  };
}

/** Name missing configuration edges without exposing credential values. */
export function missingSecretsForState(
  state: WebullBrokerConnectionState,
  env: Readonly<Record<string, string | undefined>>,
): readonly string[] {
  if (state !== "UNCONFIGURED") return [];

  const missing: string[] = [];
  if (!(env.WEBULL_APP_KEY || env.WEBULL_API_KEY)?.trim()) {
    missing.push("WEBULL_APP_KEY (or WEBULL_API_KEY)");
  }
  if (!(env.WEBULL_APP_SECRET || env.WEBULL_API_SECRET)?.trim()) {
    missing.push("WEBULL_APP_SECRET (or WEBULL_API_SECRET)");
  }
  return missing;
}
