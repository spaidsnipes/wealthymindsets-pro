"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { authFailureMessage, authLinkErrorMessage } from "@/lib/auth/authLinkError";

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  // Read once the hash has been looked at — before that, nothing is known.
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // Only ever SET from the fragment, never cleared by its absence: the hash
    // is stripped just below, and an effect that runs again (React dev double
    // invoke, a remount) must not erase the token it already read.
    const token = hash.get("access_token");
    if (token) setAccessToken(token);
    if (hash.get("error_description")) setMessage(authLinkErrorMessage(hash.get("error_description")));
    setChecked(true);
    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return setMessage("This recovery link is missing or expired. Request a new one.");
    if (password.length < 8) return setMessage("Password must be at least 8 characters.");
    if (password !== confirm) return setMessage("Passwords do not match.");

    setSaving(true);
    setMessage("");
    try {
      // Server-side (2026-10-03): the browser bundle carries no account-service
      // settings, so the old in-browser call always said "not configured".
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error ?? "Unable to update password.");
      setMessage("Password updated. You can now sign in.");
      setPassword("");
      setConfirm("");
    } catch (error) {
      setMessage(authFailureMessage(error, "Unable to update password."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#08090b] text-white grid place-items-center px-4">
      <section className="w-full max-w-md rounded-3xl border border-[#E8B923]/25 bg-white/[0.04] p-7 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.28em] text-[#E8B923]">WealthyMindsets Pro</p>
        <h1 className="mt-3 text-3xl font-semibold">Choose a new password</h1>
        <p className="mt-2 text-sm text-white/55">Use at least 8 characters and keep it unique to this account.</p>
        {/* Arrived without a recovery link (2026-10-04): the form used to wait
            for two typed passwords before saying the link was missing. */}
        {checked && !accessToken ? (
          <div role="status" className="mt-7 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
            {message || "This page opens from the reset link in your email, and this visit carried none — it may have expired or been opened in another browser."}
            <Link href="/login?mode=forgot" className="mt-3 flex min-h-11 items-center font-semibold text-[#E8B923] hover:underline">Send me a new reset link →</Link>
          </div>
        ) : (
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block space-y-2 text-sm text-white/70">
            <span>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-base text-white outline-none focus:border-[#E8B923]/60"
            />
          </label>
          <label className="block space-y-2 text-sm text-white/70">
            <span>Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Confirm new password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-base text-white outline-none focus:border-[#E8B923]/60"
            />
          </label>
          <button
            disabled={saving}
            className="w-full rounded-xl bg-[#E8B923] px-4 py-3 font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Updating…" : "Update password"}
          </button>
        </form>
        )}
        {/* Inputs are text-base (16px): they inherited the label's 14px, and
            iOS zooms the page into any field under 16px on focus. The message
            prints once — the no-link box above already shows it. */}
        {message && accessToken && <p className="mt-4 text-sm text-white/70" role="status">{message}</p>}
        {/* MEASURED 105.5x20 at 375px on production 2026-09-08 — under the 44px
            floor, on the password-recovery path, where it is the only way back.
            The TEXT stays `text-sm`; the TARGET is what grows. */}
        <Link href="/login" className="mt-6 inline-flex min-h-11 items-center text-sm text-[#E8B923] hover:underline">Return to sign in</Link>
      </section>
    </main>
  );
}
