"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAppData } from "@/lib/app-data";

function MapPageContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const programmeId = searchParams.get("programme") ?? params.id;
  const { state, updateLearningOutcome } = useAppData();


  const modules = state.modules
    .filter((module) => module.programmeId === programmeId)
    .sort((a, b) => a.year - b.year || a.order - b.order);
  const programme = state.programmes.find((record) => record.id === programmeId);
  const isViewer = programme?.role === "viewer";
  const learningOutcomes = state.learningOutcomes.filter((learningOutcome) => learningOutcome.programmeId === programmeId);

  const compareLearningOutcomes = (
    a: { loNumber?: string; text: string; id: string; category?: string },
    b: { loNumber?: string; text: string; id: string; category?: string },
  ) => {
    const loA = a.loNumber ?? "";
    const loB = b.loNumber ?? "";
    const loNumberDiff = loA.localeCompare(loB, undefined, { numeric: true, sensitivity: "base" });
    if (loNumberDiff !== 0) return loNumberDiff;

    const categoryDiff = (a.category ?? "").localeCompare(b.category ?? "", undefined, {
      sensitivity: "base",
    });
    if (categoryDiff !== 0) return categoryDiff;

    const textDiff = a.text.localeCompare(b.text, undefined, { sensitivity: "base" });
    if (textDiff !== 0) return textDiff;

    return a.id.localeCompare(b.id);
  };

  const newLearningOutcomes = learningOutcomes.filter((learningOutcome) => learningOutcome.competencyId);
  const activeNewLearningOutcomes = newLearningOutcomes.filter(
    (learningOutcome) => learningOutcome.status !== "to_delete",
  );

  const mapped = activeNewLearningOutcomes.filter((learningOutcome) => learningOutcome.moduleId).length;
  const mappingCoverage = activeNewLearningOutcomes.length
    ? Math.round((mapped / activeNewLearningOutcomes.length) * 100)
    : 0;

  const outcomesByModule = new Map<string, typeof learningOutcomes>();
  learningOutcomes.forEach((learningOutcome) => {
    if (!learningOutcome.moduleId) {
      return;
    }

    const list = outcomesByModule.get(learningOutcome.moduleId) ?? [];
    outcomesByModule.set(learningOutcome.moduleId, [...list, learningOutcome]);
  });
  outcomesByModule.forEach((list, moduleId) => {
    outcomesByModule.set(moduleId, [...list].sort(compareLearningOutcomes));
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_460px]">
      <section className="space-y-6">
        <div className="sticky -top-4 z-20 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Mapping coverage</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {mapped} of {activeNewLearningOutcomes.length} new LOs mapped to modules
              </h2>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{mappingCoverage}%</p>
          </div>
          <div className="my-4 h-3 rounded-full bg-slate-200">
            <div
              className={`h-3 rounded-full ${mappingCoverage === 100 ? "bg-emerald-500" : "bg-blue-600"}`}
              style={{ width: `${mappingCoverage}%` }}
            />
          </div>
          <p className="text-sm text-slate-600">
            {modules.length} module{modules.length !== 1 ? "s" : ""} in this programme under review
          </p>
        </div>
        
        <div className="space-y-4">
          {modules.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              No modules yet. Setup modules in the Plan tab.
            </div>
          ) : (
              <>
                {Array.from(new Set(modules.map((m) => m.year))).map((year) => (
                  <div key={year} className="space-y-3">
                    <h2 className="text-lg font-semibold text-slate-900">Year {year}</h2>
                    <div className="grid gap-4">
                      {modules
                        .filter((module) => module.year === year)
                        .sort((a, b) => a.order - b.order)
                        .map((module) => (
                          <article key={module.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ">
                            <div className="flex items-start justify-between gap-3 ">
                              <div>

                                {module.url ? (
                                  <a
                                    href={module.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-lg font-semibold hover:!underline"
                                  >
                                    {module.code} {module.name}
                                  </a>
                                ) : (
                                  <h3 className="text-lg font-semibold text-slate-900">{module.code} {module.name}</h3>
                                )}

                              </div>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                {(outcomesByModule.get(module.id) ?? []).filter((learningOutcome) => learningOutcome.status !== "to_delete").length} LOs
                              </span>
                            </div>
                            <div className="mt-3 grid gap-4 lg:grid-cols-2">
                              {(outcomesByModule.get(module.id) ?? []).map((learningOutcome) => {
                                const isMarkedForDeletion = learningOutcome.status === "to_delete";
                
                                return (
                                  <span
                                    key={learningOutcome.id}
                                    className={`text-xs rounded-xl border p-3 ${
                                      isMarkedForDeletion
                                        ? "border-amber-300 bg-amber-50"
                                        : learningOutcome.competencyId
                                          ? "border-green-500 bg-green-50"
                                          : "border-slate-200 text-blue-700"
                                    }`}
                                  >
                                    {/* {competency?.id ?? "Imported"}:  */}
                                    {learningOutcome.category ? `(${learningOutcome.category}) ` : ""}
                                    {/* {learningOutcome.loNumber ? `${learningOutcome.loNumber}. ` : ""} */}
                                    {learningOutcome.text}
                                    {!isViewer ? (
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {isMarkedForDeletion ? (
                                          <>
                                            <span className="rounded-full bg-amber-200 inline-block px-2 py-1 m-0 text-xs font-semibold text-amber-800">
                                              For deletion
                                            </span>
                                            <button
                                              type="button"
                                              className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700"
                                              onClick={() =>
                                                updateLearningOutcome(learningOutcome.id, { status: undefined })
                                              }
                                            >
                                              Restore
                                            </button>
                                          </>
                                          // if does not have a mapped competency, allow mark for deletion

                                        ) : learningOutcome.competencyId ? null : (
                                          <button
                                            type="button"
                                            className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700"
                                            onClick={() =>
                                              updateLearningOutcome(learningOutcome.id, { status: "to_delete" })
                                            }
                                          >
                                            Mark for deletion
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <>
                                        {isMarkedForDeletion ? (
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            <span className="mt-2 inline-block rounded-full bg-amber-200 px-2 py-1 m-0 text-xs font-semibold text-amber-800">
                                              For deletion
                                            </span>
                                          </div>
                                        ) : null}
                                      </>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </article>
                        ))}
                    </div>
                  </div>
                ))}
              </>
            )
          }
        </div>
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:-top-4 xl:self-start xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto">
        <h3 className="text-lg font-semibold text-slate-900">New Learning Outcomes</h3>
        <p className="mt-2 text-sm text-slate-600">Assign each LO to a module.</p>
        <div className="mt-4 space-y-3">
          {newLearningOutcomes.length === 0 ? (
            <p className="text-sm text-slate-500">No learning outcomes yet.</p>
          ) : (
            [...newLearningOutcomes].sort(compareLearningOutcomes).map((learningOutcome) => {
              // const competency = frameworkCompetencies.find((record) => record.id === learningOutcome.competencyId);

              return (
                <article
                  key={learningOutcome.id}
                  className={`rounded-xl border p-3 ${
                    learningOutcome.moduleId ? "border-green-500 bg-green-50" : "border-slate-200"
                  }`}
                >
                  {/* <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {competency?.id ?? "Imported LO"}
                  </p> */}
                  <p className="mt-1 text-sm text-slate-700">({learningOutcome.category}) {learningOutcome.text}</p>
                  <div className="mt-3 flex gap-2">
                    <select
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      value={learningOutcome.moduleId ?? ""}
                      disabled={isViewer}
                      onChange={(event) => {
                        updateLearningOutcome(learningOutcome.id, {
                          moduleId: event.target.value || null,
                        });
                      }}
                    >
                      <option value="">Unmapped</option>
                      {modules.map((module) => (
                        <option key={module.id} value={module.id}>
                          Year {module.year} · {module.code} {module.name.slice(0, 25)}{module.name.length > 25 ? "…" : ""}
                        </option>
                      ))}
                    </select>
                    {!isViewer ? (
                      <button
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                        onClick={() => updateLearningOutcome(learningOutcome.id, { moduleId: null })}
                        type="button"
                      >
                        Clear
                      </button>
                    ) : null}
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

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapPageContent />
    </Suspense>
  );
}
