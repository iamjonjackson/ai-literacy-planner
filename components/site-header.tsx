"use client";

import Link from "next/link";
import { useAppData } from "@/lib/app-data";

export function SiteHeader() {
  const { isOffline } = useAppData();

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
            className={`rounded-full px-3 py-2 text-xs font-semibold ${
              isOffline ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isOffline ? "Offline" : "Synced"}
          </span>
          <Link className="rounded-full px-3 py-2 hover:bg-slate-100" href="/login">
            Login
          </Link>
          <Link className="rounded-full bg-blue-200 px-4 py-2 text-white hover:bg-blue-300" href="/dashboard">
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
