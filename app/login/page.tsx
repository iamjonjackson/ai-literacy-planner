"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { configured, session, loading } = useAuth();
  const { signInWithMagicLink, signInWithPassword } = useAuth();
  const requireAuth = process.env.NEXT_PUBLIC_REQUIRE_AUTH === "true";
  const devLoginEmail = process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? "";
  const devLoginPassword = process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD ?? "";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDevLoginLoading, setIsDevLoginLoading] = useState(false);
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  // Already signed in → redirect
  if (!loading && session) {
    router.replace("/dashboard");
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || status === "sending") {
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    const { error } = await signInWithMagicLink(normalizedEmail);

    if (error) {
      setStatus("error");
      setErrorMessage(error);
    } else {
      setStatus("sent");
    }
  };

  const handleDevLogin = async () => {
    if (!devLoginEmail || !devLoginPassword || isDevLoginLoading) {
      return;
    }

    setIsDevLoginLoading(true);
    setErrorMessage("");

    const { error } = await signInWithPassword(devLoginEmail, devLoginPassword);
    if (error) {
      setStatus("error");
      setErrorMessage(error);
    } else {
      router.replace("/dashboard");
    }

    setIsDevLoginLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Passwordless sign-in</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Send a magic link</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Enter your email and continue to your dashboard.</p>
        {!configured && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {requireAuth
              ? "Supabase is not configured. Authentication is required before this app can be accessed."
              : "Supabase is not configured — running in local-only mode."}{" "}
            {!requireAuth ? (
              <a href="/dashboard" className="font-semibold underline">Continue to dashboard →</a>
            ) : null}
          </p>
        )}
        {status !== "sent" ? (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder=""
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-600"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={status === "sending"}
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
          </form>
        ) : null}
        {configured && isLocalhost && devLoginEmail && devLoginPassword ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Local Development</p>
            <button
              type="button"
              onClick={handleDevLogin}
              disabled={isDevLoginLoading}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              {isDevLoginLoading ? "Signing in…" : "Quick dev login"}
            </button>
          </div>
        ) : null}
        {status === "sent" ? (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Check your email — we&apos;ve sent you a login link.
          </p>
        ) : null}
        {status === "error" ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
        ) : null}
      </div>
    </main>
  );
}
