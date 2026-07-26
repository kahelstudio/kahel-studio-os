"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Download, Heart, Star } from "lucide-react";

type Tab = "overview" | "gallery" | "selects" | "invoices" | "feedback";

const photos = [
  { id: "p1", span: "col-span-2 row-span-2" },
  { id: "p2", span: "" },
  { id: "p3", span: "" },
  { id: "p4", span: "" },
  { id: "p5", span: "col-span-2" },
  { id: "p6", span: "" },
  { id: "p7", span: "" },
  { id: "p8", span: "" },
  { id: "p9", span: "row-span-2" },
  { id: "p10", span: "" },
  { id: "p11", span: "" },
  { id: "p12", span: "" },
];

const photoPositions = ["50% 43%", "43% 50%", "60% 40%", "48% 60%", "52% 42%", "35% 48%", "72% 46%", "55% 58%", "46% 35%", "65% 55%", "40% 42%", "56% 51%"];

const details = [
  ["Package", "Signature Wedding"],
  ["Date", "14 June 2026"],
  ["Location", "Antipolo, Rizal"],
  ["Coverage", "10 hours · 2 shooters"],
  ["Deliverables", "247 edited photos · 40-page album"],
  ["Team", "Sebi Barrun · Nadine Cruz"],
];

const milestones = [
  ["Booking confirmed", "02 Feb 2026", "done"],
  ["Deposit paid", "₱15,000 · 05 Feb 2026", "done"],
  ["Shoot day", "14 June 2026", "done"],
  ["Gallery delivered", "21 June 2026", "done"],
  ["Choose your selects", "You're here — pick your album favorites", "current"],
  ["Album to print", "After selects & balance", "todo"],
  ["Final delivery", "~3 weeks after approval", "todo"],
] as const;

function PortalLogo({ size = 20 }: { size?: number }) {
  return <Image src="/kahelstudio-logo_b.svg" alt="Kahel Studio" width={137} height={20} className="w-auto" style={{ height: size }} />;
}

