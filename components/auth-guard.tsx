"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, loading, configured } = useAuth();
  const router = useRouter();
  const requireAuth = process.env.NEXT_PUBLIC_REQUIRE_AUTH === "true";
  const hasPublicToken =
    typeof window !== "undefined" &&
    Boolean(new URLSearchParams(window.location.search).get("publicToken"));

  useEffect(() => {
    if (!loading && configured && !session && !hasPublicToken) {
      router.replace("/login");
    }
  }, [loading, configured, session, hasPublicToken, router]);

  // While auth state is loading, show a minimal spinner
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // No Supabase configured → allow access in local-only mode
  if (!configured) {
    if (requireAuth) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
          <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">Authentication required</p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">Supabase is not configured</h1>
            <p className="mt-3 text-sm text-slate-600">
              Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then restart the app.
            </p>
          </div>
        </div>
      );
    }

    return <>{children}</>;
  }

  if (hasPublicToken) {
    return <>{children}</>;
  }

  // Redirect happening
  if (!session) {
    return null;
  }

  return <>{children}</>;
}
