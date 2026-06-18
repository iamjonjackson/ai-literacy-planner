"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAppData, type PriorityRating, type RagStatus } from "@/lib/app-data";

const priorities: PriorityRating[] = ["High", "Medium", "Low"];
const rags: RagStatus[] = ["Red", "Amber", "Green"];

export default function AssessPage() {
  const params = useParams<{ id: string }>();
  const programmeId = params.id;
  const { state, addAssessment, updateAssessment, deleteAssessment } = useAppData();
  const [drafts, setDrafts] = useState<Record<string, { title: string; rag: RagStatus }>>({});

  const modules = state.modules.filter((module) => module.programmeId === programmeId);
  const assessments = state.assessments.filter((assessment) => assessment.programmeId === programmeId);

  const summary = useMemo(() => {
    const byPriority: Record<PriorityRating, number> = {
      High: 0,
      Medium: 0,
      Low: 0,
    };
    const byRag: Record<RagStatus, number> = {
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
    };
  }, [assessments]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <article className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total assessments</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</p>
        </article>
        <article className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Priority</p>
          <p className="mt-2 text-sm text-slate-700">
            H {summary.byPriority.High} · M {summary.byPriority.Medium} · L {summary.byPriority.Low}
          </p>
        </article>
        <article className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">RAG status</p>
          <p className="mt-2 text-sm text-slate-700">
            R {summary.byRag.Red} · A {summary.byRag.Amber} · G {summary.byRag.Green}
          </p>
        </article>
      </section>

      <section className="space-y-4">
        {modules.length === 0 ? (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No modules available yet. Build module structure in Plan first.
          </article>
        ) : (
          modules.map((module) => {
            const moduleAssessments = assessments.filter((assessment) => assessment.moduleId === module.id);
            const draft = drafts[module.id] ?? { title: "", rag: "Amber" };

            return (
              <article key={module.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Year {module.year}</p>
                    <h2 className="text-xl font-semibold text-slate-900">{module.name}</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {moduleAssessments.length} assessments
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {moduleAssessments.map((assessment) => (
                    <article key={assessment.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">{assessment.title}</h3>
                          <p className="text-sm text-slate-600">{assessment.type || "Type not set"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {assessment.priority ?? "No priority"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {assessment.rag ?? "No RAG"}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{assessment.description || "No description"}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                          onClick={() => {
                            const title = window.prompt("Assessment title", assessment.title);
                            if (!title?.trim()) {
                              return;
                            }
                            const type = window.prompt("Type", assessment.type) ?? assessment.type;
                            const description =
                              window.prompt("Description", assessment.description) ?? assessment.description;
                            const weight = window.prompt("Weight %", assessment.weight) ?? assessment.weight;
                            const priority = window.prompt(
                              "Priority (High/Medium/Low or blank)",
                              assessment.priority ?? "",
                            );
                            const rag = window.prompt("RAG (Red/Amber/Green)", assessment.rag ?? "Amber");

                            updateAssessment(assessment.id, {
                              title: title.trim(),
                              type: type.trim(),
                              description: description.trim(),
                              weight: weight.trim(),
                              priority: priorities.includes(priority as PriorityRating)
                                ? (priority as PriorityRating)
                                : null,
                              rag: rags.includes(rag as RagStatus) ? (rag as RagStatus) : assessment.rag,
                            });
                          }}
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
                    </article>
                  ))}
                </div>

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
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
