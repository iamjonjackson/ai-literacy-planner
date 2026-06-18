"use client";

import Link from "next/link";
import { useAppData } from "@/lib/app-data";
import { useAuth } from "@/lib/auth";

export function SiteHeader() {
  const { isOffline, syncState, pendingCount } = useAppData();
  const { user, session, signOut } = useAuth();

  const syncLabel =
    isOffline || syncState === "offline"
      ? `Offline${pendingCount > 0 ? ` · ${pendingCount} pending` : ""}`
      : syncState === "syncing"
        ? "Syncing…"
        : "Synced";

  const syncClass =
    isOffline || syncState === "offline"
      ? "bg-amber-100 text-amber-700"
      : syncState === "syncing"
        ? "bg-blue-100 text-blue-700"
        : "bg-emerald-100 text-emerald-700";

  return (
    <header className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <Link href="/dashboard" className="text-lg font-semibold text-slate-900">
            AI Literacy Programme Redesign Tool
          </Link>
          <p className="text-sm text-slate-600">AI literacy planning workspace.</p>
        </div>
        <nav className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <span
            title={
              isOffline
                ? "No network connection. Changes are saved locally."
                : syncState === "syncing"
                  ? "Syncing changes to server…"
                  : "All changes saved."
            }
            className={`rounded-full px-3 py-2 text-xs font-semibold ${syncClass}`}
          >
            {syncLabel}
          </span>
          {session ? (
            <>
              <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 truncate max-w-40">
                {user?.email}
              </span>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => signOut()}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link className="rounded-full px-3 py-2 hover:bg-slate-100" href="/login">
              Login
            </Link>
          )}
          <Link className="rounded-full bg-blue-200 px-4 py-2 text-white hover:bg-blue-300" href="/dashboard">
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
