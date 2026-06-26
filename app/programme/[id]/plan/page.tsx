"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAppData, type Module } from "@/lib/app-data";
import { Modal, ConfirmModal } from "@/components/modal";

type EditModuleState = {
  open: boolean;
  module: Module | null;
  name: string;
  code: string;
  credits: string;
  description: string;
  year: number;
};

type BulkConfirmState = {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
};

type ResultState = {
  open: boolean;
  message: string;
};

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

  const [editState, setEditState] = useState<EditModuleState>({
    open: false,
    module: null,
    name: "",
    code: "",
    credits: "",
    description: "",
    year: 1,
  });

  const [bulkConfirm, setBulkConfirm] = useState<BulkConfirmState>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    module: Module | null;
    message: string;
  }>({ open: false, module: null, message: "" });

  const [resultState, setResultState] = useState<ResultState>({ open: false, message: "" });

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

  const openEditModal = (module: Module) => {
    setEditState({
      open: true,
      module,
      name: module.name,
      code: module.code ?? "",
      credits: module.credits ?? "",
      description: module.description ?? "",
      year: module.year,
    });
  };

  const handleEditSave = () => {
    if (!editState.module || !editState.name.trim()) return;
    updateModule(editState.module.id, {
      name: editState.name.trim(),
      code: editState.code.trim(),
      credits: editState.credits.trim(),
      description: editState.description.trim(),
    });
    setEditState((s) => ({ ...s, open: false }));
  };

  const openDeleteModule = (module: Module) => {
    const impact = getModuleDeletionImpact(module.id);
    if (!impact) return;

    if (!impact.canDelete) {
      setResultState({
        open: true,
        message:
          "This module has assessments with ratings — remove the ratings first before deleting the module.",
      });
      return;
    }

    const msg =
      impact.mappedLearningOutcomeCount > 0
        ? `This module has ${impact.mappedLearningOutcomeCount} LO${
            impact.mappedLearningOutcomeCount !== 1 ? "s" : ""
          } mapped to it. They will be unmapped (not deleted). Delete this module?`
        : "Delete this module?";

    setDeleteConfirm({ open: true, module, message: msg });
  };

  const openClearYear = (year: number) => {
    const yearModules = modulesByYear.get(year) ?? [];
    if (yearModules.length === 0) return;

    const impacts = yearModules
      .map((m) => getModuleDeletionImpact(m.id))
      .filter((i) => i !== null);
    const deletableCount = impacts.filter((i) => i?.canDelete).length;
    const skippedCount = impacts.length - deletableCount;

    setBulkConfirm({
      open: true,
      title: `Clear Year ${year}`,
      message: `${deletableCount} module${deletableCount !== 1 ? "s" : ""} will be deleted and ${skippedCount} protected module${skippedCount !== 1 ? "s" : ""} will be kept.`,
      onConfirm: () => {
        const result = clearModulesForYear(programmeId, year);
        setResultState({
          open: true,
          message: `${result.deletedCount} module${result.deletedCount !== 1 ? "s" : ""} deleted. ${
            result.skippedCount
          } skipped${result.skippedCount > 0 ? " because they have assessment ratings." : "."}`,
        });
      },
    });
  };

  const openResetStructure = () => {
    const totalModules = modules.length;
    if (totalModules === 0) return;

    const impacts = modules
      .map((m) => getModuleDeletionImpact(m.id))
      .filter((i) => i !== null);
    const deletableCount = impacts.filter((i) => i?.canDelete).length;
    const skippedCount = impacts.length - deletableCount;

    setBulkConfirm({
      open: true,
      title: "Reset structure",
      message: `${deletableCount} module${deletableCount !== 1 ? "s" : ""} will be deleted and ${skippedCount} protected module${skippedCount !== 1 ? "s" : ""} will be kept. This cannot be undone.`,
      onConfirm: () => {
        const result = resetProgrammeModules(programmeId);
        setResultState({
          open: true,
          message: `${result.deletedCount} module${result.deletedCount !== 1 ? "s" : ""} deleted. ${
            result.skippedCount
          } skipped${result.skippedCount > 0 ? " because they have assessment ratings." : "."}`,
        });
      },
    });
  };

  const openRemoveYear = () => {
    if (programme.years <= 1) return;
    const modulesInLastYear = modulesByYear.get(programme.years) ?? [];
    if (modulesInLastYear.length === 0) {
      updateProgrammeYears(programmeId, programme.years - 1);
      return;
    }

    setBulkConfirm({
      open: true,
      title: `Remove Year ${programme.years}`,
      message: `${modulesInLastYear.length} module${modulesInLastYear.length !== 1 ? "s" : ""} in Year ${programme.years} will be removed.`,
      onConfirm: () => updateProgrammeYears(programmeId, programme.years - 1),
    });
  };

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
                  onClick={openRemoveYear}
                >
                  Remove year
                </button>
                <button
                  className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                  type="button"
                  onClick={openResetStructure}
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
                  onClick={() => openClearYear(year)}
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

                    {module.url ? (
                      <a
                        href={module.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-md font-semibold hover:!underline"
                      >
                        {module.code} {module.name}
                      </a>
                    ) : (
                      <h4 className="text-md font-semibold text-slate-900">{module.code} {module.name}</h4>
                    )}
{/* 
                <h4 className="font-semibold text-slate-900">{module.name}</h4>
                <p className="mt-1 text-xs text-slate-500">{module.code || "No code"}</p> */}
                <p className="mt-1 text-xs text-slate-500">Credits: {module.credits || "-"}</p>
                {module.description ? (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{module.description}</p>
                ) : null}
                {!isViewer ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                      onClick={() => openEditModal(module)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
                      onClick={() => openDeleteModule(module)}
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

      {/* Edit module modal */}
      <Modal
        open={editState.open}
        onClose={() => setEditState((s) => ({ ...s, open: false }))}
        title="Edit module"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleEditSave();
          }}
        >
          <label className="block text-sm font-medium text-slate-700">
            Module name <span className="text-red-500">*</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={editState.name}
              onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Module code
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. CS101"
              value={editState.code}
              onChange={(e) => setEditState((s) => ({ ...s, code: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Credits
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. 30"
              value={editState.credits}
              onChange={(e) => setEditState((s) => ({ ...s, credits: e.target.value }))}
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
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
              onClick={() => setEditState((s) => ({ ...s, open: false }))}
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

      {/* Delete module confirmation */}
      <ConfirmModal
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm((s) => ({ ...s, open: false }))}
        onConfirm={() => {
          if (deleteConfirm.module) deleteModule(deleteConfirm.module.id);
        }}
        title="Delete module"
        message={deleteConfirm.message}
        confirmLabel="Delete module"
      />

      {/* Bulk action confirmation */}
      <ConfirmModal
        open={bulkConfirm.open}
        onClose={() => setBulkConfirm((s) => ({ ...s, open: false }))}
        onConfirm={bulkConfirm.onConfirm}
        title={bulkConfirm.title}
        message={bulkConfirm.message}
        confirmLabel="Confirm"
      />

      {/* Result / info modal */}
      <Modal
        open={resultState.open}
        onClose={() => setResultState({ open: false, message: "" })}
        title="Result"
        className="max-w-md"
      >
        <p className="text-sm leading-6 text-slate-700">{resultState.message}</p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={() => setResultState({ open: false, message: "" })}
          >
            OK
          </button>
        </div>
      </Modal>
    </div>
  );
}
