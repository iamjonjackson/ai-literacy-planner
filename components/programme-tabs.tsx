"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildProgrammeRoute, programmeTabs } from "@/lib/programme";

type ProgrammeTabsProps = {
  programmeId: string;
};

export function ProgrammeTabs({ programmeId }: ProgrammeTabsProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Programme tabs" className="flex flex-wrap gap-2">
      {programmeTabs.map((tab) => {
        const href = buildProgrammeRoute(programmeId, tab.slug);
        const isActive = pathname === href || pathname === `${href}/`;

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
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
