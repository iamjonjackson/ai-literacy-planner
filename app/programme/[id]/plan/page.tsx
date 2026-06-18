"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAppData } from "@/lib/app-data";

export default function PlanPage() {
  const params = useParams<{ id: string }>();
  const programmeId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("programme") ?? params.id
      : params.id;
  const {
    state,
    addModule,
    deleteModule,
    updateModule,
    updateProgrammeYears,
    getModuleDeletionImpact,
    clearModulesForYear,
    resetProgrammeModules,
  } = useAppData();
  const [draftByYear, setDraftByYear] = useState<Record<number, string>>({});


  const programme = state.programmes.find((record) => record.id === programmeId);
  const isViewer = programme?.role === "viewer";
  const modules = state.modules.filter((module) => module.programmeId === programmeId);

  const modulesByYear = useMemo(() => {
    const grouped = new Map<number, typeof modules>();
    modules.forEach((module) => {
      const list = grouped.get(module.year) ?? [];
      list.push(module);
      grouped.set(module.year, list);
    });

    for (const list of grouped.values()) {
      list.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    }

    return grouped;
  }, [modules]);

  if (!programme) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Programme not found.</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Programme structure</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Plan year and module layout</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isViewer ? (
              <>
                <button
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  type="button"
                  onClick={() => updateProgrammeYears(programmeId, programme.years + 1)}
                >
                  Add year
                </button>
                <button
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  type="button"
                  onClick={() => {
                    if (programme.years <= 1) {
                      return;
                    }

                    const modulesInLastYear = modulesByYear.get(programme.years) ?? [];
                    if (
                      modulesInLastYear.length > 0 &&
                      !window.confirm(
                        `Remove year ${programme.years}? ${modulesInLastYear.length} module${
                          modulesInLastYear.length !== 1 ? "s" : ""
                        } in that year will be removed.`,
                      )
                    ) {
                      return;
                    }

                    updateProgrammeYears(programmeId, programme.years - 1);
                  }}
                >
                  Remove year
                </button>
                <button
                  className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                  type="button"
                  onClick={() => {
                    const totalModules = modules.length;
                    if (totalModules === 0) {
                      return;
                    }

                    const impacts = modules
                      .map((module) => getModuleDeletionImpact(module.id))
                      .filter((impact) => impact !== null);
                    const deletableCount = impacts.filter((impact) => impact?.canDelete).length;
                    const skippedCount = impacts.length - deletableCount;

                    if (
                      !window.confirm(
                        `Reset structure? ${deletableCount} module${
                          deletableCount !== 1 ? "s" : ""
                        } will be deleted and ${skippedCount} protected module${
                          skippedCount !== 1 ? "s" : ""
                        } will be kept.`,
                      )
                    ) {
                      return;
                    }

                    const result = resetProgrammeModules(programmeId);
                    window.alert(
                      `${result.deletedCount} module${result.deletedCount !== 1 ? "s" : ""} deleted. ${
                        result.skippedCount
                      } skipped${result.skippedCount > 0 ? " because they have assessment ratings." : "."}`,
                    );
                  }}
                >
                  Reset structure
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {Array.from({ length: programme.years }, (_, index) => index + 1).map((year) => (
        <section key={year} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-slate-900">Year {year}</h3>
            {!isViewer ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  onClick={() => {
                    const yearModules = modulesByYear.get(year) ?? [];
                    if (yearModules.length === 0) {
                      return;
                    }

                    const impacts = yearModules
                      .map((module) => getModuleDeletionImpact(module.id))
                      .filter((impact) => impact !== null);
                    const deletableCount = impacts.filter((impact) => impact?.canDelete).length;
                    const skippedCount = impacts.length - deletableCount;

                    if (
                      !window.confirm(
                        `Clear year ${year}? ${deletableCount} module${
                          deletableCount !== 1 ? "s" : ""
                        } will be deleted and ${skippedCount} protected module${
                          skippedCount !== 1 ? "s" : ""
                        } will be kept.`,
                      )
                    ) {
                      return;
                    }

                    const result = clearModulesForYear(programmeId, year);
                    window.alert(
                      `${result.deletedCount} module${result.deletedCount !== 1 ? "s" : ""} deleted. ${
                        result.skippedCount
                      } skipped${result.skippedCount > 0 ? " because they have assessment ratings." : "."}`,
                    );
                  }}
                >
                  Clear year
                </button>
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const draft = draftByYear[year]?.trim();
                    if (!draft) {
                      return;
                    }

                    addModule(programmeId, {
                      year,
                      name: draft,
                    });

                    setDraftByYear((current) => ({ ...current, [year]: "" }));
                  }}
                >
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="New module name"
                    value={draftByYear[year] ?? ""}
                    onChange={(event) =>
                      setDraftByYear((current) => ({
                        ...current,
                        [year]: event.target.value,
                      }))
                    }
                  />
                  <button className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white" type="submit">
                    Add module
                  </button>
                </form>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(modulesByYear.get(year) ?? []).map((module) => (
              <article key={module.id} className="rounded-2xl border border-slate-200 p-4">
                <h4 className="font-semibold text-slate-900">{module.name}</h4>
                <p className="mt-1 text-xs text-slate-500">{module.code || "No code"}</p>
                <p className="mt-1 text-xs text-slate-500">Credits: {module.credits || "-"}</p>
                {!isViewer ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                      onClick={() => {
                        const name = window.prompt("Module name", module.name);
                        if (!name?.trim()) {
                          return;
                        }

                        const code = window.prompt("Module code", module.code) ?? module.code;
                        const credits = window.prompt("Credits", module.credits) ?? module.credits;
                        updateModule(module.id, { name: name.trim(), code: code.trim(), credits: credits.trim() });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
                      onClick={() => {
                        const impact = getModuleDeletionImpact(module.id);
                        if (!impact) {
                          return;
                        }

                        if (!impact.canDelete) {
                          window.alert(
                            "This module has assessments with ratings — remove the ratings first before deleting the module.",
                          );
                          return;
                        }

                        const message =
                          impact.mappedLearningOutcomeCount > 0
                            ? `This module has ${impact.mappedLearningOutcomeCount} LO${
                                impact.mappedLearningOutcomeCount !== 1 ? "s" : ""
                              } mapped to it. They will be unmapped (not deleted). Delete this module?`
                            : "Delete this module?";

                        if (window.confirm(message)) {
                          deleteModule(module.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
