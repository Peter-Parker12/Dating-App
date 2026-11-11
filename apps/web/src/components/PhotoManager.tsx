"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { compressImage } from "@/lib/imageCompress";
import { uploadFile } from "@/lib/uploadFile";
import { useI18n, type Key } from "@/lib/i18n";

interface PhotoRef { id: string; hidden: boolean; hiddenReason: string | null }
interface Mine { max: number; profile: PhotoRef | null; gallery: PhotoRef[] }
interface Pending { key: string; name: string; progress: number; preview: string; error?: string }

const ERRORS: Record<string, Key> = {
  gallery_full: "photos.err.gallery_full", file_too_large: "photos.err.file_too_large", bad_file_type: "photos.err.bad_file_type", network: "photos.err.network",
};

/** Profile photo (one) and gallery (up to 6). Photos are shrunk in the browser, then uploaded in parallel. */
export default function PhotoManager({ isTalent }: { isTalent: boolean }) {
  const { t } = useI18n();
  const [mine, setMine] = useState<Mine | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [profilePending, setProfilePending] = useState<Pending | null>(null);
  const [msg, setMsg] = useState("");
  const seq = useRef(0);

  const load = useCallback(() => api<Mine>("/me/photos").then(setMine).catch(() => {}), []);
  useEffect(() => { void load(); }, [load]);
  if (!mine) return null;

  const fail = (code?: string) => setMsg(t(ERRORS[code ?? ""] ?? "photos.err.error"));
  const slotsLeft = mine.max - mine.gallery.length - pending.filter((p) => !p.error).length;

  const uploadProfile = async (file: File) => {
    setMsg("");
    const preview = URL.createObjectURL(file);
    setProfilePending({ key: "p", name: file.name, progress: 0, preview });
    const body = await compressImage(file, 900, 0.85);
    const r = await uploadFile("/api/me/photos/profile", body, body === file ? file.name : "profile.jpg", (progress) => setProfilePending((p) => p && { ...p, progress }));
    URL.revokeObjectURL(preview);
    setProfilePending(null);
    if (r.ok) await load(); else fail(r.code);
  };

  const uploadGallery = async (files: File[]) => {
    setMsg("");
    const batch = files.slice(0, Math.max(0, slotsLeft));
    if (files.length > batch.length) setMsg(t("photos.err.gallery_full"));
    await Promise.all(batch.map(async (file) => {
      const key = `g${++seq.current}`;
      const preview = URL.createObjectURL(file);
      setPending((p) => [...p, { key, name: file.name, progress: 0, preview }]);
      const body = await compressImage(file, 1400, 0.82);
      const r = await uploadFile("/api/me/photos/gallery", body, body === file ? file.name : "photo.jpg", (progress) => setPending((p) => p.map((x) => (x.key === key ? { ...x, progress } : x))));
      if (r.ok) { URL.revokeObjectURL(preview); setPending((p) => p.filter((x) => x.key !== key)); await load(); }
      else { setPending((p) => p.map((x) => (x.key === key ? { ...x, error: r.code ?? "error" } : x))); fail(r.code); }
    }));
  };

  const remove = async (id: string) => { await api(`/me/photos/${id}`, { method: "DELETE" }).catch(() => {}); await load(); };
  const dismiss = (key: string) => setPending((p) => p.filter((x) => x.key !== key));

  const tile = "relative aspect-square overflow-hidden rounded-md border border-line bg-brand-50";
  const Badge = ({ p }: { p: PhotoRef }) => p.hidden ? (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/70 p-1 text-center text-[11px] font-bold text-white">
      {t("photos.removed")}{p.hiddenReason && <span className="mt-0.5 font-normal">{p.hiddenReason}</span>}
    </div>
  ) : null;

  return (
    <section id="photos" className="card space-y-4">
      <div>
        <h2 className="font-bold text-ink">{t("photos.title")}</h2>
        <p className="mt-1 text-xs text-muted">{t(isTalent ? "photos.hintTalent" : "photos.hintCustomer")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-2 border-brand-200 bg-brand-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {profilePending ? <img src={profilePending.preview} alt="" className="h-full w-full object-cover opacity-60" />
            : mine.profile ? <img src={`/api/photos/${mine.profile.id}`} alt="" className="h-full w-full object-cover" /> : null}
          {mine.profile && <Badge p={mine.profile} />}
          {profilePending && <div className="absolute inset-x-0 bottom-0 bg-white/80 py-0.5 text-center text-[11px] font-bold text-brand-600">{profilePending.progress}%</div>}
        </div>
        <div className="space-y-1.5">
          <div className="text-sm font-bold text-ink">{t("photos.profile")}</div>
          <label className="btn-soft cursor-pointer !py-1.5">
            <Upload size={14} /> {mine.profile ? t("photos.change") : t("photos.upload")}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t("photos.profile")}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadProfile(f); e.target.value = ""; }} />
          </label>
          {mine.profile && <button type="button" onClick={() => void remove(mine.profile!.id)} className="ml-2 inline-flex items-center gap-1 text-xs text-muted hover:text-red-600"><Trash2 size={12} />{t("photos.delete")}</button>}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <div className="text-sm font-bold text-ink">{t("photos.gallery")} <span className="font-normal text-muted">{mine.gallery.length}/{mine.max}</span></div>
          <label className={`btn-soft !py-1.5 ${slotsLeft > 0 ? "cursor-pointer" : "pointer-events-none opacity-50"}`}>
            <ImagePlus size={14} /> {t("photos.add")}
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t("photos.gallery")} disabled={slotsLeft <= 0}
              onChange={(e) => { void uploadGallery(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {mine.gallery.map((p) => (
            <div key={p.id} className={tile}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${p.id}`} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              <Badge p={p} />
              <button type="button" onClick={() => void remove(p.id)} aria-label={t("photos.delete")} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-red-600 shadow hover:bg-white"><Trash2 size={13} /></button>
            </div>
          ))}
          {pending.map((p) => (
            <div key={p.key} className={tile}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="h-full w-full object-cover opacity-50" />
              {p.error
                ? <button type="button" onClick={() => dismiss(p.key)} className="absolute inset-0 flex items-center justify-center bg-red-50/90 p-1 text-center text-[11px] font-bold text-red-600">{t(ERRORS[p.error] ?? "photos.err.error")}</button>
                : <div className="absolute inset-x-1 bottom-1 h-1.5 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${p.progress}%` }} /></div>}
            </div>
          ))}
        </div>
      </div>
      {msg && <p className="text-sm text-red-600" role="alert">{msg}</p>}
    </section>
  );
}
