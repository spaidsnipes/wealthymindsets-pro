"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    setAccessToken(hash.get("access_token") ?? "");
    if (hash.get("error_description")) setMessage(hash.get("error_description") ?? "");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return setMessage("This recovery link is missing or expired. Request a new one.");
    if (password.length < 8) return setMessage("Password must be at least 8 characters.");
    if (password !== confirm) return setMessage("Passwords do not match.");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return setMessage("Password recovery is not configured.");

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.message ?? body?.msg ?? "Unable to update password.");
      setMessage("Password updated. You can now sign in.");
      setPassword("");
      setConfirm("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update password.");
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
        <form onSubmit={submit} className="mt-7 space-y-4">
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 outline-none focus:border-[#E8B923]/60"
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 outline-none focus:border-[#E8B923]/60"
          />
          <button
            disabled={saving}
            className="w-full rounded-xl bg-[#E8B923] px-4 py-3 font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Updating…" : "Update password"}
          </button>
        </form>
        {message && <p className="mt-4 text-sm text-white/70" role="status">{message}</p>}
        <Link href="/login" className="mt-6 inline-block text-sm text-[#E8B923] hover:underline">Return to sign in</Link>
      </section>
    </main>
  );
}
