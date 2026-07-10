"use client";

import { ReactNode, useEffect, useState } from "react";
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
  const publicToken = searchParams.get("publicToken");
  const {
    state,
    isPublicSharedView,
    setPublicRouteContext,
    isViewOnly,
    setProgrammePublicAccess,
    getProgrammeShareUrl,
  } = useAppData();
  const programme = state.programmes.find((record) => record.id === resolvedProgrammeId);
  const cachedSharedProgrammeName =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem(`ai-literacy-planner:public-programme-name:${resolvedProgrammeId}`)
      : null;
  const programmeName = programme?.name
    ?? cachedSharedProgrammeName
    ?? (publicToken ? "Opening shared programme..." : formatProgrammeName(resolvedProgrammeId));
  const canManageShare =
    programme?.role === "owner" &&
    !isPublicSharedView &&
    programme.id !== "sample-programme" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(programme.id);
  const viewOnly = isViewOnly(resolvedProgrammeId);
  const shareUrl = getProgrammeShareUrl(resolvedProgrammeId);
  const aiAgentUrl = programme?.aiAgentUrl?.trim() ?? "";
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    setPublicRouteContext(publicToken, publicToken ? resolvedProgrammeId : null);
  }, [publicToken, resolvedProgrammeId, setPublicRouteContext]);

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
              {aiAgentUrl ? (
                <a
                  href={aiAgentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 font-medium text-teal-700 hover:bg-teal-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 inline h-4 w-4 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                  AI Assistant
                </a>
              ) : null}
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
              {viewOnly ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-800">
                  Read-only mode
                </span>
              ) : null}
            </div>
          </div>
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
