"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { buildProgrammeRoute } from "@/lib/programme";
import { useAppData } from "@/lib/app-data";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function DashboardPage() {
  const router = useRouter();
  const { state, createProgramme, deleteProgramme, renameProgramme, exportProgrammeBackup, importProgrammeBackup } =
    useAppData();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [years, setYears] = useState(3);
  const importRef = useRef<HTMLInputElement>(null);

  const programmes = useMemo(
    () => [...state.programmes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [state.programmes],
  );

  const countsByProgramme = useMemo(() => {
    return programmes.map((programme) => {
      const modules = state.modules.filter((module) => module.programmeId === programme.id);
      const learningOutcomes = state.learningOutcomes.filter(
        (learningOutcome) => learningOutcome.programmeId === programme.id,
      );
      const covered = new Set(
        learningOutcomes.filter((learningOutcome) => learningOutcome.competencyId).map((learningOutcome) => learningOutcome.competencyId),
      );

      return {
        programmeId: programme.id,
        modules: modules.length,
        coverage: Math.round((covered.size / 12) * 100),
      };
    });
  }, [programmes, state.modules, state.learningOutcomes]);

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length < 3) {
      return;
    }

    const programmeId = createProgramme({ name: name.trim(), description: description.trim(), years: Math.max(1, years) });
    setName("");
    setDescription("");
    setYears(3);
    router.push(buildProgrammeRoute(programmeId, "explore"));
  };

  const handleExport = (programmeId: string) => {
    const payload = exportProgrammeBackup(programmeId);
    if (!payload) {
      return;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const datePart = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `${payload.programme.name.replaceAll(/\s+/g, "-").toLowerCase()}-backup-${datePart}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const payload = JSON.parse(raw);
      const programmeId = importProgrammeBackup(payload);
      router.push(buildProgrammeRoute(programmeId, "explore"));
    } catch {
      window.alert("The selected file could not be imported.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <PageShell>
      <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:grid-cols-[2fr_1fr]">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Programmes</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Create, open, import, and manage programme workspaces for competency mapping.
          </p>
        </div>
        <form className="space-y-3 rounded-2xl bg-slate-50 p-4" onSubmit={handleCreate}>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">New programme</h2>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Programme name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <textarea
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
          />
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-600">
            Years
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              type="number"
              min={1}
              value={years}
              onChange={(event) => setYears(Number(event.target.value))}
            />
          </label>
          <div className="flex gap-2">
            <button className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700" type="submit">
              Create
            </button>
            <button
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
              type="button"
              onClick={() => importRef.current?.click()}
            >
              Import
            </button>
          </div>
          <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
        </form>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {programmes.map((programme) => {
          const counts = countsByProgramme.find((item) => item.programmeId === programme.id);

          return (
            <article key={programme.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{programme.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{programme.description || "No description yet."}</p>
                  {programme.role !== "owner" ? (
                    <p className="mt-2 text-xs text-slate-500">Owner: {programme.ownerEmail}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">Updated {formatDate(programme.updatedAt)}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {programme.role}
                </span>
              </div>
              <dl className="mt-6 grid grid-cols-3 gap-4 text-sm">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-slate-500">Years</dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-900">{programme.years}</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-slate-500">Modules</dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-900">{counts?.modules ?? 0}</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-slate-500">LO coverage</dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-900">{counts?.coverage ?? 0}%</dd>
                </div>
              </dl>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href={buildProgrammeRoute(programme.id, "explore")}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Open
                </Link>
                {programme.role === "owner" ? (
                  <>
                    <button
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                      onClick={() => {
                        const nextName = window.prompt("Rename programme", programme.name);
                        if (nextName?.trim()) {
                          renameProgramme(programme.id, nextName.trim());
                        }
                      }}
                      type="button"
                    >
                      Rename
                    </button>
                    <button
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                      onClick={() => handleExport(programme.id)}
                      type="button"
                    >
                      Export JSON
                    </button>
                    <button
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                      onClick={() => {
                        if (window.confirm("Delete this programme and all related data?")) {
                          deleteProgramme(programme.id);
                        }
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  </>
                ) : programme.role === "editor" ? (
                  <button
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                    onClick={() => handleExport(programme.id)}
                    type="button"
                  >
                    Export JSON
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </PageShell>
  );
}
