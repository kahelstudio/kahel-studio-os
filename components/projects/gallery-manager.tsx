"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Archive, ArrowDown, ArrowUp, Check, ChevronRight, CircleAlert, FolderOpen, ImageIcon, Mail, Plus, RefreshCw, Save, Search, Send, X } from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";
import { GalleryUploader } from "./gallery-uploader";
import { ClientEmailHistory } from "@/components/messages/client-email-history";

type Project = { id: string; client_id: string; reference: string; title: string; status: string };
type Client = { id: string; name: string; status: string };
type Media = { id?: string; original_filename?: string; filename?: string; status?: string; processing_failure_message?: string; mime_type?: string; focal_x?: number | null; focal_y?: number | null };
type Asset = { id: string; media_asset_id?: string; sort_order: number; alt_text?: string | null; caption?: string | null; approval_status?: string; downloadable?: boolean; media?: Media | null };
type Gallery = { id: string; client_id: string; project_id: string; title: string; description: string | null; status?: string; published?: boolean; downloads_enabled?: boolean; watermark_enabled?: boolean; updated_at?: string; assets: Asset[] };
type Payload = { galleries: Gallery[]; projects: Project[]; clients: Client[]; permissions: string[]; role: string };

function galleryStatus(gallery: Gallery) {
  return gallery.status ?? (gallery.published ? "published" : "draft");
}

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Request failed.");
  return body;
}

