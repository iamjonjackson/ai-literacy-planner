"use client";

import { Suspense, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAppData } from "@/lib/app-data";
import { buildProgrammeRoute } from "@/lib/programme";
import { downloadFullDetailPdf } from "@/lib/pdf-export";
import { downloadFullDetailXlsx } from "@/lib/xlsx-export";

function ImplementPageContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const programmeId = searchParams.get("programme") ?? params.id;
  const router = useRouter();
  const importRef = useRef<HTMLInputElement>(null);
  const { state, exportProgrammeBackup, importProgrammeBackup, isViewOnly } = useAppData();


  const programme = state.programmes.find((record) => record.id === programmeId);
  const viewOnly = isViewOnly(programmeId);
  const modules = state.modules.filter((module) => module.programmeId === programmeId);
  const learningOutcomes = state.learningOutcomes.filter((learningOutcome) => learningOutcome.programmeId === programmeId);
  const assessments = state.assessments.filter((assessment) => assessment.programmeId === programmeId);

  const exportData = programme
    ? { programme, modules, learningOutcomes, assessments }
    : null;

  const downloadBackup = () => {
    const payload = exportProgrammeBackup(programmeId);
    if (!payload) {
      return;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const datePart = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `${(programme?.name ?? "programme").replaceAll(/\s+/g, "-").toLowerCase()}-backup-${datePart}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (viewOnly) {
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const payload = JSON.parse(raw);
      const nextProgrammeId = importProgrammeBackup(payload);
      router.push(buildProgrammeRoute(nextProgrammeId, "explore"));
    } catch {
      window.alert("Import failed. Please check the backup file format.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <section className="space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Implement</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Export your implementation report</h2>
          <p className="mt-2 text-sm text-slate-600">
            Download your data as PDF, XLSX, or JSON.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-base font-semibold text-slate-900">PDF export</h3>
            <p className="mt-1 text-sm text-slate-600">Download a formatted PDF of your programme plan.</p>
            <button
                type="button"
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={!exportData}
                onClick={() => exportData && downloadFullDetailPdf(exportData)}
              >
                Download PDF
              </button>
          </article>

          <article className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-base font-semibold text-slate-900">XLSX export</h3>
            <p className="mt-1 text-sm text-slate-600">Download a spreadsheet of your programme data.</p>
              <button
                type="button"
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={!exportData}
                onClick={() => exportData && downloadFullDetailXlsx(exportData)}
              >
                Download XLSX
              </button>
          </article>
          
        </div>

        {/* Section C — JSON Backup / Restore */}
        <div>
          <h2 className="font-semibold text-slate-900 text-2xl">JSON backup / restore</h2>
          <p className="mt-1 text-sm text-slate-600">Export a full programme backup or restore from a previous export.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 p-4">
              <h4 className="font-semibold text-slate-900">JSON export</h4>
              <p className="mt-2 text-sm text-slate-600">Includes programme, modules, learning outcomes, and assessments.</p>
              <button
                type="button"
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                onClick={downloadBackup}
              >
                Export JSON
              </button>
            </article>

            <article className="rounded-2xl border border-slate-200 p-4">
              <h4 className="font-semibold text-slate-900">JSON restore</h4>
              <p className="mt-2 text-sm text-slate-600">
                Import creates a new owned programme with regenerated record IDs.
              </p>
              {!viewOnly ? (
                <>
                  <button
                    type="button"
                    className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                    onClick={() => importRef.current?.click()}
                  >
                    Import JSON
                  </button>
                  <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={importBackup} />
                </>
              ) : (
                <p className="mt-4 text-xs text-amber-700">View-only access: JSON restore is disabled.</p>
              )}
            </article>
          </div>
        </div>
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Programme summary</h3>
        <dl className="mt-4 space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-2">
            <dt>Programme</dt>
            <dd className="font-semibold text-slate-900">{programme?.name ?? "Unknown"}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>Years</dt>
            <dd className="font-semibold text-slate-900">{programme?.years ?? 0}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>Modules</dt>
            <dd className="font-semibold text-slate-900">{modules.length}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>Learning outcomes</dt>
            <dd className="font-semibold text-slate-900">{learningOutcomes.length}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>Assessments</dt>
            <dd className="font-semibold text-slate-900">{assessments.length}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

export default function ImplementPage() {
  return (
    <Suspense fallback={null}>
      <ImplementPageContent />
    </Suspense>
  );
}
