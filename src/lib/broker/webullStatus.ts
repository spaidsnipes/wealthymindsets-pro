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
