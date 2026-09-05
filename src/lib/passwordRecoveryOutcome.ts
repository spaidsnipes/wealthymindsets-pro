/**
 * passwordRecoveryOutcome — decides what a password-recovery attempt is allowed
 * to tell the caller.
 *
 * Two rules pull in opposite directions and both have to hold.
 *
 * ENUMERATION PROTECTION. Whether an address has an account is not an anonymous
 * caller's business, so the answer must not vary with it. GoTrue already holds
 * that line at its own boundary: `/auth/v1/recover` answers 2xx for a registered
 * address and 2xx for an unknown one. Nothing here may reintroduce the
 * difference.
 *
 * HONESTY. The route this serves used to answer `{ok:true}` unconditionally — it
 * swallowed every throw and ignored the status. On 2026-09-05, with
 * NEXT_PUBLIC_SUPABASE_URL holding a value that was not a Supabase URL at all,
 * that meant a locked-out user was sent to wait on an email that was never sent
 * and never would be. Concealing a service outage is not enumeration protection;
 * it is a lie told to the one person entitled to the truth.
 *
 * The two are compatible because a rejection from `/recover` is never "no such
 * user" — it is a rejected key, or a backend that is not there. Those describe
 * the SERVICE, which is the same for every address, so naming them leaks
 * nothing. The response body is never read into a message: the vocabulary below
 * is built from the status alone.
 */

import { SupabaseAuthShapeError } from "./supabaseConfigStatus";

export type PasswordRecoveryEdge =
  | "RECOVERY NOT SENT"
  | "AUTH BACKEND MISDIRECTED"
  | "AUTH BACKEND UNREACHABLE";

/** What was actually observed of the recovery request — answered, or threw. */
export type RecoveryObservation =
  | { readonly kind: "ANSWERED"; readonly status: number }
  | { readonly kind: "THREW"; readonly error: unknown };

export interface PasswordRecoveryOutcome {
  readonly httpStatus: number;
  readonly body:
    | { readonly ok: true }
    | { readonly error: string; readonly edge: PasswordRecoveryEdge };
}

/**
 * One shared value, so every accepting branch is answered with a byte-identical
 * response and no caller can tell them apart.
 */
const ACCEPTED: PasswordRecoveryOutcome = { httpStatus: 200, body: { ok: true } };

export function classifyPasswordRecovery(observation: RecoveryObservation): PasswordRecoveryOutcome {
  if (observation.kind === "THREW") {
    if (observation.error instanceof SupabaseAuthShapeError) {
      return {
        httpStatus: 503,
        body: {
          error: `Password recovery could not be sent — a fault in the service on this host, not a statement about the address that was entered. ${observation.error.message}`,
          edge: "AUTH BACKEND MISDIRECTED",
        },
      };
    }
    const cls = observation.error instanceof Error ? observation.error.name : "Error";
    return {
      httpStatus: 503,
      body: {
        error: `Password recovery could not reach the account service (${cls}), so no email was sent. The request threw before any response was read, which means the service was unreachable from this host or a Supabase environment variable is present but unusable. This is a fault in the service on this host, not a statement about the address that was entered.`,
        edge: "AUTH BACKEND UNREACHABLE",
      },
    };
  }

  const { status } = observation;
  if (status >= 200 && status < 300) return ACCEPTED;

  // 429 is folded into the accepted answer ON PURPOSE. GoTrue's send-frequency
  // limit is keyed on the last email sent TO THIS ADDRESS, which can only have
  // happened for an address that has an account. Reporting it distinctly would
  // hand an anonymous caller a two-request oracle for "is this person
  // registered" — precisely the disclosure the generic response exists to
  // prevent. It is also the cheapest status to fold in: in its dominant cause a
  // recovery email really was sent to this address moments ago, so pointing the
  // reader at their inbox stays true.
  if (status === 429) return ACCEPTED;

  return {
    httpStatus: 503,
    body: {
      error: `The account service rejected the password-recovery request (HTTP ${status}), so no email was sent. This is a fault in the service on this host, not a statement about the address that was entered. If it persists, the host's Supabase configuration needs attention.`,
      edge: "RECOVERY NOT SENT",
    },
  };
}
