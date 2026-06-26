"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAppData, type PriorityRating, type RagStatus } from "@/lib/app-data";
import { Modal } from "@/components/modal";

const priorities: PriorityRating[] = ["High", "Medium", "Low"];
const rags: RagStatus[] = ["", "Red", "Amber", "Green"];

type EditAssessmentState = {
  open: boolean;
  id: string;
  title: string;
  type: string;
  description: string;
  weight: string;
  priority: PriorityRating | "";
  rag: RagStatus;
};

const emptyEdit: EditAssessmentState = {
  open: false,
  id: "",
  title: "",
  type: "",
  description: "",
  weight: "",
  priority: "",
  rag: "Amber",
};

function AssessPageContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const programmeId = searchParams.get("programme") ?? params.id;
  const { state, addAssessment, updateAssessment, deleteAssessment } = useAppData();
  const [drafts, setDrafts] = useState<Record<string, { title: string; rag: RagStatus }>>({});
  const [editState, setEditState] = useState<EditAssessmentState>(emptyEdit);

  const modules = state.modules.filter((module) => module.programmeId === programmeId);
  const modulesByYear = useMemo(() => {
    const grouped: Record<string, typeof modules> = {};

    modules.forEach((module) => {
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

    assessments.forEach((assessment) => {
      if (assessment.priority) {
        byPriority[assessment.priority] += 1;
      }
      if (assessment.rag) {
        byRag[assessment.rag] += 1;
      }
    });

    return {
      total: assessments.length,
      byPriority,
      byRag,
      assessedLearningOutcomes: new Set(assessments.flatMap((assessment) => assessment.learningOutcomeIds)).size,
    };
  }, [assessments]);

  const coverage = Math.round(((summary.byRag.Green + summary.byRag.Amber + summary.byRag.Red) / summary.total) * 100);

  const openEditAssessment = (assessment: (typeof assessments)[0]) => {
    setEditState({
      open: true,
      id: assessment.id,
      title: assessment.title,
      type: assessment.type ?? "",
      description: assessment.description ?? "",
      weight: assessment.weight ?? "",
      priority: assessment.priority ?? "",
      rag: assessment.rag ?? "Amber",
    });
  };

  const handleEditSave = () => {
    if (!editState.title.trim()) return;
    updateAssessment(editState.id, {
      title: editState.title.trim(),
      type: editState.type.trim(),
      description: editState.description.trim(),
      weight: editState.weight.trim(),
      priority: editState.priority || null,
      rag: editState.rag,
    });
    setEditState(emptyEdit);
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-4">
        <article className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Total assessments</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</p>
        </article>
        <article className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Priority</p>
          <p className="mt-2 text-sm text-slate-700">
            {summary.byPriority.High} High<br />
            {summary.byPriority.Medium} Medium<br />
            {summary.byPriority.Low} Low<br />
            {summary.total - summary.byPriority.High - summary.byPriority.Medium - summary.byPriority.Low} No action required
          </p>
        </article>
        <article className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">AI taxonomy</p>
          <p className="mt-2 text-sm text-slate-700">
            🔴 {summary.byRag.Red} (Secure, No AI)<br />
            🟡 {summary.byRag.Amber} (Optional AI)<br />
            🟢 {summary.byRag.Green} (Mandatory AI)
          </p>
        </article>

        <article className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Taxonomy Tracker</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="mt-2 text-sm text-slate-900">
                {(summary.byRag.Green + summary.byRag.Amber + summary.byRag.Red)}  of {summary.total} assessments categorised
              </h2>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{coverage}%</p>
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
                const moduleAssessments = assessments.filter((assessment) => assessment.moduleId === module.id);
                const draft = drafts[module.id] ?? { title: "", rag: "Amber" };

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
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {moduleAssessments.length} assessments
                      </span>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_460px]">


                      <div className="mt-4 space-y-3">
                        {moduleAssessments.map((assessment) => (
                          <article key={assessment.id} className="rounded-xl border border-slate-200 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-slate-900">{assessment.title}</h3>
                                <p className="text-sm text-slate-600">{assessment.type || "Type not set"} · {assessment.weight}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
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
                                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                    assessment.rag === "Red"
                                      ? "bg-red-100 text-red-700"
                                      : assessment.rag === "Amber"
                                        ? "bg-amber-100 text-amber-700"
                                        : assessment.rag === "Green"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {assessment.rag === "" ? "Missing AI taxonomy" : assessment.rag}
                                </span>
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-slate-700">{assessment.description || "No description"}</p>
                            {!isViewer ? (
                              <div className="mt-3 flex flex-wrap gap-2">
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
                                  onClick={() => deleteAssessment(assessment.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </article>
                        ))}
                        
                        {!isViewer ? (
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
                              });

                              setDrafts((current) => ({
                                ...current,
                                [module.id]: { title: "", rag: "Amber" },
                              }));
                            }}
                          >
                            <h3 className="text-sm font-semibold text-slate-700">Add assessment</h3>
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

                                return (
                                  <article
                                    key={learningOutcome.id}
                                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm"
                                  >
                                    ({learningOutcome.category}) {learningOutcome.text}
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
            Type
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. Essay, Exam, Project"
              value={editState.type}
              onChange={(e) => setEditState((s) => ({ ...s, type: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Description
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={editState.description}
              onChange={(e) => setEditState((s) => ({ ...s, description: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Weight (%)
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. 40"
              value={editState.weight}
              onChange={(e) => setEditState((s) => ({ ...s, weight: e.target.value }))}
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
            <label className="block text-sm font-medium text-slate-700">
              AI and Assessment taxonomy 
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
