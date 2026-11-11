"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, ApiError } from "./api";
import { useAuth } from "./auth";
import { compressImage } from "./imageCompress";

export type DocKind = "id" | "student" | "profile";
export const DOC_KINDS: DocKind[] = ["id", "student", "profile"];
export type Phase = "idle" | "compressing" | "uploading" | "done" | "error";
export interface Slot { phase: Phase; progress: number; name?: string; preview?: string; error?: string }

const EMPTY: Slot = { phase: "idle", progress: 0 };
const HAS_FLAG = { id: "hasId", student: "hasStudentCard", profile: "hasProfileImage" } as const;

interface Ctx {
  slots: Record<DocKind, Slot>;
  pick: (kind: DocKind, file: File) => void;
  retry: (kind: DocKind) => void;
  remove: (kind: DocKind) => Promise<void>;
  /** The user pressed "submit": the request is sent automatically as soon as every upload has finished. */
  submitQueued: boolean;
  submitError: string | null;
  requestSubmit: () => void;
  cancelSubmit: () => void;
  busy: boolean;
  progress: number;
}

const Uploads = createContext<Ctx | null>(null);
export const useUploads = () => { const c = useContext(Uploads); if (!c) throw new Error("UploadProvider missing"); return c; };

const blank = (): Record<DocKind, Slot> => ({ id: EMPTY, student: EMPTY, profile: EMPTY });

/**
 * Lives above the pages so uploads keep running while the user browses elsewhere in the app. Each document is
 * uploaded on its own, in parallel, as soon as it is chosen; "submit" then only has to flip the status.
 */
export function UploadProvider({ children }: { children: ReactNode }) {
  const { me, refresh } = useAuth();
  const [slots, setSlots] = useState(blank);
  const [submitQueued, setSubmitQueued] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const xhrs = useRef<Partial<Record<DocKind, XMLHttpRequest>>>({});
  const originals = useRef<Partial<Record<DocKind, File>>>({});
  const submitting = useRef(false);
  const previews = useRef<string[]>([]);

  const patch = useCallback((kind: DocKind, p: Partial<Slot>) => setSlots((s) => ({ ...s, [kind]: { ...s[kind], ...p } })), []);

  // Reset when the account changes, and mirror documents the server already has (for example after a reload).
  const userId = me?.id;
  const status = me?.kycStatus;
  const editable = status === "PENDING" || status === "REJECTED";
  useEffect(() => {
    Object.values(xhrs.current).forEach((x) => x?.abort());
    xhrs.current = {}; originals.current = {};
    setSlots(blank()); setSubmitQueued(false); setSubmitError(null);
  }, [userId]);
  useEffect(() => {
    if (!me) return;
    setSlots((s) => {
      const next = { ...s };
      for (const k of DOC_KINDS) {
        const has = editable && me[HAS_FLAG[k]];
        if (has && s[k].phase === "idle") next[k] = { phase: "done", progress: 100, preview: `/api/kyc/documents/${k}?v=${Date.now()}` };
        if (!editable && s[k].phase !== "idle") next[k] = EMPTY;
      }
      return next;
    });
    if (!editable) { setSubmitQueued(false); }
  }, [me, editable]);
  useEffect(() => () => previews.current.forEach(URL.revokeObjectURL), []);

  const upload = useCallback(async (kind: DocKind, file: File) => {
    originals.current[kind] = file;
    xhrs.current[kind]?.abort();
    const preview = URL.createObjectURL(file);
    previews.current.push(preview);
    setSlots((s) => ({ ...s, [kind]: { phase: "compressing", progress: 0, name: file.name, preview } }));
    const body = await compressImage(file);
    const fd = new FormData();
    fd.append("file", body, body === file ? file.name : `${kind}.jpg`);
    patch(kind, { phase: "uploading", progress: 0, error: undefined });
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhrs.current[kind] = xhr;
      xhr.open("POST", `/api/kyc/documents/${kind}`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) patch(kind, { progress: Math.min(99, Math.round((e.loaded / e.total) * 100)) }); };
      xhr.onload = () => {
        if (xhr.status === 200) { patch(kind, { phase: "done", progress: 100 }); void refresh(); }
        else {
          let code = "error";
          try { code = (JSON.parse(xhr.responseText) as { error?: string }).error ?? code; } catch {}
          patch(kind, { phase: "error", error: code });
        }
        resolve();
      };
      xhr.onerror = () => { patch(kind, { phase: "error", error: "network" }); resolve(); };
      xhr.onabort = () => resolve();   // replaced by a newer pick: the newer upload owns the slot now
      xhr.send(fd);
    });
  }, [patch, refresh]);

  const pick = useCallback((kind: DocKind, file: File) => { void upload(kind, file); }, [upload]);
  const retry = useCallback((kind: DocKind) => { const f = originals.current[kind]; if (f) void upload(kind, f); }, [upload]);
  const remove = useCallback(async (kind: DocKind) => {
    xhrs.current[kind]?.abort();
    delete originals.current[kind];
    setSlots((s) => ({ ...s, [kind]: EMPTY }));
    await api(`/kyc/documents/${kind}`, { method: "DELETE" }).catch(() => {});
    await refresh();
  }, [refresh]);

  const allDone = DOC_KINDS.every((k) => slots[k].phase === "done");
  const busy = DOC_KINDS.some((k) => slots[k].phase === "compressing" || slots[k].phase === "uploading");
  const active = DOC_KINDS.filter((k) => slots[k].phase !== "idle");
  const progress = active.length ? Math.round(active.reduce((n, k) => n + (slots[k].phase === "done" ? 100 : slots[k].phase === "uploading" ? slots[k].progress : 0), 0) / active.length) : 0;

  // Send the submit request the moment the last upload completes.
  useEffect(() => {
    if (!submitQueued || !allDone || submitting.current) return;
    submitting.current = true;
    api("/kyc/submit", { method: "POST" })
      .then(() => { setSubmitQueued(false); return refresh(); })
      .catch((e) => { setSubmitQueued(false); setSubmitError(e instanceof ApiError ? e.code : "error"); })
      .finally(() => { submitting.current = false; });
  }, [submitQueued, allDone, refresh]);

  // Closing the tab would lose uploads that are still running.
  useEffect(() => {
    if (!busy && !submitQueued) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, submitQueued]);

  const value = useMemo<Ctx>(() => ({
    slots, pick, retry, remove, submitQueued, submitError, busy, progress,
    requestSubmit: () => { setSubmitError(null); setSubmitQueued(true); },
    cancelSubmit: () => setSubmitQueued(false),
  }), [slots, pick, retry, remove, submitQueued, submitError, busy, progress]);

  return <Uploads.Provider value={value}>{children}</Uploads.Provider>;
}
