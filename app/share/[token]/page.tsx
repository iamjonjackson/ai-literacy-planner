"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { buildProgrammeRoute } from "@/lib/programme";

export default function ShareTokenPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const supabase = getSupabaseClient();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token || !supabase) {
      return;
    }

    supabase
      .from("programmes")
      .select("id, name")
      .eq("public_access_enabled", true)
      .eq("public_access_token", token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data?.id) {
          setErrorMessage("This shared link is invalid or no longer active.");
          return;
        }

        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("ai-literacy-planner:public-token", token);
          if (typeof data.name === "string" && data.name.trim()) {
            window.sessionStorage.setItem(
              `ai-literacy-planner:public-programme-name:${data.id}`,
              data.name,
            );
          }
        }

        const nextUrl = buildProgrammeRoute(data.id, "explore", { publicToken: token });
        router.replace(nextUrl);
      });
  }, [token, supabase, router]);

  const blockingError = !token
    ? "Missing share token."
    : !supabase
      ? "Supabase is not configured."
      : errorMessage;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {!blockingError ? (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm text-slate-600">Opening shared programme…</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-red-700">Unable to open shared link</p>
            <p className="mt-2 text-sm text-slate-600">{blockingError}</p>
          </>
        )}
      </div>
    </main>
  );
}
