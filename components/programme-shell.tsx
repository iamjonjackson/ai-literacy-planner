import { ReactNode } from "react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ProgrammeTabs } from "@/components/programme-tabs";
import { formatProgrammeName } from "@/lib/programme";

type ProgrammeShellProps = {
  programmeId: string;
  children: ReactNode;
};

export function ProgrammeShell({ programmeId, children }: ProgrammeShellProps) {
  const programmeName = formatProgrammeName(programmeId);

  return (
    <PageShell>
      <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">
              Programme workspace
            </p>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">{programmeName}</h1>
              <p className="text-sm text-slate-600">
                Starter shell for the UNESCO AI competency planning workflow.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/dashboard"
              className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              All programmes
            </Link>
            <span className="rounded-full bg-emerald-50 px-4 py-2 font-medium text-emerald-700">
              Synced
            </span>
          </div>
        </div>
        <ProgrammeTabs programmeId={programmeId} />
      </div>
      {children}
    </PageShell>
  );
}
