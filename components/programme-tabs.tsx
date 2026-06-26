"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { frameworkCompetencies } from "@/lib/framework";
import { buildProgrammeRoute, demoProgrammeId, programmeTabs } from "@/lib/programme";
import { useAppData } from "@/lib/app-data";

type ProgrammeTabsProps = {
  programmeId: string;
};

export function ProgrammeTabs({ programmeId }: ProgrammeTabsProps) {
  const pathname = usePathname();
  const { state } = useAppData();
  const coveredCompetencies = new Set(
    state.learningOutcomes
      .filter((learningOutcome) => learningOutcome.programmeId === programmeId && learningOutcome.competencyId)
      .map((learningOutcome) => learningOutcome.competencyId),
  );
  const designIncomplete = coveredCompetencies.size < frameworkCompetencies.length;

  return (
    <nav aria-label="Programme tabs" className="flex flex-wrap gap-2">
      {programmeTabs.map((tab) => {
        const href = buildProgrammeRoute(programmeId, tab.slug);
        const activePath = `/programme/${demoProgrammeId}/${tab.slug}`;
        const isActive = pathname === activePath || pathname === `${activePath}/`;

        return (
          <Link
            key={tab.slug}
            href={href}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            <span className={`flex items-center gap-2 ${isActive ? "text-white" : ""}`}>
              <span>{tab.label}</span>
              {tab.slug === "design" && designIncomplete && !isActive ? (
                <span
                  aria-label="Design tab incomplete"
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700"
                  title="Some competencies still have no learning outcomes."
                >
                  !
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
