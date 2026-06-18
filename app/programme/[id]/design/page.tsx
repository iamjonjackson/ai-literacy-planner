"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { frameworkCompetencies, findDimension } from "@/lib/framework";
import { useAppData } from "@/lib/app-data";

export default function DesignPage() {
  const params = useParams<{ id: string }>();
  const programmeId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("programme") ?? params.id
      : params.id;
  const { state, addLearningOutcome, updateLearningOutcome, deleteLearningOutcome } = useAppData();
  const [selectedCompetencyId, setSelectedCompetencyId] = useState(frameworkCompetencies[0].id);
  const [draft, setDraft] = useState("");


  const learningOutcomes = state.learningOutcomes.filter((learningOutcome) => learningOutcome.programmeId === programmeId);
  const coveredCompetencies = new Set(
    learningOutcomes.filter((learningOutcome) => learningOutcome.competencyId).map((learningOutcome) => learningOutcome.competencyId),
  );
  const coverage = Math.round((coveredCompetencies.size / frameworkCompetencies.length) * 100);

  const selectedCompetency = frameworkCompetencies.find((competency) => competency.id === selectedCompetencyId);
  const competencyOutcomes = useMemo(
    () => learningOutcomes.filter((learningOutcome) => learningOutcome.competencyId === selectedCompetencyId),
    [learningOutcomes, selectedCompetencyId],
  );
  const unassignedOutcomes = learningOutcomes.filter((learningOutcome) => !learningOutcome.competencyId);

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

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Competencies</h3>
          <div className="mt-3 space-y-2">
            {frameworkCompetencies.map((competency) => {
              const count = learningOutcomes.filter((learningOutcome) => learningOutcome.competencyId === competency.id).length;
              const dimension = findDimension(competency.dimensionId);

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
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {count} LOs
                    </span>
                  </div>
                  <span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${dimension?.colorClass}`}>
                    {dimension?.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unassigned — Imported LOs</h4>
            <div className="mt-2 space-y-2">
              {unassignedOutcomes.length === 0 ? (
                <p className="text-xs text-slate-500">None</p>
              ) : (
                unassignedOutcomes.map((learningOutcome) => (
                  <button
                    key={learningOutcome.id}
                    type="button"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-left text-xs text-slate-700"
                    onClick={() => setSelectedCompetencyId(frameworkCompetencies[0].id)}
                  >
                    {learningOutcome.text}
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">
            {selectedCompetency?.id} {selectedCompetency?.title}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Understand: {selectedCompetency?.levels.understand}
          </p>
          <p className="mt-1 text-sm text-slate-600">Apply: {selectedCompetency?.levels.apply}</p>
          <p className="mt-1 text-sm text-slate-600">Create: {selectedCompetency?.levels.create}</p>

          <div className="mt-6 space-y-3">
            {competencyOutcomes.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">No learning outcomes yet.</p>
            ) : (
              competencyOutcomes.map((learningOutcome) => (
                <article key={learningOutcome.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm leading-6 text-slate-700">{learningOutcome.text}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                      onClick={() => {
                        const nextText = window.prompt("Edit LO", learningOutcome.text);
                        if (nextText && nextText.trim().length >= 10) {
                          updateLearningOutcome(learningOutcome.id, { text: nextText.trim() });
                        }
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                      onClick={() =>
                        updateLearningOutcome(learningOutcome.id, {
                          competencyId: null,
                        })
                      }
                    >
                      Unassign
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
                      onClick={() => deleteLearningOutcome(learningOutcome.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

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
              });
              setDraft("");
            }}
          >
            <label className="text-sm font-semibold text-slate-700">Add Learning Outcome</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              minLength={10}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a measurable programme learning outcome (minimum 10 characters)."
            />
            <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" type="submit">
              Save LO
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
