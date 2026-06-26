"use client";

import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { frameworkCompetencies } from "@/lib/framework";
import { useAppData } from "@/lib/app-data";
import { parseCsvFile, type CsvPreviewRow, type CsvSkippedRow, type CsvParseResult } from "@/lib/csv-import";

type ImportState =
  | { stage: "idle" }
  | { stage: "preview"; result: CsvParseResult }
  | { stage: "importing"; total: number; done: number }
  | { stage: "done"; imported: number };

const BATCH_SIZE = 10;

export default function MapPage() {
  const params = useParams<{ id: string }>();
  const programmeId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("programme") ?? params.id
      : params.id;
  const { state, updateLearningOutcome, importCsvModules } = useAppData();
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>({ stage: "idle" });
  const [parseError, setParseError] = useState<string | null>(null);


  const modules = state.modules
    .filter((module) => module.programmeId === programmeId)
    .sort((a, b) => a.year - b.year || a.order - b.order);
  const programme = state.programmes.find((record) => record.id === programmeId);
  const isViewer = programme?.role === "viewer";
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

  const existingCodes = useMemo(
    () => new Set(modules.map((m) => m.code).filter(Boolean)),
    [modules],
  );

  const handleCsvFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setParseError(null);
    try {
      const result = await parseCsvFile(file, existingCodes);
      if (result.preview.length === 0 && result.skipped.length === 0) {
        setParseError("No valid rows found in the CSV file.");
        return;
      }
      setImportState({ stage: "preview", result });
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse CSV.");
    }
  };

  const runImport = async (rows: CsvParseResult["importRows"]) => {
    const total = rows.length;
    setImportState({ stage: "importing", total, done: 0 });

    let done = 0;
    while (done < total) {
      const batch = rows.slice(done, done + BATCH_SIZE);
      importCsvModules(programmeId, batch);
      done += batch.length;
      setImportState({ stage: "importing", total, done });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    setImportState({ stage: "done", imported: total });
  };

  const stage = importState.stage;

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

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {modules.length} module{modules.length !== 1 ? "s" : ""} in this programme
          </p>
          {!isViewer ? (
            <>
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                onClick={() => csvInputRef.current?.click()}
              >
                Import from CSV
              </button>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleCsvFile}
              />
            </>
          ) : null}
        </div>

        {parseError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {parseError}
          </div>
        )}

        {/* CSV import wizard */}
        {stage !== "idle" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {stage === "preview" && importState.stage === "preview" && (
              <CsvPreviewPanel
                result={importState.result}
                onConfirm={() => {
                  if (importState.stage === "preview") {
                    runImport(importState.result.importRows);
                  }
                }}
                onCancel={() => setImportState({ stage: "idle" })}
              />
            )}

            {stage === "importing" && importState.stage === "importing" && (
              <div className="space-y-4">
                <p className="font-semibold text-slate-900">Importing modules…</p>
                <div className="h-3 rounded-full bg-slate-200">
                  <div
                    className="h-3 rounded-full bg-blue-600 transition-all"
                    style={{
                      width: `${Math.round((importState.done / importState.total) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-slate-600">
                  Importing {importState.done} of {importState.total} modules…
                </p>
              </div>
            )}

            {stage === "done" && importState.stage === "done" && (
              <div className="space-y-3">
                <p className="font-semibold text-slate-900">Import complete</p>
                <p className="text-sm text-slate-600">
                  {importState.imported} module{importState.imported !== 1 ? "s" : ""} imported successfully.
                </p>
                <button
                  type="button"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  onClick={() => setImportState({ stage: "idle" })}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {modules.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              No modules yet. Add modules in the Plan tab or import from CSV.
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
                        {/* {competency?.id ?? "Imported"}:  */}
                        {/* {learningOutcome.text.slice(0, 80)} */}
                        {learningOutcome.text}
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
                          Year {module.year} · {module.name}
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

function CsvPreviewPanel({
  result,
  onConfirm,
  onCancel,
}: {
  result: CsvParseResult;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { preview, skipped } = result;
  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold text-slate-900">CSV preview</p>
        <p className="mt-1 text-sm text-slate-600">
          {preview.length} module{preview.length !== 1 ? "s" : ""} ready to import
          {skipped.length > 0 && `, ${skipped.length} row${skipped.length !== 1 ? "s" : ""} will be skipped`}.
        </p>
      </div>

      {preview.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold text-slate-700">Name</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Code</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Year</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Credits</th>
                <th className="px-3 py-2 font-semibold text-slate-700">LOs</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Assessments</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row: CsvPreviewRow, i: number) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-800">{row.name}</td>
                  <td className="px-3 py-2 text-slate-600">{row.code || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{row.year}</td>
                  <td className="px-3 py-2 text-slate-600">{row.credits || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{row.loCount}</td>
                  <td className="px-3 py-2 text-slate-600">{row.assessmentCount}</td>
                  <td className="px-3 py-2">
                    {row.isUpsert ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Update</span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">New</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {skipped.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800">
            Skipped rows ({skipped.length})
          </p>
          <ul className="mt-2 space-y-1">
            {skipped.map((row: CsvSkippedRow, i: number) => (
              <li key={i} className="text-xs text-amber-700">
                <span className="font-medium">{row.rawName}</span>: {row.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={preview.length === 0}
          onClick={onConfirm}
        >
          Confirm import ({preview.length} module{preview.length !== 1 ? "s" : ""})
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
