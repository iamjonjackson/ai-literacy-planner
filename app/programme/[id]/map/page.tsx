"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { frameworkCompetencies } from "@/lib/framework";
import { useAppData } from "@/lib/app-data";

export default function MapPage() {
  const params = useParams<{ id: string }>();
  const programmeId = params.id;
  const { state, updateLearningOutcome } = useAppData();

  const modules = state.modules
    .filter((module) => module.programmeId === programmeId)
    .sort((a, b) => a.year - b.year || a.order - b.order);
  const learningOutcomes = state.learningOutcomes.filter((learningOutcome) => learningOutcome.programmeId === programmeId);

  const mapped = learningOutcomes.filter((learningOutcome) => learningOutcome.moduleId).length;
  const mappingCoverage = learningOutcomes.length ? Math.round((mapped / learningOutcomes.length) * 100) : 0;

  const outcomesByModule = useMemo(() => {
    const grouped = new Map<string, typeof learningOutcomes>();
    learningOutcomes.forEach((learningOutcome) => {
      if (!learningOutcome.moduleId) {
        return;
      }

      const list = grouped.get(learningOutcome.moduleId) ?? [];
      list.push(learningOutcome);
      grouped.set(learningOutcome.moduleId, list);
    });

    return grouped;
  }, [learningOutcomes]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Mapping coverage</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {mapped} of {learningOutcomes.length} LOs mapped to modules
              </h2>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{mappingCoverage}%</p>
          </div>
          <div className="mt-4 h-3 rounded-full bg-slate-200">
            <div
              className={`h-3 rounded-full ${mappingCoverage === 100 ? "bg-emerald-500" : "bg-blue-600"}`}
              style={{ width: `${mappingCoverage}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {modules.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              No modules yet. Add modules in the Plan tab first.
            </div>
          ) : (
            modules.map((module) => (
              <article key={module.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Year {module.year}</p>
                    <h3 className="text-lg font-semibold text-slate-900">{module.name}</h3>
                    <p className="text-sm text-slate-500">{module.code || "No code"}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {(outcomesByModule.get(module.id) ?? []).length} LOs
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(outcomesByModule.get(module.id) ?? []).map((learningOutcome) => {
                    const competency = frameworkCompetencies.find(
                      (record) => record.id === learningOutcome.competencyId,
                    );

                    return (
                      <span key={learningOutcome.id} className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                        {competency?.id ?? "Imported"}: {learningOutcome.text.slice(0, 80)}
                      </span>
                    );
                  })}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Learning outcomes</h3>
        <p className="mt-2 text-sm text-slate-600">Assign each LO to exactly one module.</p>
        <div className="mt-4 space-y-3">
          {learningOutcomes.length === 0 ? (
            <p className="text-sm text-slate-500">No learning outcomes yet.</p>
          ) : (
            learningOutcomes.map((learningOutcome) => {
              const competency = frameworkCompetencies.find((record) => record.id === learningOutcome.competencyId);

              return (
                <article key={learningOutcome.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {competency?.id ?? "Imported LO"}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{learningOutcome.text}</p>
                  <div className="mt-3 flex gap-2">
                    <select
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      value={learningOutcome.moduleId ?? ""}
                      onChange={(event) => {
                        updateLearningOutcome(learningOutcome.id, {
                          moduleId: event.target.value || null,
                        });
                      }}
                    >
                      <option value="">Unmapped</option>
                      {modules.map((module) => (
                        <option key={module.id} value={module.id}>
                          Year {module.year} · {module.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                      onClick={() => updateLearningOutcome(learningOutcome.id, { moduleId: null })}
                      type="button"
                    >
                      Clear
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
