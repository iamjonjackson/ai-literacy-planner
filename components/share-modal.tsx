"use client";

import { useCallback, useEffect, useState } from "react";
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
  canManagePublic: boolean;
  isPublicEnabled: boolean;
  shareUrl: string | null;
  onTogglePublic: (enabled: boolean) => void;
};

export function ShareModal({
  open,
  onClose,
  programmeId,
  programmeName,
  canManagePublic,
  isPublicEnabled,
  shareUrl,
  onTogglePublic,
}: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const loadCollaborators = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase
      .from("programme_access")
      .select("grantee_email, role, grantee_id, accepted_at")
      .eq("programme_id", programmeId)
      .order("grantee_email", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setCollaborators(
      (data ?? []).map((row: Record<string, unknown>) => ({
        email: String(row.grantee_email ?? ""),
        role: (row.role as "viewer" | "editor") ?? "viewer",
        status: row.grantee_id || row.accepted_at ? "active" : "pending",
      })),
    );
  }, [programmeId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadCollaborators();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadCollaborators, open]);

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
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setStatus("error");
        setErrorMessage(userError?.message ?? "You must be signed in to share this programme.");
        return;
      }

      const { error } = await supabase.from("programme_access").upsert(
        {
          programme_id: programmeId,
          granted_by: user.id,
          grantee_email: email.trim().toLowerCase(),
          role,
        },
        { onConflict: "programme_id,grantee_email" },
      );

      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }

      await loadCollaborators();
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
      await loadCollaborators();
      return;
    }

    setCollaborators((prev) => prev.filter((c) => c.email !== granteeEmail));
  };

  return (
    <Modal open={open} onClose={onClose} title={`Share — ${programmeName}`} className="max-w-lg">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Public readonly link</p>
            <p className="text-xs text-slate-600">
              Anyone with the link can view this programme and export data, but cannot edit.
            </p>
          </div>
          <button
            type="button"
            disabled={!canManagePublic}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isPublicEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
            } disabled:opacity-60`}
            onClick={() => onTogglePublic(!isPublicEnabled)}
          >
            {isPublicEnabled ? "Public ON" : "Public OFF"}
          </button>
        </div>
        {isPublicEnabled ? (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl ?? ""}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            />
            <button
              type="button"
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              onClick={() => {
                if (shareUrl) {
                  navigator.clipboard.writeText(shareUrl).catch(() => {});
                }
              }}
            >
              Copy
            </button>
          </div>
        ) : null}
      </div>

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
