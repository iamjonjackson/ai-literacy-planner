"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { getSupabaseClient } from "@/lib/supabase";

type Collaborator = {
  email: string;
  role: "viewer" | "editor";
  status: "pending" | "active";
};

type ShareModalProps = {
  open: boolean;
  onClose: () => void;
  programmeId: string;
  programmeName: string;
};

export function ShareModal({ open, onClose, programmeId, programmeName }: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || status === "sending") return;

    setStatus("sending");
    setErrorMessage("");

    const supabase = getSupabaseClient();

    if (!supabase) {
      // Local-only mode — simulate success
      setCollaborators((prev) => [
        ...prev.filter((c) => c.email !== email.trim()),
        { email: email.trim(), role, status: "pending" },
      ]);
      setEmail("");
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
      return;
    }

    try {
      const { error } = await supabase.from("programme_access").upsert(
        {
          programme_id: programmeId,
          grantee_email: email.trim(),
          role,
        },
        { onConflict: "programme_id,grantee_email" },
      );

      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }

      setCollaborators((prev) => [
        ...prev.filter((c) => c.email !== email.trim()),
        { email: email.trim(), role, status: "pending" },
      ]);
      setEmail("");
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to send invite.");
    }
  };

  const handleRevoke = async (granteeEmail: string) => {
    const supabase = getSupabaseClient();

    if (supabase) {
      await supabase
        .from("programme_access")
        .delete()
        .eq("programme_id", programmeId)
        .eq("grantee_email", granteeEmail);
    }

    setCollaborators((prev) => prev.filter((c) => c.email !== granteeEmail));
  };

  return (
    <Modal open={open} onClose={onClose} title={`Share — ${programmeName}`} className="max-w-lg">
      <p className="text-sm text-slate-600">
        Invite collaborators by email. They will receive a magic link to access this programme.
      </p>

      <form className="mt-4 space-y-3" onSubmit={handleInvite}>
        <div className="flex gap-2">
          <input
            type="email"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="colleague@example.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === "sending"}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as "viewer" | "editor")}
            disabled={status === "sending"}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Invite"}
          </button>
        </div>
        {status === "success" && (
          <p className="text-xs text-emerald-700">Invite sent successfully.</p>
        )}
        {status === "error" && (
          <p className="text-xs text-red-700">{errorMessage}</p>
        )}
      </form>

      <div className="mt-2 text-xs text-slate-500">
        <strong>Viewer</strong> — can view all tabs but cannot edit.{" "}
        <strong>Editor</strong> — can edit modules, LOs, and assessments.
      </div>

      {collaborators.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-700">Collaborators</h3>
          <ul className="mt-2 space-y-2">
            {collaborators.map((c) => (
              <li
                key={c.email}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-slate-900">{c.email}</span>
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-600">
                    {c.role}
                  </span>
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      c.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {c.status === "active" ? "Active" : "Pending"}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-red-600 hover:text-red-800"
                  onClick={() => handleRevoke(c.email)}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
