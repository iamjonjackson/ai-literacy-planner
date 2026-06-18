"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ProgrammeTabs } from "@/components/programme-tabs";
import { ShareModal } from "@/components/share-modal";
import { formatProgrammeName } from "@/lib/programme";
import { useAppData } from "@/lib/app-data";
import { AuthGuard } from "@/components/auth-guard";

type ProgrammeShellProps = {
  programmeId: string;
  children: ReactNode;
};

export function ProgrammeShell({ programmeId, children }: ProgrammeShellProps) {
  const resolvedProgrammeId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("programme") ?? programmeId
      : programmeId;
  const { state, isOffline } = useAppData();
  const programme = state.programmes.find((record) => record.id === resolvedProgrammeId);
  const programmeName = programme?.name ?? formatProgrammeName(resolvedProgrammeId);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <AuthGuard>
      <PageShell>
        <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Programme workspace</p>
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">{programmeName}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link
                href="/dashboard"
                className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
              >
                All programmes
              </Link>
              {programme?.role === "owner" ? (
                <button
                  type="button"
                  className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 font-medium text-blue-700 hover:bg-blue-100"
                  onClick={() => setShareOpen(true)}
                >
                  Share
                </button>
              ) : null}
              <span className="rounded-full bg-slate-100 px-4 py-2 font-medium text-slate-700">
                {programme?.role ?? "owner"}
              </span>
              <span className="rounded-full bg-emerald-50 px-4 py-2 font-medium text-emerald-700">
                {isOffline ? "Offline" : "Synced"}
              </span>
            </div>
          </div>
          {programme?.role === "viewer" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              You have view-only access to this programme.
            </div>
          ) : null}
          <ProgrammeTabs programmeId={resolvedProgrammeId} />
        </div>
        {children}
      </PageShell>

      {programme ? (
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          programmeId={resolvedProgrammeId}
          programmeName={programmeName}
        />
      ) : null}
    </AuthGuard>
  );
}
