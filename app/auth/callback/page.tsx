"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      router.replace("/dashboard");
      return;
    }

    // Supabase auth with PKCE flow — handle token_hash from query params
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");

    if (tokenHash && type) {
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: type as "email" | "recovery" | "invite" })
        .then(({ error }) => {
          if (error) {
            setStatus("error");
            setMessage(error.message);
          } else {
            setStatus("success");
            router.replace("/dashboard");
          }
        });
      return;
    }

    // Fallback: detect session from URL hash (legacy implicit flow)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus("success");
        router.replace("/dashboard");
      } else {
        setStatus("error");
        setMessage("No valid session found. Please request a new login link.");
      }
    });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm text-slate-600">Signing you in…</p>
          </>
        )}
        {status === "success" && (
          <p className="text-sm text-emerald-700">Signed in successfully. Redirecting…</p>
        )}
        {status === "error" && (
          <>
            <p className="text-sm font-semibold text-red-700">Sign-in failed</p>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
            <a
              href="/login"
              className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to login
            </a>
          </>
        )}
      </div>
    </main>
  );
}