function Photo({ index, selected, onToggle }: { index: number; selected?: boolean; onToggle?: () => void }) {
  return (
    <div className={`relative overflow-hidden rounded-[10px] bg-[#e3e0dc] ${selected ? "outline-3 outline-[#ff5300] outline-offset-[-3px]" : ""}`}>
      <Image
        src="/Solo_Liza Burzon Bino_9A.jpg"
        alt={`Wedding gallery photo ${index + 1}`}
        fill
        sizes="(max-width: 640px) 50vw, 25vw"
        className="object-cover"
        style={{ objectPosition: photoPositions[index] }}
      />
      {onToggle && (
        <button
          onClick={onToggle}
          aria-label={selected ? "Remove from album selects" : "Add to album selects"}
          className={`absolute right-2 top-2 grid h-[34px] w-[34px] place-items-center rounded-full backdrop-blur-sm transition-colors ${selected ? "bg-[#ff5300] text-white" : "bg-white/85 text-[#6e6963]"}`}
        >
          <Heart className="h-[17px] w-[17px]" fill={selected ? "currentColor" : "none"} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

export default function ClientPortalPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [favorites, setFavorites] = useState<Record<string, true>>({});
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<Record<string, true>>({});
  const [feedbackSent, setFeedbackSent] = useState(false);

  const picked = Object.keys(favorites).length;
  const tabs: { id: Tab; label: string; badge?: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "gallery", label: "Gallery", badge: "247" },
    { id: "selects", label: "Selects", badge: picked ? String(picked) : undefined },
    { id: "invoices", label: "Invoices", badge: "1 due" },
    { id: "feedback", label: "Feedback" },
  ];

  function toggleFavorite(id: string) {
    setFavorites((current) => {
      const next = { ...current };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }

  if (!signedIn) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#faf9f7] px-5 font-sans text-[#242424]">
        <section className="portal-pop w-full max-w-[420px] rounded-2xl bg-white px-[34px] py-9 shadow-[0_20px_50px_rgba(20,16,12,.12)]">
          <PortalLogo size={22} />
          <h1 className="mt-[22px] font-display text-[30px] font-semibold leading-[1.1] tracking-[-.025em]">Your gallery<br />is ready.</h1>
          <p className="mt-2.5 text-sm leading-[21px] text-[#6e6963]">Sign in to view your photos, choose album selects, and settle your balance.</p>
          <label className="mt-6 block text-xs font-semibold tracking-[.02em] text-[#6e6963]">Email
            <input defaultValue="althea.reyes@gmail.com" className="mt-1.5 h-11 w-full rounded-[9px] border border-[#e3e0dc] bg-white px-3.5 text-sm outline-none focus:border-[#ff5300] focus:ring-2 focus:ring-[#ff5300]/20" />
          </label>
          <label className="mt-3.5 block text-xs font-semibold tracking-[.02em] text-[#6e6963]">Access code
            <input defaultValue="AM-14JUN" className="mt-1.5 h-11 w-full rounded-[9px] border border-[#e3e0dc] bg-white px-3.5 font-mono text-sm tracking-[.14em] text-[#242424] outline-none focus:border-[#ff5300] focus:ring-2 focus:ring-[#ff5300]/20" />
          </label>
          <p className="mt-1.5 text-xs text-[#9b9691]">Found in your delivery email from Kahel Studio.</p>
          <button onClick={() => setSignedIn(true)} className="mt-[22px] h-[46px] w-full rounded-[9px] bg-[#ff5300] text-[15px] font-semibold text-white transition-colors hover:bg-[#d94500]">Enter your gallery</button>
          <p className="mt-[18px] text-center text-xs text-[#9b9691]">Powered by <span className="font-semibold text-[#6e6963]">Kahel Studio OS</span></p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#faf9f7] font-sans text-[#242424]">
      <header className="flex h-[60px] shrink-0 items-center border-b border-[#e3e0dc] bg-white px-5 sm:px-8">
        <PortalLogo />
        <div className="ml-auto flex items-center gap-3.5">
          <button onClick={() => setSignedIn(false)} className="hidden h-[34px] rounded-lg border border-[#e3e0dc] px-3.5 text-[13px] font-semibold text-[#6e6963] hover:border-[#c7c3be] sm:block">Sign out</button>
          <div className="hidden text-right leading-tight sm:block"><p className="text-[13px] font-semibold">Althea Reyes</p><p className="mt-0.5 text-[11px] text-[#9b9691]">Client</p></div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#edeafd] font-display text-sm font-semibold text-[#2a1f87]">AR</div>
        </div>
      </header>

      <section className="shrink-0 border-b border-[#e3e0dc] bg-white px-5 pt-6 sm:px-10 sm:pt-[26px]">
        <div className="mx-auto flex max-w-[1180px] items-end gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3"><span className="rounded-full bg-[#e0f7ec] px-3 py-1 text-xs font-semibold text-[#005430]">Gallery ready</span><span className="font-mono text-xs text-[#9b9691]">KS-PROJ-2041</span></div>
            <h1 className="mt-3 font-display text-[32px] font-semibold leading-[1.05] tracking-[-.03em] sm:text-[40px]">Althea &amp; Marco</h1>
            <p className="mt-1.5 text-sm text-[#6e6963] sm:text-[15px]">Wedding · Antipolo · 14 June 2026</p>
          </div>
          <button onClick={() => setTab("gallery")} className="mb-0.5 hidden h-11 items-center gap-1.5 rounded-[9px] bg-[#ff5300] px-5 text-sm font-semibold text-white hover:bg-[#d94500] sm:flex"><Download className="h-[17px] w-[17px]" />Download all</button>
        </div>
        <nav className="mx-auto mt-[22px] flex max-w-[1180px] gap-5 overflow-x-auto sm:gap-[30px]" aria-label="Client portal sections">
          {tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-1.5 border-b-2 pb-3.5 text-sm font-semibold ${tab === item.id ? "border-[#ff5300] text-[#242424]" : "border-transparent text-[#9b9691]"}`}>
            {item.label}{item.badge && <span className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] ${item.id === "invoices" || item.id === "selects" ? "bg-[#ffe3d4] text-[#b33800]" : "bg-[#f1efec] text-[#242424]"}`}>{item.badge}</span>}
          </button>)}
        </nav>
      </section>

      <div className="flex-1 overflow-y-auto">
        <div className="portal-fade mx-auto max-w-[1180px] px-5 py-[34px] pb-16 sm:px-10">
          {tab === "overview" && <Overview />}
          {tab === "gallery" && <Gallery />}
          {tab === "selects" && <Selects picked={picked} favorites={favorites} onToggle={toggleFavorite} onSend={() => setTab("feedback")} />}
          {tab === "invoices" && <Invoices />}
          {tab === "feedback" && <Feedback rating={rating} setRating={setRating} tags={tags} setTags={setTags} sent={feedbackSent} onSubmit={() => setFeedbackSent(true)} />}
        </div>
      </div>
      <style jsx>{`@keyframes portal-fade { from { opacity: 0 } to { opacity: 1 } } @keyframes portal-pop { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } } .portal-fade { animation: portal-fade .3s ease both } .portal-pop { animation: portal-pop .5s ease both }`}</style>
    </main>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) { return <h2 className="mb-4 border-b border-[#e3e0dc] pb-3 font-display text-[13px] font-semibold uppercase tracking-[.16em]">{children}</h2>; }

function Overview() {
  return <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
    <div><Eyebrow>Shoot details</Eyebrow><div className="overflow-hidden rounded-xl border border-[#e3e0dc] bg-white">{details.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-5 border-b border-[#f1efec] px-[18px] py-[15px] text-sm last:border-0"><span className="text-[#6e6963]">{label}</span><span className="text-right font-semibold">{value}</span></div>)}</div>
      <div className="mt-[18px] flex items-start gap-3.5 rounded-xl border border-[#e3e0dc] bg-white p-[18px]"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#ffedd9] font-display font-semibold text-[#b33800]">KS</div><div><p className="text-sm font-semibold">Your studio contact</p><p className="mt-0.5 text-[13px] text-[#6e6963]">Sebi Barrun · Lead photographer</p><a href="mailto:hello@kahelstudio.com" className="mt-1.5 inline-block text-[13px] text-[#b33800] hover:text-[#d94500]">Message the studio</a></div></div></div>
    <div><Eyebrow>What&apos;s next</Eyebrow><div className="rounded-xl border border-[#e3e0dc] bg-white px-5 pb-3 pt-1.5">{milestones.map(([title, meta, status], index) => <div key={title} className="flex gap-3.5 py-3"><div className="flex w-5 shrink-0 flex-col items-center"><span className={`grid h-5 w-5 place-items-center rounded-full border-2 text-[11px] font-bold ${status === "done" ? "border-[#00a15c] bg-[#00a15c] text-white" : status === "current" ? "border-[#ff5300] bg-[#ff5300]" : "border-[#c7c3be] bg-white"}`}>{status === "done" && <Check className="h-3 w-3" strokeWidth={3} />}</span>{index < milestones.length - 1 && <span className="mt-0.5 min-h-5 flex-1 border-l-2 border-[#e3e0dc]" />}</div><div className="pb-1"><p className={`text-sm font-semibold ${status === "todo" ? "text-[#9b9691]" : ""}`}>{title}</p><p className="mt-0.5 text-[13px] text-[#9b9691]">{meta}</p></div></div>)}</div></div>
  </div>;
}

function Gallery() { return <><div className="mb-[18px] flex items-center gap-3"><p className="text-[15px] font-semibold">247 photos</p><p className="hidden font-mono text-xs text-[#9b9691] sm:block">Delivered 21 Jun 2026 · expires 21 Dec 2026</p><button className="ml-auto flex h-[38px] items-center gap-1.5 rounded-lg bg-[#ff5300] px-4 text-[13px] font-semibold text-white hover:bg-[#d94500]"><Download className="h-4 w-4" />Download all</button></div><div className="grid auto-rows-[110px] grid-cols-2 gap-3 sm:auto-rows-[158px] sm:grid-cols-4">{photos.map((photo, index) => <div key={photo.id} className={photo.span}><Photo index={index} /></div>)}</div></>; }

function Selects({ picked, favorites, onToggle, onSend }: { picked: number; favorites: Record<string, true>; onToggle: (id: string) => void; onSend: () => void }) { return <><div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-[#e3e0dc] bg-white p-4 sm:px-5"><div className="min-w-[220px] flex-1"><p className="text-[15px] font-semibold">Choose your album favorites</p><p className="mt-0.5 text-[13px] text-[#6e6963]">Tap the heart on the photos you want in your printed album. Aim for around 40.</p></div><div className="text-right"><p className={`font-display text-[30px] font-semibold leading-none tracking-[-.02em] ${picked >= 40 ? "text-[#005430]" : ""}`}>{picked}<span className="text-base text-[#9b9691]"> / 40</span></p><p className="mt-0.5 text-xs text-[#9b9691]">picked</p></div><button onClick={onSend} className="h-[42px] rounded-[9px] bg-[#ff5300] px-[18px] text-sm font-semibold text-white hover:bg-[#d94500]">Send to studio</button></div><div className="grid auto-rows-[130px] grid-cols-2 gap-3 sm:auto-rows-[180px] sm:grid-cols-4">{photos.map((photo, index) => <Photo key={photo.id} index={index} selected={Boolean(favorites[photo.id])} onToggle={() => onToggle(photo.id)} />)}</div></>; }

function Invoices() { const rows = [["Deposit", "KS-INV-2041 · Paid 05 Feb 2026", "₱15,000", "Paid", "Receipt"], ["Final balance", "KS-INV-2068 · Due 30 Jun 2026", "₱35,000", "Due", "Pay now"]]; return <div className="max-w-[760px]"><div className="grid grid-cols-1 overflow-hidden rounded-xl border border-[#e3e0dc] bg-white sm:grid-cols-3">{[["Package total", "₱50,000", ""], ["Paid", "₱15,000", "text-[#005430]"], ["Balance due", "₱35,000", "text-[#b33800]"]].map(([label, value, color]) => <div key={label} className="border-b border-[#f1efec] p-5 sm:border-b-0 sm:border-l first:sm:border-l-0"><p className="text-[13px] text-[#6e6963]">{label}</p><p className={`mt-1.5 font-display text-[28px] font-semibold tracking-[-.02em] ${color}`}>{value}</p></div>)}</div><div className="mt-[30px]"><Eyebrow>Invoices</Eyebrow><div className="overflow-hidden rounded-xl border border-[#e3e0dc] bg-white">{rows.map(([title, meta, amount, status, button]) => <div key={title} className="flex flex-wrap items-center gap-4 border-b border-[#f1efec] p-5 last:border-0"><div className="min-w-[170px] flex-1"><div className="flex items-center gap-2.5"><p className="text-sm font-semibold">{title}</p><span className={`rounded-full px-2.5 py-[3px] text-xs font-semibold ${status === "Paid" ? "bg-[#e0f7ec] text-[#005430]" : "bg-[#ffe3d4] text-[#b33800]"}`}>{status}</span></div><p className="mt-1 font-mono text-xs text-[#9b9691]">{meta}</p></div><p className="font-display text-lg font-semibold">{amount}</p><button className={`h-[38px] rounded-lg border px-4 text-[13px] font-semibold ${button === "Pay now" ? "border-[#ff5300] bg-[#ff5300] text-white hover:bg-[#d94500]" : "border-[#e3e0dc] bg-white hover:border-[#c7c3be]"}`}>{button}</button></div>)}</div></div><p className="mt-3.5 text-[13px] text-[#9b9691]">A BIR-registered official receipt is issued by the studio once payment clears. Reference numbers above are for tracking only.</p></div>; }

function Feedback({ rating, setRating, tags, setTags, sent, onSubmit }: { rating: number; setRating: (n: number) => void; tags: Record<string, true>; setTags: React.Dispatch<React.SetStateAction<Record<string, true>>>; sent: boolean; onSubmit: () => void }) { const labels = ["Beautiful edits", "Great team", "On time", "Easy process", "Worth it"]; if (sent) return <div className="portal-pop max-w-[640px] rounded-xl border border-[#e3e0dc] bg-white px-[30px] py-10 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e0f7ec] text-[#005430]"><Check className="h-[26px] w-[26px]" strokeWidth={2} /></div><h2 className="mt-[18px] font-display text-2xl font-semibold tracking-[-.02em]">Thank you, Althea.</h2><p className="mt-1.5 text-sm leading-[21px] text-[#6e6963]">We&apos;ve shared your note with Sebi and the team. It means the world to a small studio.</p></div>; return <div className="max-w-[640px] rounded-xl border border-[#e3e0dc] bg-white p-[26px]"><h2 className="font-display text-2xl font-semibold tracking-[-.02em]">How was your experience?</h2><p className="mt-1.5 text-sm text-[#6e6963]">Your words help us — and help other couples find Kahel Studio.</p><div className="mt-[22px] flex gap-2">{[1, 2, 3, 4, 5].map((star) => <button key={star} onClick={() => setRating(star)} aria-label={`${star} star rating`} className={`grid h-11 w-11 place-items-center ${star <= rating ? "text-[#ff5300]" : "text-[#d6d2cd]"}`}><Star className="h-[30px] w-[30px]" fill={star <= rating ? "currentColor" : "none"} strokeWidth={1.5} /></button>)}</div><div className="mt-[22px] flex flex-wrap gap-2">{labels.map((label) => { const active = Boolean(tags[label]); return <button key={label} onClick={() => setTags((current) => active ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== label)) : { ...current, [label]: true })} className={`h-[34px] rounded-full border px-3.5 text-[13px] font-semibold ${active ? "border-[#ff5300] bg-[#fff4ee] text-[#b33800]" : "border-[#e3e0dc] bg-white text-[#6e6963]"}`}>{label}</button>; })}</div><textarea placeholder="Tell us about the shoot, the gallery, working with the team…" className="mt-[18px] h-[120px] w-full resize-none rounded-[10px] border border-[#e3e0dc] p-3.5 text-sm leading-[21px] outline-none focus:border-[#ff5300] focus:ring-2 focus:ring-[#ff5300]/20" /><button onClick={onSubmit} className="mt-[18px] h-[46px] w-full rounded-[9px] bg-[#ff5300] text-[15px] font-semibold text-white hover:bg-[#d94500]">Share your experience</button></div>; }
