"use client";

import { ReactNode, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const resolvedProgrammeId = searchParams.get("programme") ?? programmeId;
  const {
    state,
    isPublicSharedView,
    isViewOnly,
    setProgrammePublicAccess,
    getProgrammeShareUrl,
  } = useAppData();
  const programme = state.programmes.find((record) => record.id === resolvedProgrammeId);
  const programmeName = programme?.name ?? formatProgrammeName(resolvedProgrammeId);
  const canManageShare =
    programme?.role === "owner" &&
    !isPublicSharedView &&
    programme.id !== "sample-programme" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(programme.id);
  const viewOnly = isViewOnly(resolvedProgrammeId);
  const shareUrl = getProgrammeShareUrl(resolvedProgrammeId);
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
              {canManageShare ? (
                <button
                  type="button"
                  className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 font-medium text-blue-700 hover:bg-blue-100"
                  onClick={() => setShareOpen(true)}
                >
                  Share
                </button>
              ) : null}
              <span className="rounded-full bg-slate-100 px-4 py-2 font-medium text-slate-700">
                {viewOnly ? "viewer" : programme?.role ?? "owner"}
              </span>
            </div>
          </div>
          {viewOnly ? (
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
          canManagePublic={canManageShare}
          isPublicEnabled={Boolean(programme.publicAccessEnabled)}
          shareUrl={shareUrl}
          onTogglePublic={(enabled) => setProgrammePublicAccess(resolvedProgrammeId, enabled)}
        />
      ) : null}
    </AuthGuard>
  );
}
