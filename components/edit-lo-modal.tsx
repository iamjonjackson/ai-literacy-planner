"use client";

import { useState } from "react";
import { frameworkCompetencies } from "@/lib/framework";
import { Modal } from "@/components/modal";

const loCategories = ["Disciplinary Skills", "Academic Content", "Attributes"] as const;

export type EditLoState = {
  open: boolean;
  loId: string;
  text: string;
  category: (typeof loCategories)[number];
  competencyId: string | null;
};

type EditLoModalProps = {
  state: EditLoState;
  onClose: () => void;
  onSave: (loId: string, text: string, category: (typeof loCategories)[number], competencyId: string | null) => void;
  title?: string;
};

export function EditLoModal({ state, onClose, onSave, title = "Edit learning outcome" }: EditLoModalProps) {
  const [editState, setEditState] = useState<EditLoState>(state);

  // Update internal state when external state changes (for opening modal)
  useState(() => {
    if (state.open) {
      setEditState(state);
    }
  }, [state, state.open]);

  const handleSave = () => {
    if (editState.text.trim().length < 10) return;
    onSave(editState.loId, editState.text.trim(), editState.category, editState.competencyId);
    onClose();
  };

  const isValid = editState.text.trim().length >= 10;

  return (
    <Modal open={state.open} onClose={onClose} title={title} className="max-w-lg">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Learning outcome text
          <textarea
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={4}
            minLength={10}
            value={editState.text}
            onChange={(e) => setEditState((s) => ({ ...s, text: e.target.value }))}
            required
          />
          {editState.text.trim().length > 0 && editState.text.trim().length < 10 ? (
            <p className="mt-1 text-xs text-red-600">Minimum 10 characters required.</p>
          ) : null}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Category
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={editState.category}
            onChange={(event) => setEditState((s) => ({ ...s, category: event.target.value as (typeof loCategories)[number] }))}
          >
            {loCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          UNESCO AI Competency (optional)
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={editState.competencyId ?? ""}
            onChange={(event) => setEditState((s) => ({ ...s, competencyId: event.target.value || null }))}
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

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
