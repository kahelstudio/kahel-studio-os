"use client";

import Image from "next/image";
import Link from "next/link";
import { Email } from "@/components/ui/email";
import { applyPromoDiscount, promoDiscountPercentage } from "@/lib/promo-code";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import styles from "./marketing-site.module.css";

type Page = "home" | "portfolio" | "services" | "about" | "book" | "privacy" | "terms" | "health-safety";
type ServiceCategory = "sessions" | "events";
type Theme = "light" | "dark";
type CustomerHeaderState = { authenticated: boolean; firstName?: string };

type Package = {
  name: string;
  price: number;
  per: string;
  description: string;
  specs: string[];
  note: string;
  featured?: boolean;
};

const studioPackages: Package[] = [
  { name: "Theme", price: 3000, per: "1 hour", description: "Themed photo session for kids 7 and below. Parents may join for family portraits.", specs: ["10 professionally edited photos", "Custom backdrop & creative lighting", "Unlimited outfit changes", "All digital photos from the session"], note: "Edited images shared within 3–5 working days." },
  { name: "Express", price: 2500, per: "1 hour", featured: true, description: "Fast delivery for urgent content, announcements or time-sensitive shoots.", specs: ["10 professionally edited photos", "3-colour backdrop & creative lighting", "Unlimited outfit changes", "All digital photos from the session"], note: "Edited images shared the same day." },
  { name: "Group", price: 2199, per: "1 hour", description: "For barkadas, teams or stylish family portraits. Perfect for groups of 3–5.", specs: ["10 professionally edited photos", "3-colour backdrop & basic lighting", "Unlimited outfit changes", "All digital photos from the session"], note: "Edited images shared within 3–5 working days." },
  { name: "Duo", price: 1800, per: "1 hour", description: "Couples, friends or duo portraits, creative concepts, branding or lifestyle.", specs: ["10 professionally edited photos", "3-colour backdrop & creative lighting", "Unlimited outfit changes", "All digital photos from the session"], note: "Edited images shared within 3–5 working days." },
  { name: "Solo", price: 1500, per: "1 hour", description: "A focused portrait session for individuals, personal branding and creatives.", specs: ["10 professionally edited photos", "2-colour backdrop & creative lighting", "2 outfit changes", "All digital photos from the session"], note: "Edited images shared within 3–5 working days." },
  { name: "Mini Session", price: 999, per: "30 minutes", description: "A simple, affordable session designed especially for students and kids.", specs: ["5 professionally edited photos", "2-colour backdrop & creative lighting", "1 outfit change", "All digital photos from the session"], note: "Edited images shared within 3–5 working days." },
];

const eventPackages: Package[] = [
  { name: "Baby Shower", price: 5000, per: "half day", description: "Candid moments, family interactions and details in a clean, soft style.", specs: ["1 photographer, 1 assistant", "150+ professionally edited photos", "Unlimited high-resolution photos", "USB flash drive with all files"], note: "Edited images shared within 3–5 working days." },
  { name: "Engagement Party", price: 6000, per: "half day", description: "Candid and portrait coverage for intimate engagement celebrations.", specs: ["1 photographer, 1 assistant", "150+ professionally edited photos", "Unlimited high-resolution photos", "USB flash drive with all files"], note: "Edited images shared within 3–5 working days." },
  { name: "Birthday", price: 7000, per: "half day", description: "Parties and casual gatherings, guests, setup and program highlights.", specs: ["1 photographer, 1 assistant", "150+ professionally edited photos", "Unlimited high-resolution photos", "USB flash drive with all files"], note: "Edited images shared within 3–5 working days." },
  { name: "Christening", price: 8000, per: "half day", featured: true, description: "Full ceremony coverage plus quick family portraits for meaningful days.", specs: ["1 photographer, 1 assistant", "200+ professionally edited photos", "Unlimited high-resolution photos", "USB flash drive with all files"], note: "Edited images shared within 3–5 working days." },
  { name: "Debut", price: 10000, per: "full day", description: "Elegant coverage of your 18th, portraits, program and unforgettable moments.", specs: ["1 photographer, 1 assistant", "200+ professionally edited photos", "Unlimited high-resolution photos", "USB flash drive with all files"], note: "Edited images shared within 3–5 working days." },
  { name: "Anniversary Celebration", price: 10000, per: "full day", description: "Milestone coverage, heartfelt portraits, candids and celebration highlights.", specs: ["1 photographer, 1 assistant", "200+ professionally edited photos", "Unlimited high-resolution photos", "USB flash drive with all files"], note: "Edited images shared within 3–5 working days." },
];

const gallery = [
  { ref: "34A", category: "Weddings", label: "J & R", place: "Antipolo", position: "50% 18%", src: "/Duo_De Luna Edmon_7.jpg" },
  { ref: "12", category: "Family", label: "A & M", place: "La Mesa", position: "66% 30%", src: "/Duo_Gus Borja_12.jpg" },
  { ref: "07", category: "Debut", label: "Bea, 18", place: "Makati", position: "30% 20%", src: "/Event_Takashi Zhander_176.jpg" },
  { ref: "21B", category: "Family", label: "The Cruz", place: "Tagaytay", position: "74% 42%", src: "/Mini Session_Gerladine Ceneta Pongan_5.jpg" },
  { ref: "29", category: "Brand", label: "K & P", place: "Batangas", position: "45% 25%", src: "/IMG_ 107.jpg" },
  { ref: "03", category: "Brand", label: "D & L", place: "Baler", position: "50% 18%", src: "/Solo_Mariella_4.jpg" },
  { ref: "16", category: "Brand", label: "Alon Co.", place: "Studio", position: "38% 66%", src: "/Solo_Abbiyaah Gail_10.jpg" },
  { ref: "41", category: "Brand", label: "The Reyes", place: "Rizal", position: "75% 69%", src: "/BU Nursing_3.jpg" },
  { ref: "55", category: "Brand", label: "M & N", place: "Tayabas", position: "22% 46%", src: "/Valentines_Duo_Marycris Celendro_10.jpg" },
];

const categories = ["All", "Weddings", "Prenup", "Debut", "Brand", "Family"];
const values = [
  ["01", "Light over spectacle", "We plan every shoot around the hour the light is kindest."],
  ["02", "Documentary, not staged", "Real moments, gently guided, never forced into a pose."],
  ["03", "Delivered, every time", "Edited, on schedule, in a private gallery you keep."],
];
const sessionAddOns = [["Extra Pax", "₱200"], ["+5 Edited Photos", "₱300"], ["HMUA (Hair & Makeup)", "₱1,300"], ["Additional Hour", "₱800 / hr"], ["Extra Outfit", "₱300"], ["Rush Edit", "₱100 / photo"]];
const eventAddOns = [["Additional hour of coverage", "₱3,500"], ["Second photographer", "₱8,000"], ["Same-day edit (reel)", "₱6,000"], ["Express 7-day delivery", "₱5,000"], ["Printed album, 20 spreads", "₱7,500"]];