export function GalleryManager() {
  const [data, setData] = useState<Payload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(preferredId?: string) {
    try {
      const response = await api("/api/media/admin/galleries") as unknown as Payload;
      setData(response);
      setError("");
      setSelectedId((current) => preferredId ?? current ?? response.galleries[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load galleries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api("/api/media/admin/galleries")
      .then((response) => {
        if (!active) return;
        const initial = response as unknown as Payload;
        setData(initial);
        setSelectedId(initial.galleries[0]?.id ?? null);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load galleries.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const selected = data?.galleries.find((gallery) => gallery.id === selectedId) ?? null;
  const elevated = data?.role === "super_admin" || data?.role === "admin";
  const canManage = elevated || data?.permissions.includes("galleries.manage");
  const canPublish = data?.role === "super_admin" || data?.permissions.includes("galleries.publish") || (data?.role === "admin" && data.permissions.includes("galleries.manage"));
  const filtered = data?.galleries.filter((gallery) => {
    const project = data.projects.find((item) => item.id === gallery.project_id);
    const client = data.clients.find((item) => item.id === gallery.client_id);
    return `${gallery.title} ${project?.reference ?? ""} ${client?.name ?? ""}`.toLowerCase().includes(query.toLowerCase());
  }) ?? [];

  if (loading) return <div className="p-6 text-sm text-[var(--color-text-secondary)] sm:p-10">Loading galleries...</div>;
  if (error && !data) return <div className="grid min-h-[60dvh] place-items-center p-5"><div className="max-w-md rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center"><CircleAlert className="mx-auto h-6 w-6 text-[var(--color-danger-text)]" /><h1 className="mt-3 font-display text-xl font-semibold">Gallery access unavailable</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">{error}</p><Link href="/login" className="mt-5 inline-flex min-h-11 items-center rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white">Staff sign in</Link></div></div>;

  return <div className="min-w-0 p-4 pb-14 sm:p-8 lg:p-10">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]"><ImageIcon className="h-3.5 w-3.5 text-[var(--color-kahel-500)]" /> Client delivery</div><h1 className="mt-2 font-display text-[32px] font-semibold tracking-[-0.025em] sm:text-[36px]">Galleries</h1><p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Prepare, approve and publish canonical project galleries.</p></div>
      {canManage ? <button type="button" onClick={() => setCreating(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> New gallery</button> : null}
    </header>
    <div className="mt-7 grid min-w-0 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="min-w-0 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto">
        <label className="flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border)] px-3"><Search className="h-4 w-4 text-[var(--color-text-muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search galleries" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        <div className="mt-3 space-y-1">{filtered.map((gallery) => { const project = data?.projects.find((item) => item.id === gallery.project_id); return <button type="button" key={gallery.id} onClick={() => setSelectedId(gallery.id)} className={`flex min-h-14 w-full items-center gap-3 rounded-control px-3 py-2.5 text-left ${selectedId === gallery.id ? "bg-[var(--color-kahel-100)] text-[var(--color-kahel-700)]" : "hover:bg-[var(--color-surface-muted)]"}`}><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{gallery.title}</span><span className="mt-0.5 block text-xs opacity-70">{project?.reference ?? "Project"} · {gallery.assets.length} files</span></span><ChevronRight className="h-4 w-4 shrink-0" /></button>; })}</div>
        {!filtered.length && <div className="px-3 py-10 text-center text-sm text-[var(--color-text-secondary)]">No galleries found.</div>}
      </aside>
      <main className="min-w-0">{selected ? <GalleryEditor key={`${selected.id}-${selected.updated_at ?? ""}`} gallery={selected} data={data as Payload} canManage={Boolean(canManage)} canPublish={Boolean(canPublish)} onReload={() => load(selected.id)} /> : <div className="grid min-h-72 place-items-center rounded-card border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center"><div><FolderOpen className="mx-auto h-6 w-6 text-[var(--color-text-muted)]" /><h2 className="mt-3 font-display text-xl font-semibold">Create the first gallery</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Choose a canonical project and client to begin.</p></div></div>}</main>
    </div>
    {creating && data && <CreateGallery data={data} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); void load(id); }} />}
  </div>;
}

function GalleryEditor({ gallery, data, canManage, canPublish, onReload }: { gallery: Gallery; data: Payload; canManage: boolean; canPublish: boolean; onReload: () => void }) {
  const { fireToast } = useToast();
  const [title, setTitle] = useState(gallery.title);
  const [description, setDescription] = useState(gallery.description ?? "");
  const [downloads, setDownloads] = useState(gallery.downloads_enabled ?? false);
  const [watermark, setWatermark] = useState(gallery.watermark_enabled ?? true);
  const [assets, setAssets] = useState(gallery.assets);
  const [pending, setPending] = useState(false);
  const status = galleryStatus(gallery);
  const project = data.projects.find((item) => item.id === gallery.project_id);
  const client = data.clients.find((item) => item.id === gallery.client_id);

  async function mutate(body: Record<string, unknown>, success: string) {
    setPending(true);
    try { await api(`/api/media/admin/galleries/${gallery.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); fireToast(success, "success"); onReload(); }
    catch (error) { fireToast(error instanceof Error ? error.message : "Gallery update failed.", "danger"); }
    finally { setPending(false); }
  }

  async function action(name: "publish" | "unpublish" | "archive" | "resend-email") {
    if ((name === "archive" || name === "unpublish") && !window.confirm(`${name === "archive" ? "Archive" : "Unpublish"} this gallery?`)) return;
    setPending(true);
    try { await api(`/api/media/admin/galleries/${gallery.id}/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); fireToast(name === "resend-email" ? "Gallery email queued." : name === "publish" ? "Gallery published." : name === "unpublish" ? "Gallery unpublished." : "Gallery archived.", "success"); onReload(); }
    catch (error) { fireToast(error instanceof Error ? error.message : "Gallery action failed.", "danger"); }
    finally { setPending(false); }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= assets.length) return;
    const next = [...assets];
    [next[index], next[target]] = [next[target], next[index]];
    setAssets(next);
    void mutate({ assetOrder: next.map((asset) => asset.id) }, "Asset order saved.");
  }

  return <div className="space-y-5">
    <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4"><div><div className="text-xs font-semibold text-[var(--color-text-muted)]">{project?.reference} · {client?.name}</div><h2 className="mt-1 font-display text-2xl font-semibold">{gallery.title}</h2></div><span className={`rounded-pill px-3 py-1.5 text-xs font-bold uppercase tracking-[0.06em] ${status === "published" ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]" : status === "archived" ? "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]" : "bg-[var(--color-info-bg)] text-[var(--color-info-text)]"}`}>{status}</span></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Title<input value={title} onChange={(event) => setTitle(event.target.value)} disabled={!canManage || status === "archived"} className="mt-1.5 min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-normal outline-none focus:border-[var(--color-kahel-500)] disabled:opacity-60" /></label><label className="text-sm font-semibold sm:row-span-2">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={!canManage || status === "archived"} rows={5} className="mt-1.5 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] p-3 font-normal outline-none focus:border-[var(--color-kahel-500)] disabled:opacity-60" /></label><div className="grid gap-2"><Toggle label="Client downloads" checked={downloads} onChange={setDownloads} disabled={!canManage || status === "archived"} /><Toggle label="Apply watermark" checked={watermark} onChange={setWatermark} disabled={!canManage || status === "archived"} /></div></div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!canManage || pending || status === "archived"} onClick={() => void mutate({ title, description, downloadsEnabled: downloads, watermarkEnabled: watermark }, "Gallery settings saved.")} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" /> Save settings</button>{status !== "published" && status !== "archived" && <button type="button" disabled={!canPublish || pending} onClick={() => void action("publish")} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border-strong)] px-4 text-sm font-semibold disabled:opacity-50"><Send className="h-4 w-4" /> Publish</button>}{status === "published" && <><button type="button" disabled={!canPublish || pending} onClick={() => void action("resend-email")} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border-strong)] px-4 text-sm font-semibold disabled:opacity-50"><Mail className="h-4 w-4" /> Resend email</button><button type="button" disabled={!canPublish || pending} onClick={() => void action("unpublish")} className="inline-flex min-h-11 items-center gap-2 rounded-control px-4 text-sm font-semibold disabled:opacity-50">Unpublish</button></>}{status !== "published" && status !== "archived" && <button type="button" disabled={!canManage || pending} onClick={() => void action("archive")} className="inline-flex min-h-11 items-center gap-2 rounded-control px-4 text-sm font-semibold text-[var(--color-danger-text)] disabled:opacity-50"><Archive className="h-4 w-4" /> Archive</button>}</div>
    </section>
    <GalleryUploader galleryId={gallery.id} disabled={!canManage || status === "archived"} onComplete={onReload} />
    <ClientEmailHistory context={{ galleryId: gallery.id, projectId: gallery.project_id, clientId: gallery.client_id }} />
    <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5"><div className="flex items-end justify-between gap-3"><div><h3 className="font-display text-lg font-semibold">Gallery assets</h3><p className="mt-1 text-xs text-[var(--color-text-secondary)]">Only ready, approved assets can be published.</p></div><span className="text-xs font-semibold text-[var(--color-text-muted)]">{assets.length} files</span></div><div className="mt-4 space-y-3">{assets.map((asset, index) => <AssetEditor key={asset.id} asset={asset} first={index === 0} last={index === assets.length - 1} disabled={!canManage || pending || status === "archived"} onMove={(direction) => move(index, direction)} onSave={(update) => void mutate({ assetUpdates: [{ id: asset.id, ...update }] }, "Asset details saved.")} />)}{!assets.length && <div className="rounded-control border border-dashed border-[var(--color-border-strong)] px-5 py-10 text-center text-sm text-[var(--color-text-secondary)]">Upload files to begin assembling this gallery.</div>}</div></section>
  </div>;
}

function AssetEditor({ asset, first, last, disabled, onMove, onSave }: { asset: Asset; first: boolean; last: boolean; disabled: boolean; onMove: (direction: -1 | 1) => void; onSave: (update: Record<string, unknown>) => void }) {
  const [altText, setAltText] = useState(asset.alt_text ?? ""); const [caption, setCaption] = useState(asset.caption ?? ""); const [focalX, setFocalX] = useState(asset.media?.focal_x ?? 0.5); const [focalY, setFocalY] = useState(asset.media?.focal_y ?? 0.5); const [download, setDownload] = useState(asset.downloadable ?? false); const [approval, setApproval] = useState(asset.approval_status ?? "pending");
  const failed = asset.media?.status === "failed";
  return <article className="rounded-control border border-[var(--color-border)] p-3 sm:p-4"><div className="flex flex-wrap items-start gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-control bg-[var(--color-surface-muted)]"><ImageIcon className="h-5 w-5 text-[var(--color-text-muted)]" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{asset.media?.original_filename ?? asset.media?.filename ?? asset.media_asset_id ?? "Media asset"}</div><div className={`mt-1 text-xs ${failed ? "text-[var(--color-danger-text)]" : "text-[var(--color-text-secondary)]"}`}>{failed ? asset.media?.processing_failure_message ?? "Processing failed. Retry from the upload source." : `${asset.media?.status ?? "processing"} · ${asset.approval_status ?? "pending approval"}`}</div></div><div className="flex gap-1"><button type="button" disabled={first || disabled} onClick={() => onMove(-1)} aria-label="Move asset up" className="grid min-h-11 min-w-11 place-items-center rounded-control hover:bg-[var(--color-surface-muted)] disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={last || disabled} onClick={() => onMove(1)} aria-label="Move asset down" className="grid min-h-11 min-w-11 place-items-center rounded-control hover:bg-[var(--color-surface-muted)] disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button></div></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Alt text<input value={altText} onChange={(event) => setAltText(event.target.value)} disabled={disabled} className="mt-1 min-h-11 w-full rounded-control border border-[var(--color-border)] px-3 text-sm font-normal" /></label><label className="text-xs font-semibold">Caption<input value={caption} onChange={(event) => setCaption(event.target.value)} disabled={disabled} className="mt-1 min-h-11 w-full rounded-control border border-[var(--color-border)] px-3 text-sm font-normal" /></label><label className="text-xs font-semibold">Focal X ({Math.round(focalX * 100)}%)<input type="range" min="0" max="1" step="0.01" value={focalX} onChange={(event) => setFocalX(Number(event.target.value))} disabled={disabled} className="mt-2 min-h-11 w-full accent-[var(--color-kahel-500)]" /></label><label className="text-xs font-semibold">Focal Y ({Math.round(focalY * 100)}%)<input type="range" min="0" max="1" step="0.01" value={focalY} onChange={(event) => setFocalY(Number(event.target.value))} disabled={disabled} className="mt-2 min-h-11 w-full accent-[var(--color-kahel-500)]" /></label><label className="text-xs font-semibold">Approval<select value={approval} onChange={(event) => setApproval(event.target.value)} disabled={disabled} className="mt-1 min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><label className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={download} onChange={(event) => setDownload(event.target.checked)} disabled={disabled} className="h-5 w-5 accent-[var(--color-kahel-500)]" /> Allow this file to be downloaded</label><button type="button" disabled={disabled} onClick={() => onSave({ altText, caption, focalX, focalY, downloadEnabled: download, approvalStatus: approval })} className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-[var(--color-border-strong)] px-3 text-xs font-semibold disabled:opacity-50"><Check className="h-4 w-4" /> Save file</button></div></article>;
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled: boolean }) { return <label className="flex min-h-11 items-center justify-between rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} className="h-5 w-5 accent-[var(--color-kahel-500)]" /></label>; }

function CreateGallery({ data, onClose, onCreated }: { data: Payload; onClose: () => void; onCreated: (id: string) => void }) {
  const { fireToast } = useToast(); const [projectId, setProjectId] = useState(""); const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [pending, setPending] = useState(false); const project = data.projects.find((item) => item.id === projectId); const client = data.clients.find((item) => item.id === project?.client_id);
  async function create() { if (!project || !client) return; setPending(true); try { const result = await api("/api/media/admin/galleries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id, clientId: client.id, title, description, downloadsEnabled: false, watermarkEnabled: true }) }) as { gallery?: { id?: string } }; if (!result.gallery?.id) throw new Error("Gallery was created without an ID."); fireToast("Gallery created.", "success"); onCreated(result.gallery.id); } catch (error) { fireToast(error instanceof Error ? error.message : "Unable to create gallery.", "danger"); } finally { setPending(false); } }
  return <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center sm:p-5" role="dialog" aria-modal="true"><section className="max-h-[90dvh] w-full overflow-y-auto rounded-t-modal bg-[var(--color-surface)] p-5 shadow-[var(--shadow-dialog)] sm:max-w-lg sm:rounded-card"><div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-semibold">New gallery</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Link delivery to an existing canonical project.</p></div><button type="button" onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-control" aria-label="Close"><X className="h-4 w-4" /></button></div><label className="mt-5 block text-sm font-semibold">Project<select value={projectId} onChange={(event) => { const next = data.projects.find((item) => item.id === event.target.value); setProjectId(event.target.value); if (next && !title) setTitle(next.title); }} className="mt-1.5 min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal"><option value="">Choose a project</option>{data.projects.map((item) => <option key={item.id} value={item.id}>{item.reference} · {item.title}</option>)}</select></label>{client && <div className="mt-3 rounded-control bg-[var(--color-canvas)] p-3 text-sm"><span className="text-[var(--color-text-secondary)]">Client</span><span className="ml-2 font-semibold">{client.name}</span></div>}<label className="mt-3 block text-sm font-semibold">Gallery title<input value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-control border border-[var(--color-border)] px-3 font-normal" /></label><label className="mt-3 block text-sm font-semibold">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1.5 w-full rounded-control border border-[var(--color-border)] p-3 font-normal" /></label><button type="button" disabled={!project || !title.trim() || pending} onClick={() => void create()} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create gallery</button></section></div>;
}
