"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { frameworkCompetencies, findDimension } from "@/lib/framework";
import { useAppData } from "@/lib/app-data";
import { usePersistentState } from "@/lib/persistent-state";
import { Modal } from "@/components/modal";

type EditLoState = {
  open: boolean;
  loId: string;
  text: string;
  category: (typeof loCategories)[number];
};

const loCategories = ["Disciplinary Skills", "Academic Content", "Attributes"] as const;

function DesignPageContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const programmeId = searchParams.get("programme") ?? params.id;
  const { state, addLearningOutcome, updateLearningOutcome, deleteLearningOutcome } = useAppData();
  const [selectedCompetencyId, setSelectedCompetencyId] = usePersistentState(
    `ai-literacy-planner:design:${programmeId}:competency`,
    frameworkCompetencies[0].id,
  );
  const [draft, setDraft] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<(typeof loCategories)[number]>(loCategories[0]);
  const [editLo, setEditLo] = useState<EditLoState>({ open: false, loId: "", text: "", category: loCategories[0] });

  const learningOutcomes = state.learningOutcomes.filter((learningOutcome) => learningOutcome.programmeId === programmeId);
  const programme = state.programmes.find((record) => record.id === programmeId);
  const isViewer = programme?.role === "viewer";
  const coveredCompetencies = new Set(
    learningOutcomes.filter((learningOutcome) => learningOutcome.competencyId).map((learningOutcome) => learningOutcome.competencyId),
  );
  const coverage = Math.round((coveredCompetencies.size / frameworkCompetencies.length) * 100);

  const selectedCompetency = frameworkCompetencies.find((competency) => competency.id === selectedCompetencyId);
  const competencyOutcomes = useMemo(
    () => learningOutcomes.filter((learningOutcome) => learningOutcome.competencyId === selectedCompetencyId),
    [learningOutcomes, selectedCompetencyId],
  );

  const openEditLo = (loId: string, text: string, category?: string) => {
    setEditLo({
      open: true,
      loId,
      text,
      category: loCategories.includes(category as (typeof loCategories)[number])
        ? (category as (typeof loCategories)[number])
        : loCategories[0],
    });
  };

  const handleEditSave = () => {
    if (editLo.text.trim().length < 10) return;
    updateLearningOutcome(editLo.loId, { text: editLo.text.trim(), category: editLo.category });
    setEditLo({ open: false, loId: "", text: "", category: loCategories[0] });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Coverage tracker</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {coveredCompetencies.size} of {frameworkCompetencies.length} competencies covered
            </h2>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{coverage}%</p>
        </div>
        <div className="mt-4 h-3 rounded-full bg-slate-200">
          <div
            className={`h-3 rounded-full ${coverage === 100 ? "bg-emerald-500" : "bg-blue-600"}`}
            style={{ width: `${coverage}%` }}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] ">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">AI Competencies</h3>
          <div className="mt-3 space-y-4">
            {Array.from(new Set(frameworkCompetencies.map((competency) => competency.dimensionId))).map((dimensionId) => {
              const dimension = findDimension(dimensionId);
              const dimensionCompetencies = frameworkCompetencies.filter(
                (competency) => competency.dimensionId === dimensionId,
              );

              return (
                <section key={dimensionId} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {dimension?.label}
                  </h4>
                  {dimensionCompetencies.map((competency) => {
                    const count = learningOutcomes.filter(
                      (learningOutcome) => learningOutcome.competencyId === competency.id,
                    ).length;

                    return (
                      <button
                        key={competency.id}
                        type="button"
                        className={`w-full rounded-xl border px-3 py-3 text-left ${
                          selectedCompetencyId === competency.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                        onClick={() => setSelectedCompetencyId(competency.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{competency.id}</p>
                            <p className="text-sm font-semibold text-slate-900">{competency.title}</p>
                          </div>
                          <span
                            className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                              count > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {count} LOs
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </section>
              );
            })}
          </div>

          
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">
            {selectedCompetency?.id} {selectedCompetency?.title}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedCompetency?.levels.understand ? (
              <>
                <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Understand
                </span>
                <p className="text-sm text-slate-600">
                  {selectedCompetency.levels.understand}
                </p>
              </>
            ) : null}
            {selectedCompetency?.levels.apply ? (
              <>
                <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Apply
                </span>
                <p className="text-sm text-slate-600">
                  {selectedCompetency.levels.apply}
                </p>
              </>
            ) : null}
            {selectedCompetency?.levels.create ? (
              <>
                <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Create
                </span>
                <p className="text-sm text-slate-600">
                  {selectedCompetency.levels.create}
                </p>
              </>
            ) : null}
          </div>

          <div className="mt-6 space-y-3">
            {competencyOutcomes.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">No learning outcomes yet.</p>
            ) : (
              competencyOutcomes.map((learningOutcome) => (
                <article key={learningOutcome.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm leading-6 text-slate-700">{learningOutcome.text}</p>
                  {!isViewer ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                        onClick={() => openEditLo(learningOutcome.id, learningOutcome.text, learningOutcome.category)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
                        onClick={() => deleteLearningOutcome(learningOutcome.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>

          {!isViewer ? (
            <form
              className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (draft.trim().length < 10) {
                  return;
                }

                addLearningOutcome(programmeId, {
                  competencyId: selectedCompetencyId,
                  text: draft.trim(),
                  category: selectedCategory,
                });
                setDraft("");
              }}
            >
              <label className="text-md font-semibold text-slate-700">Add Learning Outcome</label>
              <label className="space-y-1 my-4 block ">
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value as (typeof loCategories)[number])}
                >
                  {loCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <textarea
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                rows={3}
                minLength={10}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write a measurable learning outcome (minimum 10 characters)."
              />
              <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" type="submit">
                Save LO
              </button>
            </form>
          ) : (
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Viewer access is read-only. Learning outcomes can be reviewed but not edited.
            </p>
          )}

        </section>
{/* 
        <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unassigned — Imported LOs</h4>
          <div className="mt-3 space-y-2">
            {unassignedOutcomes.length === 0 ? (
              <p className="text-xs text-slate-500">None</p>
            ) : (
              unassignedOutcomes.map((learningOutcome) => (
                <article
                  key={learningOutcome.id}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700"
                >
                  <div className="flex flex-wrap gap-2">
                    {learningOutcome.category ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                        {learningOutcome.category}
                      </span>
                    ) : null}
                    {learningOutcome.loNumber ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                        LO {learningOutcome.loNumber}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 leading-5">{learningOutcome.text}</p>
                  {!isViewer ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full bg-blue-600 px-3 py-1 font-semibold text-white hover:bg-blue-700"
                        onClick={() =>
                          updateLearningOutcome(learningOutcome.id, {
                            competencyId: selectedCompetencyId,
                          })
                        }
                      >
                        Assign to {selectedCompetencyId}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-700"
                        onClick={() => openEditLo(learningOutcome.id, learningOutcome.text)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-red-200 px-3 py-1 font-semibold text-red-700"
                        onClick={() => deleteLearningOutcome(learningOutcome.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </aside> */}


      </div>

      {/* Edit LO modal */}
      <Modal
        open={editLo.open}
        onClose={() => setEditLo({ open: false, loId: "", text: "", category: loCategories[0] })}
        title="Edit learning outcome"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleEditSave();
          }}
        >
          <label className="block text-sm font-medium text-slate-700">
            Learning outcome text

            <label className="space-y-1 my-4 block ">
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={editLo.category}
                onChange={(event) => setEditLo((state) => ({ ...state, category: event.target.value as (typeof loCategories)[number] }))}
              >
                {loCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={4}
              minLength={10}
              value={editLo.text}
              onChange={(e) => setEditLo((s) => ({ ...s, text: e.target.value }))}
              required
            />
            {editLo.text.trim().length > 0 && editLo.text.trim().length < 10 ? (
              <p className="mt-1 text-xs text-red-600">Minimum 10 characters required.</p>
            ) : null}
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
              onClick={() => setEditLo({ open: false, loId: "", text: "", category: loCategories[0] })}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editLo.text.trim().length < 10}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Save changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function DesignPage() {
  return (
    <Suspense fallback={null}>
      <DesignPageContent />
    </Suspense>
  );
}