const peso = (amount: number) => `₱${amount.toLocaleString("en-PH")}`;
const pad = (number: number) => String(number).padStart(2, "0");
const todayIso = () => {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

function usePopupDismissal(open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);
  return ref;
}

function Logo({ white = false }: { white?: boolean }) {
  return <Image src={white ? "/kahelstudio-logo_w.svg" : "/kahelstudio-logo_b.svg"} alt="Kahel Studio" width={164} height={24} className={styles.logo} priority />;
}

function Eyebrow({ children, warm = false }: { children: React.ReactNode; warm?: boolean }) {
  return <span className={`${styles.eyebrow} ${warm ? styles.warm : ""}`}>{children}</span>;
}

function Photo({ alt, src = "/Solo_Liza Burzon Bino_9A.jpg", position = "50% 35%", preload = false, sizes = "(min-width: 1081px) 33vw, (min-width: 641px) 50vw, 100vw" }: { alt: string; src?: string; position?: string; preload?: boolean; sizes?: string }) {
  return <Image src={src} alt={alt} fill sizes={sizes} preload={preload} style={{ objectFit: "cover", objectPosition: position, backgroundColor: "#2b2927" }} />;
}

function ArrowButton({ children, onClick, primary = false }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return <button type="button" className={primary ? styles.primaryButton : styles.outlineButton} onClick={onClick}>{children}<ArrowRight size={16} /></button>;
}

function FilterChips({ active, setActive }: { active: string; setActive: (value: string) => void }) {
  return <div className={styles.chips}>{categories.map((category) => <button type="button" key={category} aria-pressed={active === category} onClick={() => setActive(category)}>{category}</button>)}</div>;
}

