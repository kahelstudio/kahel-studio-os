"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Download, Heart, X } from "lucide-react";
import Image from "next/image";
import type { PortalGalleryAsset } from "@/lib/server/customer-gallery-data";

type Props = {
  galleryId: string;
  title: string;
  assets: PortalGalleryAsset[];
  favoritesEnabled: boolean;
};

const focusableSelector = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";
const focusClass = "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF5300]/50";

export function CustomerGallery({ galleryId, title, assets, favoritesEnabled }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [favorites, setFavorites] = useState(() => new Set(assets.filter((asset) => asset.favorite).map((asset) => asset.id)));
  const [favoriteError, setFavoriteError] = useState("");
  const [, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const swipeStartRef = useRef<number | null>(null);

  function closeViewer() {
    setActiveIndex(null);
    requestAnimationFrame(() => restoreFocusRef.current?.focus());
  }
  function showPrevious() { setActiveIndex((index) => index === null ? null : (index - 1 + assets.length) % assets.length); }
  function showNext() { setActiveIndex((index) => index === null ? null : (index + 1) % assets.length); }

  const handleViewerKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") closeViewer();
    if (event.key === "ArrowLeft") showPrevious();
    if (event.key === "ArrowRight") showNext();
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  useEffect(() => {
    if (activeIndex === null) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    document.addEventListener("keydown", handleViewerKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleViewerKeyDown);
    };
  }, [activeIndex]);

  function openViewer(index: number) {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActiveIndex(index);
  }

  function toggleFavorite(assetId: string) {
    const wasFavorite = favorites.has(assetId);
    setFavoriteError("");
    setFavorites((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(assetId); else next.add(assetId);
      return next;
    });
    startTransition(async () => {
      const response = await fetch(`/api/customer/galleries/${encodeURIComponent(galleryId)}/favorites/${encodeURIComponent(assetId)}`, { method: wasFavorite ? "DELETE" : "POST" }).catch(() => null);
      if (response?.ok) return;
      setFavorites((current) => {
        const next = new Set(current);
        if (wasFavorite) next.add(assetId); else next.delete(assetId);
        return next;
      });
      setFavoriteError("Your favorite could not be updated. Please try again.");
    });
  }

  const activeAsset = activeIndex === null ? null : assets[activeIndex];
  return <>
    <p className="sr-only" aria-live="polite">{favoriteError}</p>
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3" aria-label={`${title} photographs`}>
      {assets.map((asset, index) => <figure key={asset.id} className="group relative overflow-hidden rounded-[8px] bg-surface-muted" style={{ aspectRatio: `${asset.width} / ${asset.height}`, backgroundColor: asset.dominantColor ?? undefined }}>
        <button type="button" onClick={() => openViewer(index)} className={`block h-full w-full cursor-zoom-in ${focusClass}`} aria-label={`View image ${index + 1} of ${assets.length}: ${asset.altText}`}>
          {/* Authenticated media must bypass Next image optimization because it does not forward request headers. */}
          <Image src={asset.gridUrl} alt={asset.altText} width={asset.width} height={asset.height} sizes="(min-width: 1024px) 33vw, 50vw" unoptimized className="h-full w-full object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.015]" />
        </button>
        {favoritesEnabled ? <button type="button" onClick={() => toggleFavorite(asset.id)} aria-pressed={favorites.has(asset.id)} aria-label={favorites.has(asset.id) ? "Remove from favorites" : "Add to favorites"} className={`absolute right-2 top-2 grid size-11 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/75 ${focusClass}`}><Heart className="size-5" fill={favorites.has(asset.id) ? "currentColor" : "none"} /></button> : null}
      </figure>)}
    </div>

    {activeAsset && activeIndex !== null ? <div ref={dialogRef} className="fixed inset-0 z-50 flex flex-col bg-[#0b0b0b] text-white" role="dialog" aria-modal="true" aria-label={`${title} image viewer`} onPointerDown={(event) => { swipeStartRef.current = event.pointerType === "touch" ? event.clientX : null; }} onPointerUp={(event) => { if (swipeStartRef.current === null) return; const distance = event.clientX - swipeStartRef.current; swipeStartRef.current = null; if (distance > 50) showPrevious(); if (distance < -50) showNext(); }}>
      <div className="flex min-h-16 items-center justify-between gap-3 px-3 sm:px-5">
        <span className="text-sm text-white/70">{activeIndex + 1} / {assets.length}</span>
        <div className="flex items-center gap-1">
          {favoritesEnabled ? <button type="button" onClick={() => toggleFavorite(activeAsset.id)} aria-pressed={favorites.has(activeAsset.id)} aria-label={favorites.has(activeAsset.id) ? "Remove from favorites" : "Add to favorites"} className={`grid size-11 place-items-center rounded-full hover:bg-white/10 ${focusClass}`}><Heart className="size-5" fill={favorites.has(activeAsset.id) ? "currentColor" : "none"} /></button> : null}
          {activeAsset.downloadUrl ? <a href={activeAsset.downloadUrl} download className={`grid size-11 place-items-center rounded-full hover:bg-white/10 ${focusClass}`} aria-label="Download image"><Download className="size-5" /></a> : null}
          <button type="button" onClick={closeViewer} className={`grid size-11 place-items-center rounded-full hover:bg-white/10 ${focusClass}`} aria-label="Close image viewer"><X className="size-6" /></button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 touch-pan-y">
        {assets.length > 1 ? <button type="button" onClick={showPrevious} className={`absolute left-2 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 hover:bg-black/80 sm:left-5 ${focusClass}`} aria-label="Previous image"><ChevronLeft className="size-7" /></button> : null}
        <Image key={activeAsset.id} src={activeAsset.previewUrl} alt={activeAsset.altText} width={activeAsset.width} height={activeAsset.height} sizes="100vw" unoptimized className="h-full w-full object-contain" />
        {assets.length > 1 ? <button type="button" onClick={showNext} className={`absolute right-2 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 hover:bg-black/80 sm:right-5 ${focusClass}`} aria-label="Next image"><ChevronRight className="size-7" /></button> : null}
      </div>
      <div className="min-h-16 px-4 py-3 text-center text-sm text-white/75">{activeAsset.caption || activeAsset.title || <span className="sr-only">{activeAsset.altText}</span>}</div>
    </div> : null}
  </>;
}
