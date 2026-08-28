"use client";

import { Suspense, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAppData } from "@/lib/app-data";
import { frameworkCompetencies } from "@/lib/framework";
import { ConfirmModal } from "@/components/modal";
import { EditLoModal, type EditLoState } from "@/components/edit-lo-modal";

const loCategories = ["Disciplinary Skills", "Academic Content", "Attributes"] as const;

function MapPageContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const programmeId = searchParams.get("programme") ?? params.id;
  const { state, updateLearningOutcome, addLearningOutcome, deleteLearningOutcome } = useAppData();
  const [openAddFormForModuleId, setOpenAddFormForModuleId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { text: string; category: (typeof loCategories)[number]; competencyId: string | null }>>({});
  const [deleteLoState, setDeleteLoState] = useState<{ open: boolean; id: string }>({ open: false, id: "" });
  const [editLoState, setEditLoState] = useState<EditLoState>({ open: false, loId: "", text: "", category: loCategories[0], competencyId: null });
  const [currentLoStatus, setCurrentLoStatus] = useState<string | undefined>(undefined);

  const modules = state.modules
    .filter((module) => module.programmeId === programmeId)
    .sort((a, b) => a.year - b.year || a.order - b.order);
  const programme = state.programmes.find((record) => record.id === programmeId);
  const isViewer = programme?.role === "viewer";
  const learningOutcomes = state.learningOutcomes.filter((learningOutcome) => learningOutcome.programmeId === programmeId);

  const compareLearningOutcomes = (
    a: { loNumber?: string; text: string; id: string; category?: string; updatedAt?: string },
    b: { loNumber?: string; text: string; id: string; category?: string; updatedAt?: string },
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

    const updatedAtA = a.updatedAt ?? "";
    const updatedAtB = b.updatedAt ?? "";
    const updatedAtDiff = updatedAtA.localeCompare(updatedAtB);
    if (updatedAtDiff !== 0) return updatedAtDiff;

    return a.id.localeCompare(b.id);
  };

  const compareLearningOutcomesStable = (
    a: { loNumber?: string; text: string; id: string; category?: string },
    b: { loNumber?: string; text: string; id: string; category?: string },
  ) => {
    const hasANumber = !!a.loNumber;
    const hasBNumber = !!b.loNumber;
    
    if (hasANumber !== hasBNumber) {
      return hasANumber ? -1 : 1;
    }
    
    const loA = a.loNumber ?? "";
    const loB = b.loNumber ?? "";
    const loNumberDiff = loA.localeCompare(loB, undefined, { numeric: true, sensitivity: "base" });
    if (loNumberDiff !== 0) return loNumberDiff;

    const categoryDiff = (a.category ?? "").localeCompare(b.category ?? "", undefined, {
      sensitivity: "base",
    });
    if (categoryDiff !== 0) return categoryDiff;

    return a.id.localeCompare(b.id);
  };

  const newLearningOutcomes = learningOutcomes.filter((learningOutcome) => learningOutcome.competencyId);
  const activeNewLearningOutcomes = newLearningOutcomes.filter(
    (learningOutcome) => learningOutcome.status !== "to_delete",
  );

  const coveredCompetencies = new Set(
    learningOutcomes.filter((learningOutcome) => learningOutcome.competencyId).map((learningOutcome) => learningOutcome.competencyId),
  );
  const competencyCoverage = Math.round((coveredCompetencies.size / frameworkCompetencies.length) * 100);

  const mapped = activeNewLearningOutcomes.filter((learningOutcome) => learningOutcome.moduleId).length;
  const mappingCoverage = activeNewLearningOutcomes.length
    ? Math.round((mapped / activeNewLearningOutcomes.length) * 100)
    : 0;
  
  const hasUnmappedLOs = activeNewLearningOutcomes.some((lo) => !lo.moduleId);

  const outcomesByModule = new Map<string, typeof learningOutcomes>();
  learningOutcomes.forEach((learningOutcome) => {
    if (!learningOutcome.moduleId) {
      return;
    }

    const list = outcomesByModule.get(learningOutcome.moduleId) ?? [];
    outcomesByModule.set(learningOutcome.moduleId, [...list, learningOutcome]);
  });
  outcomesByModule.forEach((list, moduleId) => {
    outcomesByModule.set(moduleId, [...list].sort(compareLearningOutcomesStable));
  });

  const handleEditLo = (loId: string, text: string, category?: string, competencyId?: string | null, status?: string) => {
    setEditLoState({
      open: true,
      loId,
      text,
      category: loCategories.includes(category as (typeof loCategories)[number])
        ? (category as (typeof loCategories)[number])
        : loCategories[0],
      competencyId: competencyId ?? null,
    });
    setCurrentLoStatus(status);
  };

  const handleEditSave = (loId: string, text: string, category: (typeof loCategories)[number], competencyId: string | null) => {
    if (text.trim().length < 10) return;
    updateLearningOutcome(loId, { text: text.trim(), category, competencyId });
    setEditLoState({ open: false, loId: "", text: "", category: loCategories[0], competencyId: null });
    setCurrentLoStatus(undefined);
  };

  const handleMarkForDeletion = (loId: string) => {
    updateLearningOutcome(loId, { status: "to_delete" });
    setEditLoState({ open: false, loId: "", text: "", category: loCategories[0], competencyId: null });
    setCurrentLoStatus(undefined);
  };

  const handleRestore = (loId: string) => {
    updateLearningOutcome(loId, { status: undefined });
    setEditLoState({ open: false, loId: "", text: "", category: loCategories[0], competencyId: null });
    setCurrentLoStatus(undefined);
  };

  const handleDeleteFromModal = (loId: string) => {
    setDeleteLoState({ open: true, id: loId });
    setEditLoState({ open: false, loId: "", text: "", category: loCategories[0], competencyId: null });
    setCurrentLoStatus(undefined);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_460px]">
      <section className="space-y-6">
        <div className="sticky -top-4 z-20 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Coverage tracker</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {coveredCompetencies.size} of {frameworkCompetencies.length} AI competencies covered
              </h2>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{competencyCoverage}%</p>
          </div>
          <div className="my-4 h-3 rounded-full bg-slate-200">
            <div
              className={`h-3 rounded-full ${competencyCoverage === 100 ? "bg-emerald-500" : "bg-blue-600"}`}
              style={{ width: `${competencyCoverage}%` }}
            />
          </div>
        </div>
        {hasUnmappedLOs && (
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
        )}
        
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
                        .map((module) => {
                          const draft = drafts[module.id] ?? { text: "", category: loCategories[0], competencyId: null };
                          const isAddFormOpen = openAddFormForModuleId === module.id;

                          return (
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
                                  <span className={`inline-block ml-2 rounded-full px-2 py-1 text-xs font-semibold ${
                                    module.isCompulsory ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                                  }`}>
                                    {module.isCompulsory ? "Compulsory" : "Elective"}
                                  </span>

                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 whitespace-nowrap">
                                  {(outcomesByModule.get(module.id) ?? []).filter((learningOutcome) => learningOutcome.status !== "to_delete").length} LOs
                                </span>
                              </div>
                              <div className="mt-3 space-y-1">
                                {(outcomesByModule.get(module.id) ?? []).map((learningOutcome) => {
                                  const isMarkedForDeletion = learningOutcome.status === "to_delete";
                                  const competency = frameworkCompetencies.find((record) => record.id === learningOutcome.competencyId);
                                  const competencyDescription = competency?.levels?.understand || competency?.levels?.apply || competency?.levels?.create || "";
                  
                                  const hasBorder = isMarkedForDeletion || learningOutcome.competencyId;
  
                                  return (
                                    <div
                                      key={learningOutcome.id}
                                      className={`flex items-start gap-2 text-xs ${hasBorder ? "rounded-xl border p-3" : "py-1"} ${
                                        isMarkedForDeletion
                                          ? "border-amber-300 bg-amber-50"
                                          : learningOutcome.competencyId
                                            ? "border-green-500 bg-green-50 mb-2"
                                            : ""
                                      }`}
                                    >
                                      {!isViewer && (
                                        <button
                                          type="button"
                                          className="text-slate-400 hover:text-slate-600"
                                          onClick={() => handleEditLo(learningOutcome.id, learningOutcome.text, learningOutcome.category, learningOutcome.competencyId, learningOutcome.status)}
                                          aria-label="Edit"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
</svg>
                                        </button>
                                      )}
                                      <div className="flex-1 flex gap-2">
                                        {competency && (
                                          <span className="relative inline-block">
                                            <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 whitespace-nowrap">
                                              {competency.id}
                                            </span>
                                            <span className="tooltip-text">
                                              {competency.title}: {competencyDescription.slice(0, 500)}{competencyDescription.length > 500 ? "..." : ""}
                                            </span>
                                          </span>
                                        )}
                                        <p className={`text-slate-700 inline-block ${competency ? "" : "pt-1"}`}>{learningOutcome.text}</p>
                                      </div>
                                      {isMarkedForDeletion && (
                                        <span className="rounded-full bg-amber-200 inline-block px-2 py-1 text-xs font-semibold text-amber-800">
                                          For deletion
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {!isViewer && !isAddFormOpen ? (
                                <button
                                  type="button"
                                  className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                                  onClick={() => setOpenAddFormForModuleId(module.id)}
                                >
                                  Add LO
                                </button>
                              ) : null}

                              {!isViewer && isAddFormOpen ? (
                                <form
                                  className="mt-4 rounded-xl bg-slate-50 p-4"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    if (draft.text.trim().length < 10) {
                                      return;
                                    }

                                    const loId = addLearningOutcome(programmeId, {
                                      competencyId: draft.competencyId,
                                      text: draft.text.trim(),
                                      category: draft.category,
                                    });

                                    // Immediately assign to module
                                    updateLearningOutcome(loId, { moduleId: module.id });

                                    setDrafts((current) => ({
                                      ...current,
                                      [module.id]: { text: "", category: loCategories[0], competencyId: null },
                                    }));

                                    setOpenAddFormForModuleId(null);
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-semibold text-slate-700">Add Learning Outcome</h3>
                                    <button
                                      type="button"
                                      className="text-sm font-medium text-slate-600 hover:text-slate-900"
                                      onClick={() => setOpenAddFormForModuleId(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <div className="mt-3 space-y-3">
                                    <label className="block">
                                      <span className="text-sm font-medium text-slate-700">Category</span>
                                      <select
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        value={draft.category}
                                        onChange={(event) =>
                                          setDrafts((current) => ({
                                            ...current,
                                            [module.id]: { ...draft, category: event.target.value as (typeof loCategories)[number] },
                                          }))
                                        }
                                      >
                                        {loCategories.map((category) => (
                                          <option key={category} value={category}>
                                            {category}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="block">
                                      <span className="text-sm font-medium text-slate-700">UNESCO AI Competency (optional)</span>
                                      <select
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        value={draft.competencyId ?? ""}
                                        onChange={(event) =>
                                          setDrafts((current) => ({
                                            ...current,
                                            [module.id]: { ...draft, competencyId: event.target.value || null },
                                          }))
                                        }
                                      >
                                        <option value="">-- None --</option>
                                        {frameworkCompetencies.map((competency) => {
                                          const description = competency.levels?.understand || competency.levels?.apply || competency.levels?.create || "";
                                          const truncatedDescription = description.slice(0, 60) + (description.length > 60 ? "..." : "");
                                          return (
                                            <option key={competency.id} value={competency.id}>
                                              {competency.id} - {competency.title} ({truncatedDescription})
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </label>
                                    <textarea
                                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                      rows={3}
                                      minLength={10}
                                      value={draft.text}
                                      onChange={(event) =>
                                        setDrafts((current) => ({
                                          ...current,
                                          [module.id]: { ...draft, text: event.target.value },
                                        }))
                                      }
                                      placeholder="Write a measurable learning outcome (minimum 10 characters)."
                                    />
                                    <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700" type="submit">
                                      Save LO
                                    </button>
                                  </div>
                                </form>
                              ) : null}
                            </article>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </>
            )
          }
        </div>
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:-top-4 xl:self-start xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto pb-30">
        <h3 className="text-lg font-semibold text-slate-900">AI-related Learning Outcomes</h3>
        <p className="mt-2 text-sm text-slate-600">Assign each LO to a module.</p>
        <div className="mt-4 space-y-3">
          {newLearningOutcomes.length === 0 ? (
            <p className="text-sm text-slate-500">No learning outcomes yet.</p>
          ) : (
            [...newLearningOutcomes].sort(compareLearningOutcomesStable).map((learningOutcome) => {
              const competency = frameworkCompetencies.find((record) => record.id === learningOutcome.competencyId);
              const competencyDescription = competency?.levels?.understand || competency?.levels?.apply || competency?.levels?.create || "";

              return (
                <article
                  key={learningOutcome.id}
                  className={`rounded-xl border p-3 ${
                    learningOutcome.moduleId ? "border-green-500 bg-green-50" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {competency && (
                      <span
                        className="relative inline-block"
                      >
                        <span
                          className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 whitespace-nowrap"
                        >
                          {competency.id}
                        </span>
                        <span
                          className="tooltip-text"
                        >
                          {competency.title}: {competencyDescription.slice(0, 500)}{competencyDescription.length > 500 ? "..." : ""}
                        </span>
                      </span>
                    )}
                    {learningOutcome.category && <span className="inline-block rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 whitespace-nowrap">{learningOutcome.category}</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{learningOutcome.text}</p>
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
                          Year {module.year}  {module.code} {module.name.slice(0, 20)}{module.name.length > 20 ? "" : ""}
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
      
      <EditLoModal
        state={editLoState}
        onClose={() => {
          setEditLoState({ open: false, loId: "", text: "", category: loCategories[0], competencyId: null });
          setCurrentLoStatus(undefined);
        }}
        onSave={handleEditSave}
        onDelete={editLoState.loId ? () => handleDeleteFromModal(editLoState.loId) : undefined}
        onMarkForDeletion={editLoState.loId ? () => handleMarkForDeletion(editLoState.loId) : undefined}
        onRestore={editLoState.loId ? () => handleRestore(editLoState.loId) : undefined}
        isMarkedForDeletion={currentLoStatus === "to_delete"}
      />
      
      <ConfirmModal
        open={deleteLoState.open}
        onClose={() => setDeleteLoState({ open: false, id: "" })}
        onConfirm={() => {
          if (deleteLoState.id) {
            deleteLearningOutcome(deleteLoState.id);
          }
        }}
        title="Delete Learning Outcome"
        message="This will permanently delete the learning outcome. Are you sure?"
        confirmLabel="Delete"
      />
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