function Gallery({ filter, home = false }: { filter: string; home?: boolean }) {
  const frames = (filter === "All" ? gallery : gallery.filter((frame) => frame.category === filter)).slice(0, home ? 9 : undefined);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const swipeStartRef = useRef<number | null>(null);

  function closeViewer() {
    setActiveIndex(null);
    requestAnimationFrame(() => restoreFocusRef.current?.focus());
  }
  function showPrevious() { setActiveIndex((index) => index === null ? null : (index - 1 + frames.length) % frames.length); }
  function showNext() { setActiveIndex((index) => index === null ? null : (index + 1) % frames.length); }

  useEffect(() => {
    if (activeIndex === null) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeViewer();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  function openViewer(index: number) {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActiveIndex(index);
  }

  const activeFrame = activeIndex === null ? null : frames[activeIndex];

  if (!frames.length) return <div className={styles.emptyState}><div className={styles.filmIcon} /><h3>No frames in this roll yet.</h3><p>New work from this category is still developing. View the full sheet.</p></div>;
  return <>
    <div className={`${styles.gallery} ${home ? styles.homeGallery : ""}`}>{frames.map((frame, index) => <figure key={frame.ref} className={home && (index === 0 || index === 5 || index === 8) ? styles.wideFrame : ""}>
      <button type="button" onClick={() => openViewer(index)} className={styles.figureButton} aria-label={`View ${frame.label}, ${frame.category}`}>
        <Photo alt={`${frame.label}, ${frame.category} photography in ${frame.place}`} src={frame.src} position={frame.position} />
        <span className={styles.corner} />
        <span className={styles.frameRef}>{frame.ref}</span>
        <figcaption><span>{frame.label}</span><span>{home ? frame.category : frame.place}</span></figcaption>
      </button>
    </figure>)}</div>

    {activeFrame && activeIndex !== null ? <div ref={dialogRef} className={styles.viewer} role="dialog" aria-modal="true" aria-label="Image viewer" onPointerDown={(event) => { swipeStartRef.current = event.pointerType === "touch" ? event.clientX : null; }} onPointerUp={(event) => { if (swipeStartRef.current === null) return; const distance = event.clientX - swipeStartRef.current; swipeStartRef.current = null; if (distance > 50) showPrevious(); if (distance < -50) showNext(); }}>
      <div className={styles.viewerHeader}>
        <span className={styles.viewerCounter}>{activeIndex + 1} / {frames.length}</span>
        <button type="button" onClick={closeViewer} className={styles.viewerClose} aria-label="Close viewer"><X /></button>
      </div>
      <div className={styles.viewerBody}>
        {frames.length > 1 ? <button type="button" onClick={showPrevious} className={styles.viewerNav} aria-label="Previous image"><ChevronLeft /></button> : null}
        <Image key={activeFrame.src} src={activeFrame.src} alt={activeFrame.label} fill sizes="100vw" style={{ objectFit: "contain", backgroundColor: "#2b2927" }} />
        {frames.length > 1 ? <button type="button" onClick={showNext} className={styles.viewerNav} aria-label="Next image"><ChevronRight /></button> : null}
      </div>
      <div className={styles.viewerFooter}><span className={styles.viewerLabel}>{activeFrame.label}</span><span className={styles.viewerPlace}>{activeFrame.place}</span></div>
    </div> : null}
  </>;
}

function Header({ page, customer, go, openMenu, signOut }: { page: Page; customer: CustomerHeaderState; go: (page: Page, category?: ServiceCategory) => void; openMenu: () => void; signOut: () => void }) {
  return <header className={`${styles.header} ${page === "home" ? styles.homeHeader : ""}`}><div className={styles.container}>
    <button type="button" className={styles.logoButton} onClick={() => go("home")} aria-label="Kahel Studio home"><span className={styles.lightLogo}><Logo /></span><span className={styles.darkLogo}><Logo white /></span></button>
    <nav className={styles.desktopNav} aria-label="Primary">
      <button type="button" aria-current={page === "portfolio" ? "page" : undefined} onClick={() => go("portfolio")}>Work</button>
      <div className={styles.servicesMenu}><button type="button" aria-current={page === "services" ? "page" : undefined} onClick={() => go("services")}>Services</button><div className={styles.dropdown}><button type="button" onClick={() => go("services")}><strong>Studio sessions</strong><span>Portraits, branding & mini shoots</span></button><button type="button" onClick={() => go("services", "events")}><strong>Events</strong><span>Debut, christening, celebrations</span></button></div></div>
      <button type="button" aria-current={page === "about" ? "page" : undefined} onClick={() => go("about")}>About</button>
    </nav>
    <div className={styles.headerActions}>
{customer.authenticated ? <div className={styles.accountMenu}><button type="button" className={styles.headerSignIn} aria-haspopup="menu">My account</button><div role="menu" className={styles.accountDropdown}><Link role="menuitem" href="/portal">Client Portal</Link><Link role="menuitem" href="/portal/profile">Profile</Link><button role="menuitem" type="button" onClick={signOut}>Sign out</button></div></div> : <Link className={styles.headerSignIn} href="/sign-in">Sign in</Link>}<button type="button" className={styles.mobileMenuButton} onClick={openMenu} aria-label="Open menu"><Menu size={21} /></button></div>
  </div></header>;
}

function MobileMenu({ page, customer, close, go, signOut }: { page: Page; customer: CustomerHeaderState; close: () => void; go: (page: Page, category?: ServiceCategory) => void; signOut: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [close]);
  const items: { label: string; page: Page; category?: ServiceCategory }[] = [{ label: "Work", page: "portfolio" }, { label: "Studio sessions", page: "services", category: "sessions" }, { label: "Events", page: "services", category: "events" }, { label: "About", page: "about" }, { label: "Book", page: "book" }];
  return <div className={styles.mobileMenu} role="dialog" aria-modal="true" aria-label="Menu"><div className={styles.mobileMenuHead}><Logo white /><button ref={closeRef} type="button" onClick={close} aria-label="Close menu"><X /></button></div><nav>{items.map((item, index) => <button type="button" key={`${item.label}-${item.category ?? ""}`} aria-current={page === item.page ? "page" : undefined} onClick={() => go(item.page, item.category)}><span>{pad(index + 1)}</span><strong>{item.label}</strong><ArrowRight /></button>)}</nav>{customer.authenticated ? <><div className={styles.mobileAuth}><Link href="/portal">Client Portal</Link><Link href="/portal/profile">Profile</Link><button type="button" onClick={signOut}>Sign out</button></div></> : <><Link className={styles.menuBook} href="/sign-in">Sign in</Link><button type="button" className={styles.menuBookNow} onClick={() => { go("book"); close(); }}>Book now</button></>}<div className={styles.mobileMenuFoot}><span>Cobo, Tabaco City, Albay 4511 · Philippines</span><span><i />+63 969 153 2992</span></div></div>;
}

function Home({ go }: { go: (page: Page, category?: ServiceCategory) => void }) {
  const [filter, setFilter] = useState("All");
  return <>
    <section className={styles.hero}><Photo alt="Portrait photographed by Kahel Studio" position="50% 18%" preload sizes="(min-width: 1081px) 72vw, 100vw" /><div className={styles.heroScrim} /><div className={`${styles.container} ${styles.heroContent}`}><div className={styles.heroCopy}><h1>Creating timeless photographs.</h1><p>From portraits and celebrations to commercial campaigns, every story is thoughtfully captured and delivered in a private gallery that’s yours to keep.</p><div className={styles.heroActions}><ArrowButton onClick={() => go("book")}>Book your session</ArrowButton></div><div className={styles.heroStats}>{[["300+", "sessions"], ["2022", "behind the lens"], ["72h", "delivery"], ["5.0★", "rating"]].map(([number, label]) => <div key={label}><strong>{number}</strong><span>{label}</span></div>)}</div></div></div></section>
    <section className={`${styles.section} ${styles.container}`}><div className={styles.sectionHead}><div><Eyebrow>Selected work</Eyebrow><h2>Recent Work</h2><p>Explore highlights from our latest shoots. Choose a category to see portraits, celebrations, commercial projects, and more.</p></div><ArrowButton onClick={() => go("portfolio")}>Full portfolio</ArrowButton></div><FilterChips active={filter} setActive={setFilter} /><Gallery filter={filter} home /></section>
    <section className={`${styles.section} ${styles.softSection}`}><div className={styles.container}><div className={styles.centerHead}><Eyebrow>What we shoot</Eyebrow><h2>Two ways to work with us.</h2></div><div className={styles.serviceTiles}>{[{ title: "In the studio", kicker: "Studio sessions", description: "Portraits, branding, group and mini shoots.", src: "/Mini Session_Gerladine Ceneta Pongan_15.jpg", position: "30% 48%", category: "sessions" as const }, { title: "On your day", kicker: "Events", description: "Debut, christening, birthdays and celebrations.", src: "/Event_Debut_Keely Bueno_15.jpg", position: "72% 43%", category: "events" as const }].map((item) => <button type="button" key={item.title} onClick={() => go("services", item.category)}><Photo alt={item.title} src={item.src} position={item.position} /><span className={styles.tileScrim} /><span className={styles.tileCopy}><Eyebrow warm>{item.kicker}</Eyebrow><strong>{item.title}</strong><small>{item.description}</small><b>View rates <ArrowRight size={15} /></b></span></button>)}</div></div></section>
    <section className={`${styles.section} ${styles.container}`}><div className={styles.editorialSplit}><div><Eyebrow>Why Kahel Studio</Eyebrow><h2>We chase the last warm light.</h2><p>Kahel is Filipino for the colour orange, the hour just before the day lets go. Since 2022 we&apos;ve built every shoot around that light, working small and close so the day stays yours.</p><ArrowButton onClick={() => go("about")}>More about the studio</ArrowButton></div><Values /></div></section>
    <section className={`${styles.section} ${styles.darkBand}`}><div className={styles.container}><div className={styles.sectionHead}><div><Eyebrow warm>The studio experience</Eyebrow><h2>From first message to final gallery.</h2></div><p>Four unhurried steps. You&apos;ll always know what happens next.</p></div><div className={styles.process}>{[["01", "Send the slip", "Tell us the date, session and venue. We reply within a day."], ["02", "Plan the shoot", "We map the light, the people and the moments that matter."], ["03", "The session", "Unhurried, gently guided. We shoot for the last warm light."], ["04", "Private gallery", "Edited and delivered in a private gallery you keep."]].map(([number, title, copy]) => <div key={number}><span>{number}</span><strong>{title}</strong><p>{copy}</p></div>)}</div></div></section>
    <section className={`${styles.section} ${styles.container}`}><div className={`${styles.editorialSplit} ${styles.location}`}><div><Eyebrow>Find the studio</Eyebrow><h2>Cobo, Tabaco City, Albay.</h2><p>Visit our studio or book us for an on-location project. Send us an inquiry, and our team will respond within one business day.</p><dl><div><dt>Studio</dt><dd>Cobo, Tabaco City, Albay 4511</dd></div><div><dt>Phone</dt><dd>+63 969 153 2992</dd></div><div><dt>Email</dt><dd><Email local="hello" domain="kahelstudio.com" /></dd></div></dl></div><figure><Photo alt="Kahel Studio in Tabaco City" src="/Mini Session_Maria Almira Barcenas_15.jpg" position="35% 45%" /></figure></div></section>
  </>;
}

function Values() {
  return <div className={styles.values}>{values.map(([number, title, copy]) => <div key={number}><span>{number}</span><p><strong>{title}</strong>{copy}</p></div>)}</div>;
}

function Portfolio() {
  const [filter, setFilter] = useState("All");
  return <main className={`${styles.page} ${styles.container}`}><Eyebrow>Portfolio</Eyebrow><h1>Work We’re Proud to Share</h1><p className={styles.lead}>Explore our latest studio portraits, events, food, and product photography. Browse by category to find inspiration—then start a booking when you’re ready to create something with us.</p><FilterChips active={filter} setActive={setFilter} /><Gallery filter={filter} /></main>;
}

function Services({ category, setCategory, goBook }: { category: ServiceCategory; setCategory: (category: ServiceCategory) => void; goBook: () => void }) {
  const packages = category === "sessions" ? studioPackages : eventPackages;
  return <main className={`${styles.page} ${styles.container}`}><Eyebrow>{category === "sessions" ? "Studio sessions · 2026 rate card" : "Events · 2026 rate card"}</Eyebrow><h1>{category === "sessions" ? "Every session, priced plainly." : "Coverage for your celebrations."}</h1><p className={styles.lead}>Starting rates in Philippine peso. Every shoot is quoted to your date, location and coverage, no hidden line items.</p><div className={styles.segmented}><button type="button" aria-pressed={category === "sessions"} onClick={() => setCategory("sessions")}>Studio sessions</button><button type="button" aria-pressed={category === "events"} onClick={() => setCategory("events")}>Events</button></div><div className={styles.packageGrid}>{packages.map((item, index) => <article key={item.name} className={item.featured ? styles.featured : ""}>{item.featured && <span className={styles.mostBooked}>Most booked</span>}<div className={styles.packageTop}><div><span>{pad(index + 1)}</span><h3>{item.name}</h3></div><p><strong>{peso(item.price)}</strong><small>/ {item.per}</small></p></div><p className={styles.packageDescription}>{item.description}</p><div className={styles.features}>{item.specs.map((spec) => <span key={spec}><Check size={15} />{spec}</span>)}</div><small className={styles.packageNote}>{item.note}</small><button type="button" onClick={goBook}>Book {item.name}<ArrowRight size={15} /></button></article>)}</div><div className={styles.serviceBottom}><div className={styles.addons}><div><h2>Add-ons</h2><span>À la carte</span></div>{(category === "sessions" ? sessionAddOns : eventAddOns).map(([name, price]) => <p key={name}><span>{name}</span><strong>{price}</strong></p>)}</div><div className={styles.deposit}><p><i />A 50% deposit reserves your date; the balance is due on delivery. Dates are held for 48 hours after you reserve.</p><button type="button" onClick={goBook}>Start a booking</button></div></div></main>;
}

function About() {
  return <main className={`${styles.page} ${styles.container}`}><Eyebrow>The studio</Eyebrow><h1>We chase the last warm light.</h1><figure className={styles.aboutHero}><Photo alt="The Kahel Studio team" src="/Sunset in Cebu_4.jpg" position="50% 38%" /><span>The studio · 35mm</span></figure><div className={styles.aboutGrid}><div className={styles.story}><p><strong style={{ color: "#FF5300" }}>Kahel</strong> is Filipino for orange, inspired by the last warm light before the day lets go. We built our studio around that final, warm shade.</p><p>Since 2022, we&apos;ve captured couples and families, quiet hill prenups, debuts, and the ordinary afternoons worth keeping. We bring that same thoughtful eye to food, products, and corporate events.</p><p>We operate as a close-knit, growing team—expanding beyond photography into video, audio, and graphic design. Every project is planned around your light, your people, and your vision, then delivered fully edited in a private gallery you keep.</p></div><div><div className={styles.aboutStats}>{[["300+", "Stories framed"], ["Since 2022", "Behind the lens"], ["24 hr", "Avg. reply time"], ["Luzon", "Travel-ready, PH-wide"]].map(([number, label]) => <div key={label}><strong>{number}</strong><span>{label}</span></div>)}</div><Values /></div></div></main>;
}

function Terms() {
  return <main className={`${styles.page} ${styles.container} ${styles.legalPage}`}>
    <Eyebrow>Legal</Eyebrow>
    <h1>Terms &amp; Service</h1>
    <div className={styles.legalContent}>
      <section><h2>Use of Website</h2><ul><li>The content on this website is for general informational and promotional purposes only.</li><li>You may browse, view, and share content from the Website for personal and non-commercial use only.</li><li>Unauthorized use, including copying, reproducing, distributing, or modifying any content, is strictly prohibited without written permission from Kahel Studio.</li></ul></section>
      <section><h2>Intellectual Property</h2><p>All materials on this website, unless otherwise stated, including images, graphics, text, videos, and logos, are owned or licensed by Kahel Studio and are protected by copyright, trademark, and other intellectual property laws.</p><p>You may not use any Kahel Studio trademarks, branding, or logos without prior written consent.</p></section>
      <section><h2>User Conduct</h2><p>When using our website, you agree not to:</p><ul><li>Engage in any unlawful, abusive, or disruptive behavior.</li><li>Attempt to interfere with the Website&apos;s functionality or security.</li><li>Upload or transmit viruses, malware, or any malicious code.</li></ul></section>
      <section><h2>Third-Party Links</h2><p>This website may contain links to third-party websites for your convenience.</p><p>Kahel Studio is not responsible for the content, policies, or practices of any third-party websites, and accessing them is at your own risk.</p></section>
      <section><h2>Disclaimer</h2><p>The Website and its content are provided &quot;as is&quot; without warranties of any kind, either express or implied.</p><p>Kahel Studio does not guarantee that the website will be uninterrupted, error-free, or free from viruses or other harmful components.</p></section>
      <section><h2>Limitation of Liability</h2><p>Kahel Studio is not liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the website.</p></section>
      <section><h2>Changes to the Website and Terms</h2><p>We reserve the right to update, modify, or remove any part of the Website or these Terms of Use at any time without prior notice.</p><p>Your continued use of the Website after changes are posted constitutes your acceptance of the updated Terms.</p></section>
      <section><h2>Governing Law</h2><p>These Terms of Use are governed by and construed in accordance with the laws of the Republic of the Philippines, without regard to its conflict of law provisions.</p></section>
      <section><h2>Contact Us</h2><p>For questions or concerns regarding these Terms of Service, please contact: <Email local="tos" domain="kahelstudio.com" /></p></section>
      <section><h2>Acceptance of Terms</h2><p>By accessing or using this Website, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service.</p></section>
    </div>
  </main>;
}

function Privacy() {
  return <main className={`${styles.page} ${styles.container} ${styles.legalPage}`}>
    <Eyebrow>Legal</Eyebrow>
    <h1>Privacy Policy</h1>
    <div className={styles.legalContent}>
      <section><p>Kahel Studio (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website <a href="https://kahelstudio.com">https://kahelstudio.com</a> and use our services.</p></section>
      <section><h2>Information We Collect</h2><p>We may collect the following types of personal data:</p><ul><li><strong>Contact Information:</strong> Name, email address, phone number.</li><li><strong>Booking Details:</strong> Session dates, type of service, number of participants.</li><li><strong>Payment Information:</strong> Payment method and billing details (handled via secure third-party gateways such as Paymongo).</li><li><strong>Communication Data:</strong> Messages, inquiries, or feedback you submit through forms or email.</li><li><strong>Technical Data:</strong> IP address, browser type, operating system, and browsing behavior on our site via cookies.</li></ul></section>
      <section><h2>How We Use Your Information</h2><p>We use your personal data to:</p><ul><li>Respond to inquiries and provide customer support.</li><li>Process bookings and payments securely.</li><li>Improve our website, services, and customer experience.</li><li>Send updates, promotions, and marketing content (only with your consent).</li><li>Comply with legal obligations.</li></ul></section>
      <section><h2>User Conduct</h2><p>When using our Website, you agree not to:</p><ul><li>Engage in any unlawful, abusive, or disruptive behavior.</li><li>Attempt to interfere with the Website&apos;s functionality or security.</li><li>Upload or transmit viruses, malware, or any malicious code.</li></ul></section>
      <section><h2>Sharing Your Information</h2><p>We do not sell your personal data. We may share your information with:</p><ul><li>Service providers (e.g., Paymongo, email platforms like Brevo) who help us operate our business.</li><li>Legal authorities when required to comply with applicable laws or in response to lawful requests.</li></ul></section>
      <section><h2>Data Security</h2><p>We implement appropriate technical and organizational measures to protect your personal data from unauthorized access, use, or disclosure.</p></section>
      <section><h2>Your Rights</h2><p>You have the right to:</p><ul><li>Access the personal data we hold about you.</li><li>Request correction or deletion of your data.</li><li>Withdraw consent for marketing at any time.</li><li>File a complaint with the National Privacy Commission (Philippines) if you believe your data has been misused.</li></ul><p>To exercise your rights, contact us at <Email local="privacy" domain="kahelstudio.com" />.</p></section>
      <section><h2>Cookies</h2><p>Our website uses cookies to enhance functionality and user experience. You can control cookie preferences through your browser settings.</p></section>
      <section><h2>Third-Party Links</h2><p>Our website may contain links to third-party websites. We are not responsible for their privacy practices or content.</p></section>
      <section><h2>Updates to This Policy</h2><p>We may update this policy from time to time. Changes will be posted on this page with an updated effective date.</p></section>
    </div>
  </main>;
}

function HealthSafety() {
  return <main className={`${styles.page} ${styles.container} ${styles.legalPage}`}>
    <Eyebrow>Studio care</Eyebrow>
    <h1>Health &amp; Safety</h1>
    <div className={styles.legalContent}>
      <section><h2>General Studio Cleanliness</h2><ul><li>All surfaces, props, and equipment are disinfected before and after each session.</li><li>Floors are cleaned and sanitized daily.</li><li>Studio restrooms are maintained and cleaned regularly.</li></ul></section>
      <section><h2>Masks &amp; Personal Protective Equipment</h2><ul><li>Face masks are required for staff when needed.</li><li>Clients are encouraged to wear masks, especially when not being photographed.</li><li>Masks are highly recommended for everyone when sessions involve infants or immunocompromised individuals.</li><li>Disposable masks are available upon request.</li></ul></section>
      <section><h2>Hand Hygiene</h2><ul><li>Alcohol-based hand sanitizers are available at the entrance, dressing areas, and shooting zones.</li><li>Staff members sanitize hands before and after every session.</li><li>Clients are encouraged to sanitize hands upon entry and exit.</li></ul></section>
      <section><h2>Group Size &amp; Guest Policy</h2><ul><li>Studio sessions are best suited for groups of up to 8 people.</li><li>Only those being photographed and essential companions should be present during the session.</li><li>We kindly ask additional guests to wait outside the studio when possible.</li></ul></section>
      <section><h2>Infant &amp; Baby Sessions</h2><p>Extra precautions are in place for baby shoots:</p><ul><li>Sanitized blankets, wraps, and props.</li><li>Optional gloves for handling babies.</li><li>A warm, clean environment tailored for infant comfort and health.</li></ul><p>Photographers and staff interacting with babies will sanitize thoroughly and wear masks throughout the session.</p></section>
      <section><h2>Communication &amp; Transparency</h2><ul><li>Our team is trained to follow all health and safety protocols.</li><li>Feel free to let us know if you have specific concerns or additional precautions you&apos;d like us to take.</li><li>We are happy to adjust our setup to help you feel safe and comfortable during your visit.</li></ul></section>
      <section><p>These measures are in place to protect everyone in the Kahel Studio community: our clients, their families, and our staff. If you have any questions about our safety guidelines or would like to request additional accommodations, please contact <Email local="customercare" domain="kahelstudio.com" label="Customer Care" />.</p><p>Thank you for your understanding and cooperation!</p></section>
    </div>
  </main>;
}

type BookingForm = { name: string; email: string; mobile: string; session: string; date: string; time: string; location: string; promoCode: string; pay: "deposit" | "full" | "cash"; addons: string[] };
const emptyBooking: BookingForm = { name: "", email: "", mobile: "", session: "", date: "", time: "", location: "", promoCode: "", pay: "deposit", addons: [] };

function DatePicker({ value, onChange, bookedDates }: { value: string; onChange: (value: string) => void; bookedDates?: Set<string> }) {
  const [open, setOpen] = useState(false);
  const pickerRef = usePopupDismissal(open, setOpen);
  const initial = value ? new Date(`${value}T00:00`) : new Date();
  const [month, setMonth] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const first = new Date(month.year, month.month, 1);
  const lead = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => new Date(month.year, month.month, 1 - lead + index));
  const label = value ? new Date(`${value}T00:00`).toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" }) : "dd/mm/yyyy";
  const step = (amount: number) => { const next = new Date(month.year, month.month + amount, 1); setMonth({ year: next.getFullYear(), month: next.getMonth() }); };
  return <div ref={pickerRef} className={styles.picker}><button type="button" className={styles.pickerTrigger} aria-expanded={open} onClick={() => setOpen((current) => !current)}><span>{label}</span><CalendarDays size={16} /></button>{open && <div className={styles.calendar}><div className={styles.calendarHead}><strong>{first.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}</strong><span><button type="button" onClick={() => step(-1)} aria-label="Previous month"><ChevronLeft /></button><button type="button" onClick={() => step(1)} aria-label="Next month"><ChevronRight /></button></span></div><div className={styles.weekdays}>{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className={styles.days}>{cells.map((date) => { const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; const past = iso < todayIso(); const booked = !past && (bookedDates?.has(iso) ?? false); return <button type="button" key={iso} data-outside={date.getMonth() !== month.month} data-today={iso === todayIso()} data-past={past} data-booked={booked} aria-pressed={iso === value} disabled={past} onClick={() => { if (!past) { onChange(iso); setOpen(false); } }}>{date.getDate()}</button>; })}</div><div className={styles.calendarFoot}><button type="button" onClick={() => { onChange(""); setOpen(false); }}>Clear</button><button type="button" onClick={() => { onChange(todayIso()); setOpen(false); }}>Today</button></div></div>}</div>;
}

function formatBookingTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return `${pad(hour % 12 || 12)}:${pad(minute)} ${hour >= 12 ? "PM" : "AM"}`;
}

function addMinutes(value: string, minutesToAdd: number) {
  const [hour, minute] = value.split(":").map(Number);
  const totalMinutes = hour * 60 + minute + minutesToAdd;
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
}

function TimePicker({ value, durationMinutes, onChange, bookedTimes, selectedDate }: { value: string; durationMinutes: number; onChange: (value: string) => void; bookedTimes?: Set<string>; selectedDate?: string }) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studioSession = durationMinutes > 0;
  const disabled = durationMinutes < 0;
  const bookingTimeSlots = Array.from({ length: studioSession ? 9 : 24 }, (_, index) => {
    const totalMinutes = (studioSession ? 8 * 60 : 0) + index * 60;
    return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
  });
  useEffect(() => {
    wheelRef.current?.scrollTo({ top: 0 });
    return () => { if (scrollTimer.current) clearTimeout(scrollTimer.current); };
  }, [durationMinutes]);
  const selectCenteredTime = () => {
    if (!wheelRef.current) return;
    const wheelBounds = wheelRef.current.getBoundingClientRect();
    const center = wheelBounds.top + wheelBounds.height / 2;
    const options = [...wheelRef.current.querySelectorAll<HTMLButtonElement>("[data-time]:not([disabled])")];
    const closest = options.reduce((best, option) => Math.abs(option.getBoundingClientRect().top + option.offsetHeight / 2 - center) < Math.abs(best.getBoundingClientRect().top + best.offsetHeight / 2 - center) ? option : best);
    if (closest.dataset.time && closest.dataset.time !== value) onChange(closest.dataset.time);
  };
  const handleScroll = () => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(selectCenteredTime, 100);
  };
  const chooseTime = (time: string, target: HTMLButtonElement) => {
    if (target.disabled) return;
    onChange(time);
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  if (disabled) return <div className={styles.timeWheelDisabled}>Select a session first</div>;
  return <div className={styles.timePickerInline}><div className={styles.timePickerHead}><strong>{studioSession ? "Choose a studio time" : "Choose an event start time"}</strong><span>{studioSession ? `8:00 AM–5:00 PM · ${durationMinutes === 30 ? "30-min" : "1-hour"} session` : "Events can start at any time"}</span></div><div className={styles.timeWheelFrame}><div className={styles.timeWheelSelection} aria-hidden="true" /><div ref={wheelRef} className={styles.timeWheel} role="listbox" aria-label="Available start times" tabIndex={0} onScroll={handleScroll}>{bookingTimeSlots.map((time) => { const now = new Date(); const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`; const isPastTime = selectedDate === todayIso() && time <= nowStr; const isBooked = bookedTimes?.has(time) ?? false; const isDisabled = isPastTime || isBooked; return <button type="button" role="option" aria-selected={value === time} data-time={time} data-booked={isBooked} data-past-time={isPastTime} key={time} disabled={isDisabled} onClick={(event) => chooseTime(time, event.currentTarget)}>{studioSession ? <><span>{formatBookingTime(time)}</span><ArrowRight size={15} /><span>{formatBookingTime(addMinutes(time, durationMinutes))}</span></> : <span>{formatBookingTime(time)}</span>}</button>; })}</div></div><small>Scroll to select · 1-hour intervals</small></div>;
}

function Booking({ goHome }: { goHome: () => void }) {
  const [form, setForm] = useState(emptyBooking);
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [reference, setReference] = useState("");
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const bookingRequestId = useRef<string | null>(null);
  useEffect(() => {
    fetch("/api/paymongo/availability").then((r) => r.ok ? r.json() as Promise<{ bookedSlots: Array<{ date: string; time: string }> }> : null).then((data) => {
      if (data) setBookedSlots(new Set(data.bookedSlots.map((s) => `${s.date}|${s.time}`)));
    }).catch(() => {});
  }, []);
  const allPackages = [...studioPackages, ...eventPackages];
  const selected = allPackages.find((item) => item.name === form.session);
  const studioSelected = studioPackages.some((item) => item.name === form.session);
  const sessionDuration = !selected ? -1 : studioSelected ? (selected.per === "30 minutes" ? 30 : 60) : 0;
  const availableAddons = studioSelected ? sessionAddOns : (form.session ? eventAddOns : []);
  const discountPercentage = promoDiscountPercentage(form.promoCode);
  const due = selected ? Math.round(applyPromoDiscount(selected.price * 100, form.promoCode) * (form.pay === "deposit" ? 0.5 : 1)) / 100 : 0;
  const bookedTimesForDate = new Set([...bookedSlots].filter((s) => s.startsWith(`${form.date}|`)).map((s) => s.split("|")[1]));
  const bookedTimesByDate = new Map<string, Set<string>>();
  for (const slot of bookedSlots) {
    const [date, time] = slot.split("|");
    if (!bookedTimesByDate.has(date)) bookedTimesByDate.set(date, new Set());
    bookedTimesByDate.get(date)!.add(time);
  }
  const fullyBookedDates = new Set([...bookedTimesByDate.entries()].filter(([, times]) => times.size >= 9).map(([date]) => date));
  const valid = Boolean(form.name && form.email && /^9\d{9}$/.test(form.mobile) && form.session && form.date && form.time && form.date >= todayIso() && !bookedTimesForDate.has(form.time));
  const update = <Key extends keyof BookingForm>(key: Key, value: BookingForm[Key]) => setForm((current) => ({ ...current, [key]: key === "mobile" ? String(value).replace(/\D/g, "").replace(/^0/, "").slice(0, 10) : value, ...(key === "session" ? { time: "", addons: [] } : {}) }));
  const toggleAddon = (name: string) => setForm((current) => ({ ...current, addons: current.addons.includes(name) ? current.addons.filter((a) => a !== name) : [...current.addons, name] }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || !selected) return;
    setStatus("submitting");
    try {
      const response = await fetch("/api/paymongo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": bookingRequestId.current ??= crypto.randomUUID() },
        body: JSON.stringify({ ...form, mobile: `+63${form.mobile}` }),
      });
      const result = await response.json() as { checkoutUrl?: string; confirmed?: boolean; reference?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to complete the booking.");
      if (result.confirmed) { setReference(result.reference ?? ""); setStatus("done"); return; }
      if (!result.checkoutUrl) throw new Error(result.error || "Unable to open checkout.");
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setStatus("idle");
      window.alert(error instanceof Error ? error.message : "Unable to open checkout.");
    }
  };
  const dateLabel = form.date ? new Date(`${form.date}T00:00`).toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" }) : "—";
  if (status === "done") return <main className={`${styles.page} ${styles.confirmation}`}><div className={styles.stamp}>Reserved</div><h1>Your date is reserved.</h1><p>We&apos;ve noted the slip and will confirm within 48 hours at {form.email}.</p><div className={styles.confirmationCard}><header><span>Reference</span><strong>{reference}</strong></header>{[["Name", form.name], ["Session", form.session], ...(form.addons.length ? [["Add-ons", form.addons.join(", ")]] : []), ["Preferred date", dateLabel], ["Location", form.location || "To be confirmed"], ["Estimated from", selected ? peso(selected.price) : "—"], [form.pay === "cash" ? "Payment" : form.pay === "deposit" ? "Deposit to reserve" : "Full payment", form.pay === "cash" ? "Cash (pay at studio)" : peso(due)]].map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</div><div className={styles.confirmActions}><button type="button" onClick={() => { setForm(emptyBooking); setStatus("idle"); }}>Book another</button><button type="button" onClick={goHome}>Back to home</button></div></main>;
  return <main className={`${styles.page} ${styles.container}`}><Eyebrow>ONLINE BOOKING</Eyebrow><h1>Reserve Your Date</h1><p className={styles.lead}>Complete the booking form and choose your preferred payment method. Your date is secured once we confirm your booking.</p><form className={styles.bookingGrid} onSubmit={submit}><div className={styles.slip}><header><span>Booking order</span><span>Ref · Pending</span></header><div className={styles.fields}><label>Full name<input required value={form.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" placeholder="Juan dela Cruz" /></label><label>Email<input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" placeholder="you@email.com" /></label><label className={styles.fullField}>Mobile number<input required type="tel" value={form.mobile} onChange={(event) => update("mobile", event.target.value)} autoComplete="tel" placeholder="0917 000 0000" /></label><fieldset className={styles.fullField}><legend className={styles.srOnly}>Session</legend><small>Studio sessions</small><div className={styles.sessionChips}>{studioPackages.map((item) => <button type="button" key={item.name} aria-pressed={form.session === item.name} onClick={() => update("session", item.name)}>{item.name}</button>)}</div><small>Events</small><div className={styles.sessionChips}>{eventPackages.map((item) => <button type="button" key={item.name} aria-pressed={form.session === item.name} onClick={() => update("session", item.name)}>{item.name}</button>)}</div></fieldset><label>Preferred date<DatePicker value={form.date} onChange={(value) => update("date", value)} bookedDates={fullyBookedDates} /></label><label>Preferred time<TimePicker value={form.time} durationMinutes={sessionDuration} onChange={(value) => update("time", value)} bookedTimes={bookedTimesForDate} selectedDate={form.date} /></label>{!studioSelected && <label className={styles.fullField}>Location<input value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="City / venue" /></label>}{availableAddons.length > 0 && <fieldset className={styles.fullField}><legend>Add-ons</legend><div className={styles.payment}>{availableAddons.map(([name, price]) => <button type="button" key={name} aria-pressed={form.addons.includes(name)} onClick={() => toggleAddon(name)}><strong>{name}</strong><span>{price}</span></button>)}</div></fieldset>}<label className={styles.fullField}>Promo Code<input value={form.promoCode} onChange={(event) => update("promoCode", event.target.value)} placeholder="Enter promo code" autoComplete="off" /></label><fieldset className={styles.fullField}><legend>Payment</legend><div className={styles.payment}><button type="button" aria-pressed={form.pay === "full"} onClick={() => update("pay", "full")}><strong>Pay in full</strong><span>Pay online via GCash / card</span></button><button type="button" aria-pressed={form.pay === "deposit"} onClick={() => update("pay", "deposit")}><strong>50% downpayment</strong><span>Pay online via GCash / card</span></button><button type="button" aria-pressed={form.pay === "cash"} onClick={() => update("pay", "cash")}><strong>Cash</strong><span>Pay at the studio</span></button></div></fieldset></div></div><aside className={styles.summary}><header>Booking details</header><div><p><span>Session</span><strong>{form.session || "—"}</strong></p><p><span>Date</span><strong>{dateLabel}</strong></p>{form.addons.length > 0 && <p><span>Add-ons</span><strong>{form.addons.join(", ")}</strong></p>}<p><span>Session rate</span><strong>{selected ? peso(selected.price) : "—"}</strong></p><p><span>Promo Applied</span><strong>{discountPercentage ? `${discountPercentage}%` : "—"}</strong></p><p><span>{form.pay === "cash" ? "Payment method" : form.pay === "deposit" ? "Due to reserve (50%)" : "Due to reserve (full)"}</span><strong>{form.pay === "cash" ? "Cash at studio" : selected ? peso(due) : "—"}</strong></p></div><button type="submit" disabled={!valid || status === "submitting"}>{status === "submitting" && <i />} {status === "submitting" ? "Reserving…" : "Reserve this date"}</button><small>{form.pay === "cash" ? "No online payment · we'll confirm within 48 hours" : valid ? "No payment taken now · confirmation within 48 hours" : "Accepts GCash, credit cards, QR Ph."}</small></aside></form></main>;
}

function FinalCta({ goBook }: { goBook: () => void }) {
  return <section className={styles.finalCta}><div className={styles.container}><div><h2>Let’s Create Something Worth Remembering</h2><p>Share your date and what you have in mind. We’ll handle the details and plan everything around your people, purpose, and vision.</p></div><div className={styles.finalCtaActions}><ArrowButton onClick={goBook}>Book your session</ArrowButton></div></div></section>;
}

function SocialIcon({ type }: { type: "Facebook" | "Instagram" | "TikTok" | "YouTube" }) {
  const paths = { Facebook: "M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z", Instagram: "M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z", TikTok: "M15.43 2c.34 2.93 1.96 4.68 4.57 4.87v3.3a8.64 8.64 0 0 1-4.53-1.34v6.32A6.85 6.85 0 1 1 9.56 8.4c.4-.06.8-.08 1.2-.04v3.42a3.46 3.46 0 1 0 1.32 2.72V2h3.35Z", YouTube: "M23.5 6.19a3 3 0 0 0-2.11-2.12C19.52 3.57 12 3.57 12 3.57s-7.52 0-9.39.5A3 3 0 0 0 .5 6.19 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.81 3 3 0 0 0 2.11 2.12c1.87.5 9.39.5 9.39.5s7.52 0 9.39-.5a3 3 0 0 0 2.11-2.12A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[type]} /></svg>;
}

function Footer({ go }: { go: (page: Page, category?: ServiceCategory) => void }) {
  const socials = [
    { name: "Facebook", href: "https://www.facebook.com/kahelstudio" },
    { name: "Instagram", href: "https://www.instagram.com/kahelstudio" },
    { name: "TikTok", href: "https://www.tiktok.com/@kahel.studio" },
    { name: "YouTube", href: "https://youtube.com/@kahelstudio" },
  ] as const;
  return <footer className={styles.footer}><div className={styles.container}><div className={styles.footerGrid}><div><Logo white /><p>Photography for life&apos;s most meaningful moments, portraits, celebrations and commercial work.</p><div className={styles.socials}>{socials.map((social) => <a href={social.href} key={social.name} aria-label={social.name} target="_blank" rel="noopener noreferrer"><SocialIcon type={social.name} /></a>)}</div></div><div><h3>Explore</h3><nav><button type="button" onClick={() => go("portfolio")}>Work</button><button type="button" onClick={() => go("services", "sessions")}>Studio sessions</button><button type="button" onClick={() => go("services", "events")}>Events</button><button type="button" onClick={() => go("about")}>About</button></nav></div><div><h3>Studio</h3><address>Cobo, Tabaco City,<br />Albay 4511 · Philippines<a href="tel:+639691532992">+63 969 153 2992</a><Email local="hello" domain="kahelstudio.com" /></address></div></div><div className={styles.footerBottom}><span>© 2026 Kahel Studio · All rights reserved</span><span><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/health-safety">Health &amp; Safety</Link></span></div></div></footer>;
}

export function MarketingSite({ initialPage = "home" }: { initialPage?: Page }) {
  const [page, setPage] = useState<Page>(initialPage);
  const [theme, setThemeState] = useState<Theme>("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>("sessions");
  const [customer, setCustomer] = useState<CustomerHeaderState>({ authenticated: false });
  const menuTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    let next: Theme;
    try { next = localStorage.getItem("ks-theme") as Theme; } catch { next = "light"; }
    if (next !== "light" && next !== "dark") { const hour = new Date().getHours(); next = hour >= 18 || hour < 6 ? "dark" : "light"; }
    // The server renders light; synchronize the local preference after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(next);
  }, []);
  useEffect(() => {
    fetch("/api/customer/session", { cache: "no-store" }).then((response) => response.ok ? response.json() as Promise<CustomerHeaderState> : null).then((state) => { if (state) setCustomer(state); }).catch(() => {});
  }, []);
  useEffect(() => {
    const restorePage = () => setPage(window.location.pathname === "/book" ? "book" : window.location.pathname === "/" ? "home" : initialPage);
    window.addEventListener("popstate", restorePage);
    return () => window.removeEventListener("popstate", restorePage);
  }, [initialPage]);
  const go = (next: Page, category?: ServiceCategory) => { if (category) setServiceCategory(category); if (next === "book" && window.location.pathname !== "/book") window.history.pushState(null, "", "/book"); else if (page === "book" && next !== "book" && window.location.pathname === "/book") window.history.pushState(null, "", "/"); setPage(next); setMenuOpen(false); document.body.style.overflow = ""; window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };
  const closeMenu = () => { setMenuOpen(false); requestAnimationFrame(() => menuTrigger.current?.focus()); };
  const signOut = () => { void fetch("/api/customer/session", { method: "DELETE" }).finally(() => { setCustomer({ authenticated: false }); setMenuOpen(false); }); };
  return <div className={styles.site} data-theme={theme}><a href="#marketing-main" className={styles.skipLink}>Skip to main content</a><Header page={page} customer={customer} go={go} signOut={signOut} openMenu={() => { menuTrigger.current = document.activeElement as HTMLElement; setMenuOpen(true); }} />{menuOpen && <MobileMenu page={page} customer={customer} close={closeMenu} go={go} signOut={signOut} />}<div id="marketing-main">{page === "home" && <Home go={go} />}{page === "portfolio" && <Portfolio />}{page === "services" && <Services category={serviceCategory} setCategory={setServiceCategory} goBook={() => go("book")} />}{page === "about" && <About />}{page === "book" && <Booking goHome={() => go("home")} />}{page === "privacy" && <Privacy />}{page === "terms" && <Terms />}{page === "health-safety" && <HealthSafety />}</div>{page !== "book" && page !== "privacy" && page !== "terms" && page !== "health-safety" && <FinalCta goBook={() => go("book")} />}<Footer go={go} /></div>;
}
