"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAppData, type PriorityRating, type RagStatus } from "@/lib/app-data";
import { frameworkCompetencies } from "@/lib/framework";
import { Modal, ConfirmModal } from "@/components/modal";

const priorities: PriorityRating[] = ["High", "Medium", "Low"];
const rags: RagStatus[] = ["", "Red", "Amber", "Green"];

type EditAssessmentState = {
  open: boolean;
  id: string;
  assessmentCode: string;
  title: string;
  notes: string;
  weight: string;
  duration: string;
  priority: PriorityRating | "";
  rag: RagStatus;
  ragPlanned: RagStatus;
};

const emptyEdit: EditAssessmentState = {
  open: false,
  id: "",
  assessmentCode: "",
  title: "",
  notes: "",
  weight: "",
  duration: "",
  priority: "",
  rag: "Amber",
  ragPlanned: "",
};

type DeleteAssessmentState = {
  open: boolean;
  id: string;
};

function AssessPageContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const programmeId = searchParams.get("programme") ?? params.id;
  const { state, addAssessment, updateAssessment, deleteAssessment } = useAppData();
  const [drafts, setDrafts] = useState<Record<string, { title: string; rag: RagStatus; ragPlanned: RagStatus }>>({});
  const [openAddFormForModuleId, setOpenAddFormForModuleId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditAssessmentState>(emptyEdit);
  const [deleteAssessmentState, setDeleteAssessmentState] = useState<DeleteAssessmentState>({ open: false, id: "" });

  const modules = state.modules.filter((module) => module.programmeId === programmeId);
  const modulesByYear = useMemo(() => {
    const grouped: Record<string, typeof modules> = {};

    [...modules].sort((a, b) => a.year - b.year || a.order - b.order).forEach((module) => {
      const yearValue = (module as { year?: string | number | null }).year;
      const year = yearValue !== undefined && yearValue !== null && `${yearValue}`.trim() !== ""
        ? `Year ${yearValue}`
        : "Unassigned year";

      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(module);
    });

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  }, [modules]);
  const programme = state.programmes.find((record) => record.id === programmeId);
  const isViewer = programme?.role === "viewer";
  const learningOutcomes = state.learningOutcomes.filter((learningOutcome) => learningOutcome.programmeId === programmeId);
  const assessments = state.assessments.filter((assessment) => assessment.programmeId === programmeId);

  const summary = useMemo(() => {
    const activeAssessments = assessments.filter((assessment) => assessment.status !== "to_delete");
    const byPriority: Record<PriorityRating, number> = {
      High: 0,
      Medium: 0,
      Low: 0,
    };
    const byRag: Record<RagStatus, number> = {
      "": 0,
      Red: 0,
      Amber: 0,
      Green: 0,
    };
    const byRagPlanned: Record<RagStatus, number> = {
      "": 0,
      Red: 0,
      Amber: 0,
      Green: 0,
    };

    activeAssessments.forEach((assessment) => {
      if (assessment.priority) {
        byPriority[assessment.priority] += 1;
      }
      if (assessment.rag) {
        byRag[assessment.rag] += 1;
      }
      if (assessment.ragPlanned) {
        byRagPlanned[assessment.ragPlanned] += 1;
      }
    });

    return {
      total: activeAssessments.length,
      byPriority,
      byRag,
      byRagPlanned,
      assessedLearningOutcomes: new Set(activeAssessments.flatMap((assessment) => assessment.learningOutcomeIds)).size,
    };
  }, [assessments]);

  const coverage = summary.total
    ? Math.round(((summary.byRagPlanned.Green + summary.byRagPlanned.Amber + summary.byRagPlanned.Red) / summary.total) * 100)
    : 0;

  const openEditAssessment = (assessment: (typeof assessments)[0]) => {
    setEditState({
      open: true,
      id: assessment.id,
      assessmentCode: assessment.assessmentCode ?? "",
      title: assessment.title,
      notes: assessment.description ?? "",
      weight: assessment.weight ?? "",
      duration: assessment.duration ?? "",
      priority: assessment.priority ?? "",
      rag: assessment.rag ?? "Amber",
      ragPlanned: assessment.ragPlanned ?? "",
    });
  };

  const handleEditSave = () => {
    if (!editState.title.trim()) return;
    updateAssessment(editState.id, {
      assessmentCode: editState.assessmentCode.trim(),
      title: editState.title.trim(),
      description: editState.notes.trim(),
      weight: editState.weight.trim(),
      duration: editState.duration.trim(),
      priority: editState.priority || null,
      rag: editState.rag,
      ragPlanned: editState.ragPlanned || null,
    });
    setEditState(emptyEdit);
  };

  return (
    <div className="space-y-6">
      <section className="sticky -top-4 z-20 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-4 backdrop-blur supports-[backdrop-filter]:bg-white/90">

        <article className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Assessment Priority</p>
          <p className="mt-2 text-sm text-slate-700">
            {summary.byPriority.High} High<br />
            {summary.byPriority.Medium} Medium<br />
            {summary.byPriority.Low} Low<br />
            {summary.total - summary.byPriority.High - summary.byPriority.Medium - summary.byPriority.Low} No action required
          </p>
        </article>
        <article className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">AI taxonomy</p>
          <div className="mt-2 text-sm text-slate-700 grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold">Current</p>
              <p>🔴 {summary.byRag.Red} (Secure, No AI)</p>
              <p>🟡 {summary.byRag.Amber} (Optional AI)</p>
              <p>🟢 {summary.byRag.Green} (Mandatory AI)</p>
            </div>
            <div>
              <p className="font-semibold">Planned</p>
              <p>🔴 {summary.byRagPlanned.Red} (Secure, No AI)</p>
              <p>🟡 {summary.byRagPlanned.Amber} (Optional AI)</p>
              <p>🟢 {summary.byRagPlanned.Green} (Mandatory AI)</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">AI Taxonomy Tracker</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="mt-2 text-sm text-slate-900">
                {(summary.byRagPlanned.Green + summary.byRagPlanned.Amber + summary.byRagPlanned.Red)} of {summary.total} assessments labelled
              </h2>
            </div>
            <p className="text-2xl font-semibold text-slate-900">
              {summary.total ? Math.round(((summary.byRagPlanned.Green + summary.byRagPlanned.Amber + summary.byRagPlanned.Red) / summary.total) * 100) : 0}%
            </p>
          </div>
          <div className="mt-4 h-3 rounded-full bg-slate-200">
            <div
              className={`h-3 rounded-full width-full ${coverage === 100 ? "bg-emerald-500" : "bg-blue-600"}`}
              style={{ width: `${coverage}%` }}
            />
          </div>
        </article>

      </section>

      <section className="space-y-4">
        {modules.length === 0 ? (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No modules available yet. Build module structure in Plan first.
          </article>
        ) : (
          modulesByYear.map(([year, yearModules]) => (
            <div key={year} className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">{year}</h2>
              {yearModules.map((module) => {
                const moduleAssessments = [...assessments]
                  .filter((assessment) => assessment.moduleId === module.id)
                  .sort((a, b) => (a.assessmentCode || "").localeCompare(b.assessmentCode || "", undefined, { numeric: true, sensitivity: "base" }));
                const draft = drafts[module.id] ?? { title: "", rag: "Amber", ragPlanned: "" };
                const isAddFormOpen = openAddFormForModuleId === module.id;

                return (
                  <article key={module.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        {module.url ? (
                          <a
                            href={module.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xl font-semibold hover:!underline"
                          >
                            {module.code} {module.name}
                          </a>
                        ) : (
                          <h2 className="text-xl font-semibold text-slate-900">{module.code} {module.name}</h2>
                        )}
                        <span className={`inline-block ml-2 rounded-full px-2 py-1 text-xs font-semibold ${
                          module.isCompulsory ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        }`}>
                          {module.isCompulsory ? "Compulsory" : "Elective"}
                        </span>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {moduleAssessments.length} assessments
                      </span>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_460px]">


                      <div className="mt-4 space-y-3">
                        {moduleAssessments.map((assessment) => (
                          <article
                            key={assessment.id}
                            className={`rounded-xl border p-4 ${
                              assessment.status === "to_delete"
                                ? "border-slate-300 bg-slate-50"
                                : "border-slate-200 "
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-slate-900">{assessment.title}</h3>
                                <p className="text-sm text-slate-600">
                                  {[
                                    assessment.assessmentCode ? `${assessment.assessmentCode}` : "",
                                    assessment.weight,
                                    assessment.duration,
                                  ].filter((value) => value.trim() !== "").join(" · ") || "Assessment details not set"}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {assessment.status === "to_delete" ? (
                                  <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-800">
                                    For deletion
                                  </span>
                                ) : (
                                  <>
                                    <span
                                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                        assessment.priority === "High"
                                          ? "bg-gray-800 text-white"
                                          : assessment.priority === "Medium"
                                            ? "bg-gray-500 text-white"
                                            : assessment.priority === "Low"
                                              ? "bg-gray-200 text-gray-800"
                                              : "border border-gray-500 text-slate-700"
                                      }`}
                                    >
                                      {assessment.priority ?? "No action required"}
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-1 text-xs font-semibold border-2 ${
                                        assessment.rag === "Red"
                                          ? "bg-red-50 text-red-700 border-red-200"
                                          : assessment.rag === "Amber"
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : assessment.rag === "Green"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : "bg-slate-50 text-slate-700 border-slate-200"
                                      }`}
                                    >
                                      {!assessment.rag ? "Missing AI taxonomy" : assessment.rag}
                                    </span>
                                    {assessment.ragPlanned && assessment.ragPlanned !== "" && (
                                      <span
                                        className={`rounded-full px-2 py-1 text-xs font-semibold border-2 ${
                                          assessment.ragPlanned === "Red"
                                            ? "bg-red-50 text-red-700 border-red-200"
                                            : assessment.ragPlanned === "Amber"
                                              ? "bg-amber-50 text-amber-700 border-amber-200"
                                              : assessment.ragPlanned === "Green"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-slate-50 text-slate-700 border-slate-200"
                                        }`}
                                      >
                                        Planned: {assessment.ragPlanned}
                                      </span>
                                    )}
                                  </>
                                )}
                                
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-slate-700">{assessment.description || "No notes"}</p>
                            {!isViewer ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {assessment.status != "to_delete" ? (
                                  <>
                                    <button
                                      type="button"
                                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                                      onClick={() => openEditAssessment(assessment)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
                                      onClick={() => setDeleteAssessmentState({ open: true, id: assessment.id })}
                                    >
                                      Delete
                                    </button>
                                  </>
                                ) : null}

                                {assessment.status === "to_delete" ? (
                                  <button
                                    type="button"
                                    className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700"
                                    onClick={() => updateAssessment(assessment.id, { status: undefined })}
                                  >
                                    Restore
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700"
                                    onClick={() => updateAssessment(assessment.id, { status: "to_delete" })}
                                  >
                                    Mark for deletion
                                  </button>
                                )}
                              </div>
                            ) : null}
                          </article>
                        ))}
                        
                        {!isViewer && !isAddFormOpen ? (
                          <button
                            type="button"
                            className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                            onClick={() => setOpenAddFormForModuleId(module.id)}
                          >
                            Add assessment
                          </button>
                        ) : null}

                        {!isViewer && isAddFormOpen ? (
                          <form
                            className="mt-4 rounded-xl bg-slate-50 p-4"
                            onSubmit={(event) => {
                              event.preventDefault();
                              if (!draft.title.trim()) {
                                return;
                              }

                              addAssessment(programmeId, {
                                moduleId: module.id,
                                title: draft.title.trim(),
                                rag: draft.rag,
                                ragPlanned: draft.ragPlanned || null,
                              });

                              setDrafts((current) => ({
                                ...current,
                                [module.id]: { title: "", rag: "Amber", ragPlanned: "" },
                              }));

                              setOpenAddFormForModuleId(null);
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-sm font-semibold text-slate-700">Add assessment</h3>
                              <button
                                type="button"
                                className="text-sm font-medium text-slate-600 hover:text-slate-900"
                                onClick={() => setOpenAddFormForModuleId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_180px_auto]">
                              <input
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                placeholder="Assessment title"
                                value={draft.title}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [module.id]: { ...draft, title: event.target.value },
                                  }))
                                }
                              />
                              <select
                                className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                                value={draft.rag}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [module.id]: { ...draft, rag: event.target.value as RagStatus },
                                  }))
                                }
                              >
                                {rags.map((rag) => (
                                  <option key={rag} value={rag}>
                                    {rag}
                                  </option>
                                ))}
                              </select>
                              <select
                                className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                                value={draft.ragPlanned || ""}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [module.id]: { ...draft, ragPlanned: event.target.value as RagStatus },
                                  }))
                                }
                              >
                                {rags.map((rag) => (
                                  <option key={`planned-${rag}`} value={rag}>
                                    {rag}
                                  </option>
                                ))}
                              </select>
                              <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white" type="submit">
                                Save
                              </button>
                            </div>
                          </form>
                        ) : null}

                      </div>

                      <div className="mt-4 space-y-3">

                        {learningOutcomes.filter((lo) => lo.moduleId === module.id && lo.competencyId).length === 0 ? (
                          <></>
                        ) : (
                          <>
                            <h3 className="text-sm font-semibold text-slate-700">New Learning outcomes</h3>
                            {learningOutcomes
                              .filter((lo) => lo.moduleId === module.id && lo.competencyId)
                              .map((learningOutcome) => {
                                const competency = frameworkCompetencies.find((record) => record.id === learningOutcome.competencyId);
                                const competencyDescription = competency?.levels?.understand || competency?.levels?.apply || competency?.levels?.create || "";

                                return (
                                  <article
                                    key={learningOutcome.id}
                                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm"
                                  >
                                    <div className="flex items-start gap-2">
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
                                      {learningOutcome.category && <span className="inline-block rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 whitespace-nowrap">{learningOutcome.category}</span>}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-700">{learningOutcome.text}</p>
                                  </article>
                                );
                            })}
                          </>

                        )}
                        
                      </div>

                    </div>

                    
                  </article>
                );
              })}
            </div>
          ))
        )}
      </section>

      {/* Edit assessment modal */}
      <Modal
        open={editState.open}
        onClose={() => setEditState(emptyEdit)}
        title="Edit assessment"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleEditSave();
          }}
        >
          <label className="block text-sm font-medium text-slate-700">
            Title <span className="text-red-500">*</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={editState.title}
              onChange={(e) => setEditState((s) => ({ ...s, title: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Assessment code
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. 001"
              value={editState.assessmentCode}
              onChange={(e) => setEditState((s) => ({ ...s, assessmentCode: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Notes
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={editState.notes}
              onChange={(e) => setEditState((s) => ({ ...s, notes: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Weight (%)
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. 25%"
              value={editState.weight}
              onChange={(e) => setEditState((s) => ({ ...s, weight: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Duration
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. 1,500 Words or 240 Minutes"
              value={editState.duration}
              onChange={(e) => setEditState((s) => ({ ...s, duration: e.target.value }))}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Priority
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={editState.priority}
                onChange={(e) => setEditState((s) => ({ ...s, priority: e.target.value as PriorityRating | "" }))}
              >
                <option value="">No action required</option>
                {priorities.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              AI taxonomy (Current)
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={editState.rag}
                onChange={(e) => setEditState((s) => ({ ...s, rag: e.target.value as RagStatus }))}
              >
                {rags.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              AI taxonomy (Planned)
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={editState.ragPlanned}
                onChange={(e) => setEditState((s) => ({ ...s, ragPlanned: e.target.value as RagStatus }))}
              >
                {rags.map((r) => (
                  <option key={`planned-${r}`} value={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-slate-500">
            🔴 Red — Secure (AI not permitted) · 🟡 Amber — Optional AI use · 🟢 Green — Mandatory AI use
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
              onClick={() => setEditState(emptyEdit)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Save changes
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteAssessmentState.open}
        onClose={() => setDeleteAssessmentState({ open: false, id: "" })}
        onConfirm={() => {
          if (deleteAssessmentState.id) {
            deleteAssessment(deleteAssessmentState.id);
          }
        }}
        title="Delete assessment"
        message="Are you sure?"
        confirmLabel="Delete"
      />
    </div>
  );
}

export default function AssessPage() {
  return (
    <Suspense fallback={null}>
      <AssessPageContent />
    </Suspense>
  );
}
