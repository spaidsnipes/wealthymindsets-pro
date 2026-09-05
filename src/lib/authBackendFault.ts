/**
 * authBackendFault — the single answer to "a call to the auth backend threw, so
 * what is the caller allowed to be told?"
 *
 * A throw from one of the Supabase auth helpers means no response was ever read.
 * That is a fact about the SERVICE on this host, and it is the same fact for
 * every visitor, so naming it leaks nothing about any account. What it must
 * never be reported as is a fact about the person: on 2026-09-05 a host whose
 * NEXT_PUBLIC_SUPABASE_URL held a publishable key instead of a project URL told
 * one user their password was wrong and another that their emailed code had
 * expired. Both were correct. Both went looking for a mistake they had not made.
 *
 * Exactly one thrown value carries a message safe to repeat verbatim:
 * SupabaseAuthShapeError, whose text is built from a request's origin, status
 * and content-type and never from a header or a response body. Everything else
 * contributes its class name only — a bare `TypeError: Invalid URL: sb_…` would
 * otherwise hand the misconfigured secret straight back to an anonymous caller.
 */

import { SupabaseAuthShapeError } from "./supabaseConfigStatus";

export type AuthBackendEdge = "AUTH BACKEND MISDIRECTED" | "AUTH BACKEND UNREACHABLE";

export interface AuthBackendFault {
  readonly httpStatus: 503;
  readonly body: { readonly error: string; readonly edge: AuthBackendEdge };
}

/**
 * @param action how to name the attempt in the sentence the visitor reads —
 *   "Sign-up", "Account verification". Capitalised; it opens the message.
 */
export function classifyAuthBackendFault(action: string, error: unknown): AuthBackendFault {
  if (error instanceof SupabaseAuthShapeError) {
    return {
      httpStatus: 503,
      body: { error: `${action} failed: ${error.message}`, edge: "AUTH BACKEND MISDIRECTED" },
    };
  }
  const cls = error instanceof Error ? error.name : "Error";
  return {
    httpStatus: 503,
    body: {
      error: `${action} could not complete a request to the auth backend (${cls}). The request threw before a response was read, which means the backend was unreachable from this host or a Supabase env var is present but unusable.`,
      edge: "AUTH BACKEND UNREACHABLE",
    },
  };
}
