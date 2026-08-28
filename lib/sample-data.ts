// Sample data ported verbatim from the Kahel Studio OS design prototype
// (Kahel Studio OS.dc.html) so every screen reads from one consistent set
// of clients, bookings, and figures. Swap for Supabase queries later —
// keep the shapes stable so that swap stays mechanical.

import type { AccentId } from "@/lib/apps-config";

export type BookingStatusId =
  | "inquiry"
  | "quoted"
  | "confirmed"
  | "progress"
  | "completed"
  | "cancelled";

export const BOOKING_STATUS: Record<BookingStatusId, { label: string; bg: string; text: string }> = {
  inquiry: { label: "Inquiry", bg: "var(--color-surface-muted)", text: "var(--color-text-secondary)" },
  quoted: { label: "Quoted", bg: "var(--color-info-bg)", text: "var(--color-info-text)" },
  confirmed: { label: "Confirmed", bg: "var(--color-success-bg)", text: "var(--color-success-text)" },
  progress: { label: "In progress", bg: "var(--color-attention-bg)", text: "var(--color-attention-text)" },
  completed: { label: "Completed", bg: "var(--color-teal-100)", text: "var(--color-teal-800)" },
  cancelled: { label: "Cancelled", bg: "var(--color-danger-bg)", text: "var(--color-danger-text)" },
};

type AccountType = "Corporate" | "Consumer";

interface Contact {
  ini: string;
  name: string;
  tag: string;
  email: string;
}

interface AccountPayment {
  label: string;
  date: string;
  method: string;
  amount: string;
}

interface AccountBookingRef {
  ref: string;
  type: string;
  date: string;
  status: BookingStatusId;
  total: string;
}

export interface Account {
  id: string;
  name: string;
  ini: string;
  type: AccountType;
  accent: "indigo" | "ink";
  source: string;
  last: string;
  ltv: string;
  phone: string;
  referredBy?: string;
  since?: string;
  nextAction?: { label: string; due: string };
  bookings: AccountBookingRef[];
  payments: AccountPayment[];
  contacts: Contact[];
  notes: string;
  identity: {
    primaryMobile: string;
    primaryVerified: boolean;
    altMobile?: string;
    clientId: string;
    numberHistory: { number: string; note: string }[];
  };
}

export const ACCOUNTS: Account[] = [
  {
    id: "bianca-marco-deveza",
    name: "Bianca & Marco Deveza",
    ini: "B&M",
    type: "Consumer",
    accent: "indigo",
    source: "Referral",
    last: "12 Jun 2026",
    ltv: "₱214,000",
    phone: "+63 917 555 0142",
    referredBy: "Ayala Land Premier",
    since: "Mar 2026",
    nextAction: { label: "Send album proof for approval", due: "Due today" },
    bookings: [
      { ref: "KS-2026-0142", type: "Wedding — Full Day", date: "09 Aug 2026", status: "confirmed", total: "₱185,000" },
      { ref: "KS-2025-0088", type: "Prenup / Engagement", date: "14 Mar 2026", status: "completed", total: "₱29,000" },
    ],
    payments: [
      { label: "Deposit — Wedding", date: "20 Jun 2026", method: "PayMongo", amount: "₱92,500" },
      { label: "Prenup — Paid in full", date: "01 Mar 2026", method: "Cash", amount: "₱29,000" },
    ],
    contacts: [
      { ini: "BD", name: "Bianca Deveza", tag: "Primary · Subject", email: "bianca.d@gmail.com" },
      { ini: "MD", name: "Marco Deveza", tag: "Billing", email: "marco.deveza@gmail.com" },
    ],
    notes:
      "Prefers weekend sessions. Marco handles billing. Wants matte prints, no gloss. Anniversary shoot likely Q1 2027 — follow up December.",
    identity: {
      primaryMobile: "+63 917 555 0142",
      primaryVerified: true,
      altMobile: "+63 918 220 4471",
      clientId: "CLI-8f3a·b7d2·4e10",
      numberHistory: [
        { number: "+63 917 555 0142", note: "current since 12 Mar 2026" },
        { number: "+63 906 210 8890", note: "replaced 12 Mar 2026" },
      ],
    },
  },
  {
    id: "ayala-land-premier",
    name: "Ayala Land Premier",
    ini: "AL",
    type: "Corporate",
    accent: "ink",
    source: "Website",
    last: "02 Jul 2026",
    ltv: "₱486,000",
    phone: "+63 917 •••• 0330",
    since: "Jan 2025",
    bookings: [
      { ref: "KS-2026-0138", type: "Corporate Headshots", date: "22 Jul 2026", status: "progress", total: "₱96,000" },
    ],
    payments: [{ label: "Corporate Headshots — Deposit", date: "10 Jul 2026", method: "Bank transfer", amount: "₱48,000" }],
    contacts: [{ ini: "RC", name: "Rosa Castillo", tag: "Billing", email: "rosa.castillo@ayalaland.com.ph" }],
    notes: "Standing corporate account. Invoices net-30. Coordinates via Rosa for all shoot scheduling.",
    identity: {
      primaryMobile: "+63 917 •••• 0330",
      primaryVerified: true,
      clientId: "CLI-2c91·aa04·77e2",
      numberHistory: [{ number: "+63 917 •••• 0330", note: "current since 14 Jan 2025" }],
    },
  },
  {
    id: "solaire-resort-casino",
    name: "Solaire Resort & Casino",
    ini: "SR",
    type: "Corporate",
    accent: "ink",
    source: "Referral",
    last: "18 May 2026",
    ltv: "₱372,000",
    phone: "+63 918 •••• 7712",
    since: "Sep 2024",
    bookings: [
      { ref: "KS-2026-0079", type: "Event Coverage", date: "18 May 2026", status: "completed", total: "₱120,000" },
    ],
    payments: [{ label: "Event Coverage — Paid in full", date: "20 May 2026", method: "Bank transfer", amount: "₱120,000" }],
    contacts: [{ ini: "JT", name: "Jerome Tan", tag: "Events", email: "jerome.tan@solaire.com.ph" }],
    notes: "Books quarterly event coverage. Prefers same lead photographer each time.",
    identity: {
      primaryMobile: "+63 918 •••• 7712",
      primaryVerified: true,
      clientId: "CLI-511f·9c3d·2a88",
      numberHistory: [{ number: "+63 918 •••• 7712", note: "current since 02 Sep 2024" }],
    },
  },
  {
    id: "reyes-family",
    name: "Reyes Family",
    ini: "RF",
    type: "Consumer",
    accent: "indigo",
    source: "Instagram",
    last: "—",
    ltv: "₱28,000",
    phone: "+63 926 •••• 4418",
    since: "Jul 2026",
    nextAction: { label: "Follow up on quote", due: "Due today" },
    bookings: [{ ref: "KS-2026-0151", type: "Birthday / Christening", date: "26 Jul 2026", status: "quoted", total: "₱28,000" }],
    payments: [],
    contacts: [{ ini: "MR", name: "Marisol Reyes", tag: "Primary", email: "marisol.reyes@gmail.com" }],
    notes: "Enquired via Instagram DM. Birthday and christening combined session for their daughter.",
    identity: {
      primaryMobile: "+63 926 •••• 4418",
      primaryVerified: false,
      clientId: "CLI-7710·e4b1·905c",
      numberHistory: [{ number: "+63 926 •••• 4418", note: "current since 18 Jul 2026" }],
    },
  },
  {
    id: "globe-telecom",
    name: "Globe Telecom",
    ini: "GL",
    type: "Corporate",
    accent: "ink",
    source: "LinkedIn",
    last: "—",
    ltv: "—",
    phone: "+63 917 •••• 1900",
    since: "Jul 2026",
    nextAction: { label: "Send product shoot proposal", due: "3 days cold" },
    bookings: [{ ref: "KS-2026-0155", type: "Product / E-commerce", date: "30 Jul 2026", status: "inquiry", total: "—" }],
    payments: [],
    contacts: [{ ini: "PC", name: "Patricia Chua", tag: "Marketing", email: "patricia.chua@globe.com.ph" }],
    notes: "Product shoot inquiry for e-commerce catalog. Awaiting proposal sign-off.",
    identity: {
      primaryMobile: "+63 917 •••• 1900",
      primaryVerified: false,
      clientId: "CLI-3b6a·1d09·f421",
      numberHistory: [{ number: "+63 917 •••• 1900", note: "current since 16 Jul 2026" }],
    },
  },
  {
    id: "aria-josh-lim",
    name: "Aria & Josh Lim",
    ini: "A&J",
    type: "Consumer",
    accent: "indigo",
    source: "Referral",
    last: "28 Jun 2026",
    ltv: "₱42,000",
    phone: "+63 995 •••• 2261",
    since: "Jun 2026",
    bookings: [{ ref: "KS-2026-0149", type: "Prenup / Engagement", date: "02 Aug 2026", status: "confirmed", total: "₱42,000" }],
    payments: [{ label: "Deposit — Prenup", date: "28 Jun 2026", method: "GCash", amount: "₱21,000" }],
    contacts: [{ ini: "AL", name: "Aria Lim", tag: "Primary · Subject", email: "aria.lim@gmail.com" }],
    notes: "Referred by a past wedding client. Engagement shoot booked ahead of a 2027 wedding date.",
    identity: {
      primaryMobile: "+63 995 •••• 2261",
      primaryVerified: true,
      clientId: "CLI-90ad·2f7c·116b",
      numberHistory: [{ number: "+63 995 •••• 2261", note: "current since 28 Jun 2026" }],
    },
  },
];

export const ACCOUNTS_BY_ID: Record<string, Account> = Object.fromEntries(
  ACCOUNTS.map((a) => [a.id, a])
);

// ── Bookings ─────────────────────────────────────────────────────────
export interface BookingRow {
  id?: string;
  ref: string;
  accountId: string;
  account: string;
  type: string;
  date: string;
  status: BookingStatusId;
  total: string;
  sessionDetails?: {
    dateTime: string;
    location: string;
    sessionType: string;
    balanceDueOn: string;
  };
  payment?: { total: string; deposit: string; balance: string; depositVerificationId?: string | null };
  auditLog?: { text: string; when: string; dot: string }[];
  linkedProjectRef?: string;
}

export const BOOKINGS: BookingRow[] = [
  {
    ref: "KS-2026-0142",
    accountId: "bianca-marco-deveza",
    account: "Bianca & Marco Deveza",
    type: "Wedding — Full Day",
    date: "09 Aug 2026",
    status: "confirmed",
    total: "₱185,000",
    sessionDetails: {
      dateTime: "09 Aug 2026 · 8:00 AM–10:00 PM",
      location: "Fairmont Makati",
      sessionType: "Wedding — Full Day",
      balanceDueOn: "26 Jul 2026",
    },
    payment: { total: "₱185,000.00", deposit: "₱92,500.00", balance: "₱92,500.00" },
    linkedProjectRef: "PRJ-2026-0142",
    auditLog: [
      { text: "Booking confirmed · deposit invoice sent", when: "20 Jun 2026 · 10:04", dot: "#00A15C" },
      { text: "Quote sent to Bianca & Marco Deveza", when: "15 Jun 2026 · 14:20", dot: "#0B5FFF" },
      { text: "Booking created from inquiry", when: "10 Jun 2026 · 09:11", dot: "var(--color-text-muted)" },
      { text: "Inquiry received via referral", when: "08 Jun 2026 · 17:45", dot: "var(--color-text-muted)" },
    ],
  },
  {
    ref: "KS-2026-0151",
    accountId: "reyes-family",
    account: "Reyes Family",
    type: "Birthday / Christening",
    date: "26 Jul 2026",
    status: "quoted",
    total: "₱28,000",
    sessionDetails: {
      dateTime: "26 Jul 2026 · 2:00PM – 5:00PM",
      location: "Studio A, BGC",
      sessionType: "Birthday / Christening",
      balanceDueOn: "24 Jul 2026",
    },
    payment: { total: "₱28,000.00", deposit: "₱14,000.00", balance: "₱14,000.00" },
    auditLog: [
      { text: "Quote sent to Reyes Family", when: "21 Jul 2026 · 09:02", dot: "#0B5FFF" },
      { text: "Booking created from inquiry", when: "19 Jul 2026 · 16:40", dot: "var(--color-text-muted)" },
      { text: "Inquiry received via Instagram", when: "18 Jul 2026 · 11:15", dot: "var(--color-text-muted)" },
    ],
  },
  {
    ref: "KS-2026-0138",
    accountId: "ayala-land-premier",
    account: "Ayala Land Premier",
    type: "Corporate Headshots",
    date: "22 Jul 2026",
    status: "progress",
    total: "₱96,000",
    sessionDetails: {
      dateTime: "22 Jul 2026 · 9:00 AM–1:00 PM",
      location: "Ayala Land Premier HQ",
      sessionType: "Corporate Headshots",
      balanceDueOn: "22 Jul 2026",
    },
    payment: { total: "₱96,000.00", deposit: "₱48,000.00", balance: "₱48,000.00" },
    linkedProjectRef: "PRJ-2026-0138",
    auditLog: [
      { text: "Corporate Headshots in progress", when: "22 Jul 2026 · 09:15", dot: "var(--color-attention-text)" },
      { text: "Booking confirmed · deposit invoice sent", when: "10 Jul 2026 · 11:30", dot: "#00A15C" },
      { text: "Quote sent to Ayala Land Premier", when: "05 Jul 2026 · 15:02", dot: "#0B5FFF" },
      { text: "Booking created from inquiry", when: "02 Jul 2026 · 10:00", dot: "var(--color-text-muted)" },
    ],
  },
  {
    ref: "KS-2026-0149",
    accountId: "aria-josh-lim",
    account: "Aria & Josh Lim",
    type: "Prenup / Engagement",
    date: "02 Aug 2026",
    status: "confirmed",
    total: "₱42,000",
    sessionDetails: {
      dateTime: "02 Aug 2026 · 3:00PM – 6:00PM",
      location: "Bonifacio High Street",
      sessionType: "Prenup / Engagement",
      balanceDueOn: "19 Jul 2026",
    },
    payment: { total: "₱42,000.00", deposit: "₱21,000.00", balance: "₱21,000.00" },
    linkedProjectRef: "PRJ-2026-0149",
    auditLog: [
      { text: "Booking confirmed · deposit invoice sent", when: "28 Jun 2026 · 13:40", dot: "#00A15C" },
      { text: "Quote sent to Aria & Josh Lim", when: "26 Jun 2026 · 09:20", dot: "#0B5FFF" },
      { text: "Booking created from inquiry", when: "24 Jun 2026 · 18:05", dot: "var(--color-text-muted)" },
    ],
  },
  {
    ref: "KS-2026-0155",
    accountId: "globe-telecom",
    account: "Globe Telecom",
    type: "Product / E-commerce",
    date: "30 Jul 2026",
    status: "inquiry",
    total: "—",
    auditLog: [{ text: "Inquiry received via LinkedIn", when: "16 Jul 2026 · 14:12", dot: "var(--color-text-muted)" }],
  },
];

export const BOOKINGS_BY_REF: Record<string, BookingRow> = Object.fromEntries(
  BOOKINGS.map((b) => [b.ref, b])
);

export const BOOKING_STEPS_ORDER: BookingStatusId[] = [
  "inquiry",
  "quoted",
  "confirmed",
  "progress",
  "completed",
];

export interface CatalogItem {
  code: string;
  name: string;
  detail: string;
  price: string;
  qty?: string;
}

export const POS_CATALOGS: Record<string, { title: string; sub: string; unit: string; data: CatalogItem[] }> = {
  "cat-sessions": {
    title: "Studio Sessions",
    sub: "In-studio shoots booked by the hour or package",
    unit: "Duration",
    data: [
      { code: "SS-PORT", name: "Portrait Session", detail: "1 hr · 1 look · 10 edited", price: "₱3,500" },
      { code: "SS-HEAD", name: "Corporate Headshots", detail: "30 min · 3 edited", price: "₱2,200" },
      { code: "SS-FAM", name: "Family Session", detail: "1.5 hr · up to 6 pax · 20 edited", price: "₱5,800" },
      { code: "SS-NEW", name: "Newborn / Maternity", detail: "2 hr · props included · 15 edited", price: "₱6,500" },
      { code: "SS-PROD", name: "Product Photography", detail: "Per 10 items · white bg", price: "₱4,000" },
    ],
  },
  "cat-events": {
    title: "Event Coverage",
    sub: "On-location coverage packages",
    unit: "Coverage",
    data: [
      { code: "EV-WED-F", name: "Wedding — Full Day", detail: "10 hr · 2 shooters · album", price: "₱120,000" },
      { code: "EV-WED-H", name: "Wedding — Half Day", detail: "6 hr · 1 shooter", price: "₱75,000" },
      { code: "EV-CORP", name: "Corporate Event", detail: "4 hr · same-day highlights", price: "₱38,000" },
      { code: "EV-BDAY", name: "Birthday / Christening", detail: "3 hr · 1 shooter", price: "₱18,000" },
      { code: "EV-DEBUT", name: "Debut / 18th", detail: "6 hr · 2 shooters · SDE", price: "₱55,000" },
    ],
  },
  "cat-rentals": {
    title: "Rentals",
    sub: "Gear rented per day — stock is live",
    unit: "Available",
    data: [
      { code: "RN-R5", name: "Canon EOS R5 Body", detail: "Per day · incl. 2 batteries", price: "₱2,500", qty: "3 avail" },
      { code: "RN-2470", name: "RF 24-70mm f/2.8", detail: "Per day", price: "₱1,200", qty: "2 avail" },
      { code: "RN-GODOX", name: "Godox AD600 Kit", detail: "Per day · softbox + stand", price: "₱1,500", qty: "4 avail" },
      { code: "RN-CYC", name: "Cyclorama Studio A", detail: "Per hour · white cyc", price: "₱900", qty: "Bookable" },
      { code: "RN-GIMBAL", name: "DJI RS 3 Gimbal", detail: "Per day", price: "₱1,000", qty: "1 avail" },
    ],
  },
  "cat-retail": {
    title: "Retail",
    sub: "Physical products sold at the counter",
    unit: "Stock",
    data: [
      { code: "RT-8X10", name: "8×10 Matte Print", detail: "Single print", price: "₱180", qty: "120 in stock" },
      { code: "RT-FR1218", name: "Framed 12×18 (Oak)", detail: "Ready to hang", price: "₱1,450", qty: "14 in stock" },
      { code: "RT-ALB20", name: "Layflat Album 20pg", detail: "12×12 lambskin", price: "₱6,800", qty: "6 in stock" },
      { code: "RT-USB", name: "Engraved USB + Box", detail: "32GB · wooden box", price: "₱850", qty: "40 in stock" },
      { code: "RT-CANV", name: "Canvas Wrap 16×24", detail: "Gallery wrap", price: "₱2,400", qty: "4 in stock" },
    ],
  },
  "cat-addons": {
    title: "Add-ons",
    sub: "Extras attached to a session or booking",
    unit: "Type",
    data: [
      { code: "AD-HOUR", name: "Extra Coverage Hour", detail: "Per additional hour", price: "₱4,000" },
      { code: "AD-RUSH", name: "Rush Editing (48h)", detail: "Priority turnaround", price: "₱3,000" },
      { code: "AD-MUA", name: "Hair & Makeup", detail: "Per pax · on-site", price: "₱2,500" },
      { code: "AD-DRONE", name: "Drone Coverage", detail: "Per event · licensed pilot", price: "₱6,000" },
      { code: "AD-PRINTS", name: "Extra Edited Photos", detail: "Per 10 additional", price: "₱1,500" },
    ],
  },
};







export const ONBOARDING_CHECKLIST = [
  { label: "Signed contract", done: true },
  { label: "Copyright assignment", done: true },
  { label: "Bank / payout details", done: true },
  { label: "Equipment orientation", done: true },
  { label: "Style & delivery guide", done: false },
  { label: "First engagement scheduled", done: false },
].map((c) => ({
  label: c.label,
  done: c.done,
  tick: c.done ? "#00A15C" : "var(--color-text-muted)",
  bg: c.done ? "var(--color-success-bg)" : "var(--color-surface-muted)",
  textColor: c.done ? "var(--color-text-primary)" : "var(--color-text-muted)",
}));


export const OFFBOARDING_CHECKLIST = [
  { label: "Final payout cleared", done: true },
  { label: "Equipment returned", done: true },
  { label: "Cloud & gallery access revoked", done: true },
  { label: "Client handover", done: false },
  { label: "Portfolio rights confirmed", done: false },
].map((c) => ({
  label: c.label,
  done: c.done,
  tick: c.done ? "#00A15C" : "var(--color-text-muted)",
  bg: c.done ? "var(--color-success-bg)" : "var(--color-surface-muted)",
  textColor: c.done ? "var(--color-text-primary)" : "var(--color-text-muted)",
}));

// ── Shiftboard ───────────────────────────────────────────────────────
export interface ShiftEntry {
  id: string;
  d: number;
  ini: string;
  who: string;
  role: string;
  time: string;
  loc: "studio" | "location";
}

// ── Feedback ─────────────────────────────────────────────────────────
export type FeedbackStatus = "Submitted" | "Triaged" | "In progress" | "Shipped";
export type FeedbackKind = "Problem" | "Idea";
export type FeedbackPriority = "Urgent" | "Normal" | "Low";


export const FEEDBACK_STATUS_META: Record<
  FeedbackStatus,
  { bg: string; color: string }
> = {
  Submitted: { bg: "#F1EFEC", color: "#6E6963" },
  Triaged: { bg: "#E3EDFF", color: "#053799" },
  "In progress": { bg: "#FFF0D6", color: "#8A6D00" },
  Shipped: { bg: "#E0F7EC", color: "#005430" },
};

export const FEEDBACK_KIND_META: Record<FeedbackKind, { bg: string; color: string }> = {
  Problem: { bg: "#FDE4EA", color: "#8A0625" },
  Idea: { bg: "#E3EDFF", color: "#053799" },
};

export const FEEDBACK_PRIORITY_META: Record<FeedbackPriority, { bg: string; color: string }> = {
  Urgent: { bg: "#FDE4EA", color: "#8A0625" },
  Normal: { bg: "#FFF0D6", color: "#8A6D00" },
  Low: { bg: "#E0F7EC", color: "#005430" },
};

export const FEEDBACK_STATUS_ORDER: FeedbackStatus[] = [
  "Submitted",
  "Triaged",
  "In progress",
  "Shipped",
];

// ── Preferences ──────────────────────────────────────────────────────
export const PREFERENCES_GENERAL = [
  { label: "Display language", value: "English (PH)" },
  { label: "Timezone", value: "GMT+8 · Manila" },
  { label: "Date format", value: "DD MMM YYYY" },
  { label: "Start of week", value: "Monday" },
  { label: "Landing app on login", value: "Dashboard" },
];

export const PREFERENCES_THEMES = [
  { k: "light", label: "Light", sub: "Warm paper", bg: "#FAF9F7", dot: "#242424" },
  { k: "dark", label: "Dark", sub: "Low light", bg: "#242424", dot: "#FAF9F7" },
  { k: "system", label: "System", sub: "Match device", bg: "linear-gradient(90deg,#FAF9F7 50%,#242424 50%)", dot: "#FF5300" },
];

export const PREFERENCES_DENSITY = [
  { k: "comfortable", label: "Comfortable" },
  { k: "compact", label: "Compact" },
];

// ── Company Policies ─────────────────────────────────────────────────
type PolicyBlock =
  | { type: "heading"; text: string }
  | { type: "text"; text: string }
  | { type: "list"; items: string[] };

export interface PolicySection {
  n: string;
  title: string;
  blocks: PolicyBlock[];
}

export const POLICY_META = {
  ver: "Version 1.0",
  eff: "Effective 22 Jul 2026",
  owner: "Kahel Studio Management",
  applies: "All employees unless a policy states otherwise",
};

export const POLICY_NOTE =
  "This handbook should be reviewed by a Philippine HR or labour-law professional before formal adoption. Statutory benefits, wage rates and government contribution rules follow the latest applicable requirements.";

export const POLICY_ACK_STATEMENT =
  "I confirm that I have received access to the Kahel Studio Company Policies. I understand that I am responsible for reading and following the policies applicable to my role, that policies may be updated with material changes communicated through an authorised channel, and that this acknowledgement does not remove any rights provided by law or replace my employment agreement.";

export const POLICY_SECTIONS: PolicySection[] = [
  { n: "01", title: "Purpose and values", blocks: [
    { type: "text", text: "Kahel Studio creates professional photography, video and visual experiences for individuals, businesses and organisations." },
    { type: "text", text: "Every team member is expected to uphold these values:" },
    { type: "list", items: ["Creativity — thoughtful, original and purposeful work.", "Professionalism — be reliable, prepared and respectful.", "Quality — meet the studio's technical and creative standards.", "Integrity — be honest, accountable and transparent.", "Collaboration — communicate clearly and support the team.", "Client care — protect the client's experience, privacy and trust.", "Continuous improvement — learn from feedback and improve our systems."] },
    { type: "text", text: "Management may issue procedures, guidelines and SOPs supporting these policies." },
  ]},
  { n: "02", title: "Equal opportunity and respectful workplace", blocks: [
    { type: "text", text: "Kahel Studio provides a professional workplace where people are treated fairly and respectfully. Discrimination, harassment, bullying, intimidation, retaliation and humiliating conduct are prohibited — involving employees, freelancers, interns, applicants, clients, suppliers and visitors." },
    { type: "text", text: "Prohibited conduct includes:" },
    { type: "list", items: ["Offensive comments or jokes", "Unwanted physical contact", "Sexual harassment or inappropriate advances", "Repeated insults, threats or public humiliation", "Discrimination based on protected characteristics", "Sharing offensive or inappropriate materials", "Retaliating against someone who reports a concern in good faith"] },
    { type: "text", text: "Concerns may be reported privately to the Admin, Super Admin or another designated person. Reports are reviewed promptly and as confidentially as reasonably possible." },
  ]},
  { n: "03", title: "Employment classifications", blocks: [
    { type: "text", text: "Team members may be classified as full-time, part-time, freelancer/independent contractor, intern/trainee, or probationary where applicable. The employment agreement determines classification, compensation, schedule, benefits and other terms." },
    { type: "text", text: "Freelancers are not automatically entitled to employee benefits, but must comply with confidentiality, safety, client-service, equipment and data-protection rules while working for the studio. A person's classification must reflect the actual working relationship and must not be used to avoid legal obligations." },
  ]},
  { n: "04", title: "Working schedule and attendance", blocks: [
    { type: "heading", text: "Standard schedule" },
    { type: "list", items: ["Five working days per week", "Eight working hours per day", "Scheduled meal and rest periods", "Schedules published through the Staff Hub or another authorised channel"] },
    { type: "text", text: "Normal working hours must comply with applicable Philippine labour requirements (generally not exceeding eight hours per day for covered employees)." },
    { type: "heading", text: "Attendance" },
    { type: "list", items: ["Report on time and ready to work", "Record attendance accurately and clock in/out personally", "Record approved breaks, fieldwork and assignments correctly", "Review records and promptly report discrepancies", "Never clock in/out or alter records for another person"] },
    { type: "text", text: "Falsifying attendance records is considered serious misconduct." },
    { type: "heading", text: "Absence and lateness" },
    { type: "text", text: "Inform your supervisor as soon as reasonably possible, preferably before the shift begins — with the reason, expected return, any urgent work to reassign, and supporting documentation when reasonably required. Repeated lateness or unauthorised absence may lead to corrective action; genuine emergencies are considered fairly." },
  ]},
  { n: "05", title: "Overtime, schedule extensions and rest days", blocks: [
    { type: "text", text: "Kahel Studio promotes a sustainable five-day workweek and does not encourage routine overtime. Overtime or schedule extensions must:" },
    { type: "list", items: ["Be necessary for an approved project, event or operational requirement", "Receive prior approval from an authorised supervisor", "Be accurately recorded", "Be reviewed before being included in payroll"] },
    { type: "text", text: "Do not work beyond your approved schedule without authorisation, except to address an immediate safety or security concern. Unauthorised overtime may result in corrective action, but time actually worked is still reviewed and handled per law. Managers must not knowingly permit off-the-clock work. Rest-day and holiday work must be approved and processed under current rules." },
  ]},
  { n: "06", title: "Leave and time-off", blocks: [
    { type: "text", text: "Submit leave requests through the Staff Hub within the required notice period whenever possible. A request should contain leave type, start and end dates, reason or supporting information, current commitments, and a practical work-handover plan." },
    { type: "text", text: "Approval depends on eligibility, balance, business requirements and team schedules. Emergencies and illness are handled per circumstances. You will not be required to disclose unnecessary medical details; medical information is confidential." },
    { type: "text", text: "Statutory leave entitlements follow applicable law. Covered employees with at least one year of service may qualify for five days of service incentive leave, subject to legal conditions and exemptions. Management may provide additional leave via contract or a separate benefit policy." },
  ]},
  { n: "07", title: "Payroll and compensation", blocks: [
    { type: "text", text: "Employee payroll is normally processed semi-monthly — first payout on the 15th, second on the last calendar day. When a pay date falls on a holiday, weekend or banking interruption, the confirmed schedule is communicated through an authorised channel." },
    { type: "text", text: "Payroll may include:" },
    { type: "list", items: ["Basic salary or wages", "Approved overtime and premium pay", "Allowances, commissions or incentives", "Approved reimbursements", "Statutory contributions and withholding", "Authorised deductions", "Approved adjustments"] },
    { type: "text", text: "Review your payslips and report discrepancies through the private payroll-discrepancy process — not in public or group channels. No disputed equipment, damage or cash-accountability amount is automatically deducted without proper review, documentation and any authorisation required by law. Salary information is confidential. 13th-month pay is administered per applicable requirements." },
  ]},
  { n: "08", title: "Performance and quality standards", blocks: [
    { type: "text", text: "Employees are expected to understand briefs, prepare equipment and files before production, follow approved workflows and naming conventions, meet deadlines, check work before submission, communicate risks early, respond professionally to feedback, record progress accurately, and protect client files and studio assets." },
    { type: "text", text: "Performance may be assessed using work quality and accuracy, reliability and attendance, timeliness, client service, communication, equipment care, compliance with procedures, and initiative. Feedback should be specific, documented and focused on improvement." },
  ]},
  { n: "09", title: "Client service and professional conduct", blocks: [
    { type: "text", text: "Employees represent Kahel Studio in every interaction with clients, guests, suppliers or partners. Team members must:" },
    { type: "list", items: ["Be courteous, calm and helpful", "Confirm client instructions before production", "Avoid promises outside their authority", "Protect client privacy", "Escalate complaints promptly", "Maintain appropriate language and appearance", "Avoid arguments with clients", "Never request personal payments, tips or side arrangements without authorisation"] },
    { type: "text", text: "Client complaints must be documented objectively. Do not delete, conceal or manipulate complaint records." },
  ]},
  { n: "10", title: "Confidentiality and intellectual property", blocks: [
    { type: "text", text: "Confidential information includes client contacts, unreleased photos and videos, pricing, proposals and contracts, payroll and employee information, passwords, business and financial records, editing presets and internal workflows, and project files and source materials." },
    { type: "text", text: "It may only be accessed or shared for authorised work. Employees must not:" },
    { type: "list", items: ["Copy files for personal use", "Upload confidential work to unauthorised platforms", "Share passwords", "Publish unreleased client work", "Use client information to solicit private work", "Retain business files after access is withdrawn"] },
    { type: "text", text: "Work created within scope is owned or licensed per the applicable agreement or client contract. Portfolio use requires approval and must respect client consent and release dates. Confidentiality obligations continue after employment or engagement ends." },
  ]},
  { n: "11", title: "Data privacy and system security", blocks: [
    { type: "text", text: "Kahel Studio processes employee and client information only for legitimate, disclosed purposes with reasonable safeguards. Team members must:" },
    { type: "list", items: ["Use only authorised accounts and devices", "Use strong, unique passwords and enable MFA when available", "Lock devices when unattended", "Store files only in approved locations", "Report suspected data loss or unauthorised access immediately", "Avoid sending sensitive files through public links", "Verify recipients before sharing information", "Never expose service credentials, access tokens or recovery codes"] },
    { type: "text", text: "Access is granted by role and business need. Do not access another person's files, payroll records or private communications without authorisation. Monitoring, where used, follows transparency, legitimate purpose and proportionality. Personal information is protected under the Data Privacy Act." },
  ]},
  { n: "12", title: "Studio equipment and asset care", blocks: [
    { type: "text", text: "Equipment may be used only for authorised work unless written permission is granted. Before use, verify the assignment, inspect condition, confirm batteries/media/accessories, use protective cases, and follow ingress/egress checklists." },
    { type: "text", text: "After use, return equipment to its assigned location, report damage or loss immediately, transfer and verify project files, remove batteries when required, clean per procedures, and complete the return/handover record." },
    { type: "text", text: "Do not conceal damage or attempt unauthorised repairs. Loss or damage is investigated fairly — financial accountability is not imposed automatically or deducted from payroll without evidence, due process and legal review." },
  ]},
  { n: "13", title: "Acceptable use of technology", blocks: [
    { type: "text", text: "Studio computers, internet, email, software and storage are primarily for authorised business use. Prohibited activities include:" },
    { type: "list", items: ["Installing unlicensed or unauthorised software", "Circumventing security controls", "Accessing illegal or harmful material", "Using pirated media or software", "Mining cryptocurrency", "Sharing accounts or licence credentials", "Connecting unknown storage devices without approval", "Uploading confidential material to unapproved AI services", "Using company systems for harassment, fraud or unlawful activity"] },
    { type: "text", text: "Limited personal use may be permitted when it does not affect productivity, security, cost or operations." },
  ]},
  { n: "14", title: "Social media and public communication", blocks: [
    { type: "text", text: "Only authorised representatives may issue official statements or publish through Kahel Studio's official accounts. Employees must not:" },
    { type: "list", items: ["Present personal opinions as official company statements", "Publish confidential or unreleased material", "Post client images without required approval", "Disclose internal disputes or private employee information", "Use Kahel Studio branding for unauthorised activities", "Respond publicly to complaints unless assigned to do so"] },
    { type: "text", text: "You may identify your workplace truthfully but should make clear when personal opinions are your own." },
  ]},
  { n: "15", title: "Outside work and conflicts of interest", blocks: [
    { type: "text", text: "Disclose outside work, relationships or financial interests that may conflict with your duties. Examples include:" },
    { type: "list", items: ["Privately accepting a Kahel Studio client's project", "Redirecting studio inquiries to a personal business", "Using studio equipment for unauthorised commercial work", "Accepting supplier benefits that could influence a decision", "Approving transactions involving a close relative or personal business", "Using confidential pricing or client information for personal gain"] },
    { type: "text", text: "A disclosed conflict is not automatically prohibited — management assesses whether it can be appropriately managed." },
  ]},
  { n: "16", title: "Workplace safety", blocks: [
    { type: "text", text: "Everyone is responsible for a safe studio and production environment. Employees must:" },
    { type: "list", items: ["Follow safety instructions and location rules", "Keep exits, walkways and working areas clear", "Secure stands, lights, cables and suspended equipment", "Use sandbags and other safety equipment when required", "Handle electrical equipment properly", "Stop work when an immediate serious danger is identified", "Report injuries, near misses and unsafe conditions", "Avoid working while impaired"] },
    { type: "text", text: "Photography equipment, lights, stands and electrical systems are operated only by trained or authorised personnel. Safety procedures follow applicable occupational safety and health requirements." },
  ]},
  { n: "17", title: "Substance-free workplace", blocks: [
    { type: "text", text: "Employees must not work while impaired by alcohol or illegal drugs; possess, distribute or sell illegal drugs at work; consume alcohol during working time unless authorised for a legitimate business event; or operate vehicles or equipment while impaired." },
    { type: "text", text: "If medication may affect safe performance, privately notify an authorised supervisor when an accommodation or task adjustment may be needed. Unnecessary medical details will not be requested." },
  ]},
  { n: "18", title: "Company funds and financial integrity", blocks: [
    { type: "text", text: "Only authorised personnel may collect payments, issue refunds, approve expenses or access financial systems. All transactions must be recorded promptly, use the approved channel, have supporting evidence, be matched to the correct client/booking/project, and follow the required approval process." },
    { type: "text", text: "Employees must not:" },
    { type: "list", items: ["Borrow company or client funds", "Change financial records to conceal a shortage or error", "Process unauthorised refunds or discounts", "Ask clients to pay a personal account", "Create false receipts, expenses or supplier records", "Split purchases to avoid approval limits"] },
    { type: "text", text: "Report errors immediately — good-faith reporting is encouraged and distinguished from deliberate misconduct." },
  ]},
  { n: "19", title: "Corrective action and due process", blocks: [
    { type: "text", text: "Kahel Studio corrects problems fairly and consistently. Depending on circumstances, corrective action may include coaching or documented guidance, written notice, a Notice to Explain, an administrative meeting or investigation, a written decision, and an improvement plan, warning or another proportionate action." },
    { type: "text", text: "You will be informed of the concern and given a reasonable opportunity to respond before a disciplinary decision, except for immediate protective measures during an investigation. Seriousness, frequency, intent, impact and prior record may be considered. Serious matters may include theft or fraud, violence or credible threats, serious harassment, deliberate disclosure of confidential information, falsification of records, serious safety violations, unauthorised removal of assets, deliberate destruction of files, gross insubordination, or repeated misconduct." },
    { type: "text", text: "No disciplinary action is imposed merely because an employee made a good-faith complaint, reported a safety concern or exercised a lawful right." },
  ]},
  { n: "20", title: "Complaints, grievances and non-retaliation", blocks: [
    { type: "text", text: "Raise workplace concerns early. A grievance should contain a clear description, relevant dates and people, supporting records if available, previous steps taken, and the resolution requested. Complaints may be submitted privately through the Staff Hub or directly to an authorised manager." },
    { type: "text", text: "Retaliation against a person who raises a concern, participates in an investigation or refuses unlawful instructions is prohibited. Deliberately false or malicious allegations may be addressed separately." },
  ]},
  { n: "21", title: "Resignation, clearance and offboarding", blocks: [
    { type: "text", text: "Employees who resign should provide the notice required by their contract and applicable law. Before separation, the employee must:" },
    { type: "list", items: ["Complete project and client handovers", "Return company equipment, keys and documents", "Transfer business files to authorised storage", "Settle properly documented accountabilities", "Remove personal data from company devices with approval", "Stop using company accounts and systems", "Complete the clearance process"] },
    { type: "text", text: "Access is disabled based on the last working day or earlier when necessary to protect clients, employees or systems. Final pay, certificates and separation records are processed per applicable requirements. Disputed charges are not silently deducted." },
  ]},
  { n: "22", title: "Policy administration", blocks: [
    { type: "text", text: "These policies are published in the Staff Hub, assigned an owner and approver, given a version number and effective date, reviewed at least annually, updated when laws or operations change, preserved in version history, and communicated to affected personnel." },
    { type: "text", text: "When this handbook conflicts with applicable law, the law applies. When an employment agreement grants a more favourable valid benefit, the agreement generally governs that benefit." },
  ]},
  { n: "23", title: "Remote and hybrid work", blocks: [
    { type: "text", text: "Some roles may be performed remotely or on a hybrid basis with prior approval. Remote arrangements are a privilege tied to role, performance and business need, and may be adjusted or withdrawn with reasonable notice." },
    { type: "text", text: "When working remotely, team members must:" },
    { type: "list", items: ["Be reachable and responsive during agreed working hours", "Maintain a secure, private workspace for confidential work", "Use approved, protected networks and devices — never public Wi-Fi for sensitive files", "Keep the same attendance, availability and deliverable standards as on-site", "Safeguard equipment taken off-site and report loss or damage promptly"] },
    { type: "text", text: "Client shoots, equipment handling and production work generally require on-site or on-location presence." },
  ]},
  { n: "24", title: "Training and professional development", blocks: [
    { type: "text", text: "Kahel Studio invests in the growth of its team. Employees are expected to complete assigned onboarding, safety and compliance training within the given timeframe and to keep required certifications current." },
    { type: "list", items: ["Attend scheduled training, briefings and skills sessions", "Apply learned workflows, standards and safety practices", "Share knowledge and mentor newer team members when asked", "Request development opportunities through a supervisor or the Staff Hub"] },
    { type: "text", text: "Approved training time and reasonable materials may be supported at management's discretion. Certifications funded by the studio may be subject to a documented service or reimbursement agreement." },
  ]},
  { n: "25", title: "Anti-bribery, gifts and entertainment", blocks: [
    { type: "text", text: "Team members must not offer, solicit or accept bribes, kickbacks or improper payments in connection with studio work. Business must be won and delivered on merit." },
    { type: "text", text: "Regarding gifts and hospitality:" },
    { type: "list", items: ["Modest, occasional gifts of nominal value from clients or suppliers may be acceptable", "Cash or cash-equivalent gifts must never be accepted", "Anything that could influence — or appear to influence — a decision must be declined or disclosed", "Gifts to government officials require prior approval and must follow applicable law", "Disclose offers you are unsure about to the Admin or Super Admin"] },
    { type: "text", text: "When in doubt, decline politely and report it." },
  ]},
  { n: "26", title: "Emergency response and business continuity", blocks: [
    { type: "text", text: "The safety of people always comes before equipment, files or schedules. In an emergency, stop work, move to safety and follow the instructions of authorised personnel or venue staff." },
    { type: "list", items: ["Know the exits and assembly points at the studio and at each shoot location", "Report fire, injury, threat or hazard immediately to a supervisor and emergency services when needed", "Do not re-enter an unsafe area to retrieve equipment", "Follow backup and file-recovery procedures so client work can be restored", "Cooperate with headcounts and incident reporting after an event"] },
    { type: "text", text: "Critical bookings affected by an emergency will be rescheduled or reassigned through an authorised channel and communicated to clients promptly." },
  ]},
  { n: "27", title: "Whistleblower protection", blocks: [
    { type: "text", text: "Team members are encouraged to report suspected illegal conduct, fraud, safety violations, harassment or serious policy breaches in good faith." },
    { type: "list", items: ["Reports may be made privately to the Admin, Super Admin or another designated person", "Reports are handled discreetly and shared only with those who need to know", "A good-faith reporter is protected from retaliation, demotion or dismissal for reporting", "Investigations are conducted fairly and documented", "Knowingly false or malicious reports may be addressed separately"] },
    { type: "text", text: "Raising a concern responsibly is treated as protecting the studio, its clients and its people." },
  ]},
  { n: "28", title: "Sustainability and community responsibility", blocks: [
    { type: "text", text: "Kahel Studio aims to operate responsibly toward its community and environment. Team members are encouraged to:" },
    { type: "list", items: ["Reduce waste — reuse packaging, minimise printing and manage storage efficiently", "Power down lights, equipment and workstations when not in use", "Handle batteries, electronics and consumables per proper disposal guidance", "Treat shoot locations, venues and neighbours with respect and leave spaces as found", "Represent the studio positively in the community"] },
    { type: "text", text: "Suggestions that improve sustainability or community impact are welcome through the Staff Hub." },
  ]},
];

export const IT_POLICY_SECTIONS: PolicySection[] = [
  { n: "01", title: "Accounts and access", blocks: [
    { type: "text", text: "This policy governs the responsible use of Kahel Studio's IT systems — devices, networks, accounts, software, storage and studio hardware. It works alongside the Data privacy, Acceptable use and Confidentiality policies." },
    { type: "list", items: ["Use only accounts assigned to you; never share logins or credentials", "Enable multi-factor authentication on every account that supports it", "Use strong, unique passwords stored in an approved password manager", "Access is granted by role and least privilege — request changes through IT/Admin", "Report lost devices, suspected compromise or phishing immediately"] },
  ]},
  { n: "02", title: "Devices and endpoints", blocks: [
    { type: "list", items: ["Keep operating systems, apps and security tools updated", "Encrypt laptops and mobile devices used for studio work where available", "Lock screens when away and never leave devices unattended in public", "Personal devices used for work must meet minimum security requirements and may be de-provisioned on separation", "Do not disable antivirus, firewalls or device-management tools"] },
  ]},
  { n: "03", title: "Software and data", blocks: [
    { type: "list", items: ["Install only licensed, approved software — no pirated or unauthorised tools", "Store client and business files only in approved, backed-up locations", "Do not upload confidential material to unapproved cloud or AI services", "Follow the 3-2-1 backup practice for critical project files", "Delete or return data per retention rules when a project or engagement ends"] },
  ]},
  { n: "04", title: "Network and studio systems", blocks: [
    { type: "list", items: ["Use secured networks; avoid public Wi-Fi for sensitive work", "Do not connect unknown drives or hardware without approval", "Studio NAS, capture stations and licence servers are for authorised work only", "Changes to shared systems, cabling or configurations require IT/Admin approval"] },
  ]},
  { n: "05", title: "Support and incidents", blocks: [
    { type: "text", text: "Log IT requests and incidents through the Staff Hub or the designated IT contact. Suspected security incidents must be reported within the same working day. IT may access, monitor or recover company systems for legitimate, declared purposes following transparency and proportionality; personal privacy is respected within legal limits." },
  ]},
];

export const HEALTH_AND_SAFETY_POLICY_SECTIONS: PolicySection[] = [
  { n: "01", title: "Purpose", blocks: [
    { type: "text", text: "Kahel Studio is committed to maintaining a clean, safe and healthy environment for staff, clients and visitors. All team members are responsible for following these requirements and reporting safety concerns immediately." },
  ] },
  { n: "02", title: "General studio cleanliness", blocks: [
    { type: "text", text: "Staff must:" },
    { type: "list", items: ["Disinfect frequently touched surfaces, props and equipment before and after each session.", "Clean and sanitize studio floors daily and immediately address spills.", "Keep restrooms clean, properly supplied and regularly checked.", "Keep entrances, exits, walkways and shooting areas free from obstruction.", "Return equipment, furniture and props to their assigned locations after use.", "Dispose of waste properly and remove it at the end of each working day.", "Report pest activity, water leaks, mould, unusual odours or other sanitation concerns."] },
    { type: "text", text: "Cleaning tasks must be recorded in the assigned checklist or Staff Hub task." },
  ] },
  { n: "03", title: "Hand hygiene", blocks: [
    { type: "list", items: ["Wash or sanitize hands before and after every client session.", "Hand sanitizer must remain available at entrances, dressing areas and shooting zones.", "Wash hands before handling food, infant props or items used close to a client's face.", "Avoid touching a client unnecessarily.", "Cover coughs and sneezes and sanitize hands immediately afterward.", "Report empty or damaged hygiene dispensers for replacement."] },
  ] },
  { n: "04", title: "Masks and personal protective equipment", blocks: [
    { type: "text", text: "Staff must wear appropriate protective equipment when required by:" },
    { type: "list", items: ["The nature of the task", "A client's reasonable health request", "Management instructions", "Exposure to cleaning products, dust or other workplace hazards", "Sessions involving infants or immunocompromised individuals"] },
    { type: "text", text: "Disposable masks must be available in the studio. Gloves may be used for cleaning, handling waste or when additional hygiene precautions are required. Gloves do not replace proper handwashing or sanitizing." },
  ] },
  { n: "05", title: "Illness and fitness for work", blocks: [
    { type: "text", text: "Staff must not report for work when they have a contagious illness or symptoms that may place clients or colleagues at risk." },
    { type: "text", text: "Employees should promptly inform their supervisor when they:" },
    { type: "list", items: ["Have a fever or symptoms of a contagious illness", "Have been advised to isolate", "Are unable to perform their duties safely", "Are taking medication that may affect safe equipment operation", "Require temporary adjustments or health accommodations"] },
    { type: "text", text: "Medical information must be handled confidentially. Staff should only provide information reasonably necessary for workplace safety and attendance management." },
  ] },
  { n: "06", title: "Client and guest management", blocks: [
    { type: "list", items: ["Studio sessions are generally best suited for groups of up to eight people.", "Only clients being photographed and essential companions should remain inside the shooting area.", "Additional visitors may be asked to wait outside or in a designated waiting area.", "Walkways, fire exits and equipment zones must not become overcrowded.", "Children must remain under the supervision of a parent, guardian or designated adult.", "Staff must professionally communicate occupancy or safety restrictions to clients."] },
  ] },
  { n: "07", title: "Infant and baby sessions", blocks: [
    { type: "text", text: "Additional precautions apply during infant and baby sessions:" },
    { type: "list", items: ["Sanitize blankets, wraps, posing materials and props before use.", "Store clean and used items separately.", "Maintain a clean and comfortably warm environment.", "Sanitize hands immediately before handling the baby or baby-related items.", "Wear a mask when requested or when additional precautions are appropriate.", "Use gloves only when suitable for the task and safe for the baby.", "Ensure a parent or guardian remains present.", "Never leave a baby unattended or in an unsecured position.", "Stop the session if the baby shows signs of distress or discomfort."] },
    { type: "text", text: "Only trained or authorised team members may position or directly handle infants." },
  ] },
  { n: "08", title: "Equipment and electrical safety", blocks: [
    { type: "text", text: "Staff must:" },
    { type: "list", items: ["Inspect cameras, lights, stands, cables and electrical equipment before use.", "Secure light stands and backdrops with appropriate weights or sandbags.", "Keep cables secured and away from walkways whenever possible.", "Never overload sockets or use visibly damaged cables.", "Turn off and unplug equipment before cleaning or maintenance.", "Keep liquids away from cameras, computers, printers and electrical connections.", "Immediately label and remove unsafe equipment from service.", "Report damage or malfunction through Maintenance & repair.", "Never attempt unauthorised electrical or equipment repairs."] },
  ] },
  { n: "09", title: "Fire and emergency safety", blocks: [
    { type: "text", text: "All staff must know:" },
    { type: "list", items: ["The location of emergency exits", "The location and proper use of fire extinguishers", "The studio's evacuation route and assembly point", "Who to contact during an emergency", "Where the first-aid kit is stored"] },
    { type: "text", text: "Emergency exits and firefighting equipment must remain unobstructed. Staff must immediately report smoke, burning smells, exposed wiring or other fire hazards." },
    { type: "text", text: "During an emergency, protecting people takes priority over protecting equipment or files." },
  ] },
  { n: "10", title: "Accidents, hazards and near misses", blocks: [
    { type: "text", text: "All injuries, accidents, equipment-related incidents and near misses must be reported immediately, even when no medical treatment is initially required." },
    { type: "text", text: "The report should include:" },
    { type: "list", items: ["Date, time and location", "People involved", "Description of what happened", "Immediate action taken", "Witnesses, when applicable", "Photos or supporting evidence", "Recommended preventive action"] },
    { type: "text", text: "Incident records must be factual and must not be altered or deleted to conceal an error." },
  ] },
  { n: "11", title: "Cleaning chemicals and supplies", blocks: [
    { type: "list", items: ["Keep cleaning chemicals in their original labelled containers.", "Never mix cleaning products unless the manufacturer confirms it is safe.", "Store chemicals away from food, clients and children.", "Use gloves, masks or ventilation when required.", "Follow the product instructions and safety warnings.", "Immediately clean or isolate spills.", "Report accidental exposure and seek appropriate assistance."] },
  ] },
  { n: "12", title: "Staff responsibilities", blocks: [
    { type: "text", text: "Every staff member must:" },
    { type: "list", items: ["Complete required health and safety training.", "Follow studio safety procedures and checklists.", "Use equipment only when trained or authorised.", "Report unsafe conditions promptly.", "Cooperate with emergency procedures and investigations.", "Never remove safety equipment or bypass safety controls.", "Stop work and seek guidance when a task presents an immediate serious danger.", "Respect health accommodations and client safety requests."] },
    { type: "text", text: "Supervisors must respond promptly to reported hazards and must not require staff to continue work under unsafe conditions." },
  ] },
  { n: "13", title: "Communication and client requests", blocks: [
    { type: "text", text: "Staff should respond professionally when clients raise health or safety concerns." },
    { type: "heading", text: "Suggested response" },
    { type: "text", text: "Thank you for letting us know. We'll review your request and adjust the studio setup where reasonably possible." },
    { type: "text", text: "Any special precaution should be recorded in the booking notes and communicated only to staff who need the information. Do not place unnecessary medical details in general notes or public team channels." },
  ] },
  { n: "14", title: "Non-compliance", blocks: [
    { type: "text", text: "Failure to follow health and safety requirements may result in coaching, retraining or corrective action. Deliberate or repeated violations, especially those placing a client, child or colleague at risk, may be treated as serious misconduct." },
    { type: "text", text: "Good-faith safety reports are protected. Staff must not be penalised for reporting a genuine hazard or stopping work because of an immediate serious safety concern." },
  ] },
];

export const HEALTH_AND_SAFETY_ACK_STATEMENT =
  "I confirm that I have read and understood the Kahel Studio Staff Health & Safety Policy. I agree to follow its requirements, complete assigned safety tasks and promptly report hazards, injuries, illnesses and unsafe conditions.";

export const PAYROLL_REPORTS = [
  { group: "Payroll", items: ["Payroll register", "Gross-to-net summary", "Earnings summary", "Deduction summary", "Payroll variance"] },
  { group: "Statutory", items: ["Contribution summary", "13th-month pay", "Year-to-date payroll", "Withholding tax"] },
  { group: "Operations", items: ["Payment status", "Attendance-to-payroll", "Overtime", "Leave deductions", "Salary changes"] },
  { group: "People & cost", items: ["Payroll cost by team", "Freelancer payments", "Final pay", "Payroll adjustments", "Payroll audit report"] },
];

export const PAYROLL_SETTINGS_GROUPS = [
  { title: "Schedule & cutoffs", items: [{ l: "Payroll schedule", v: "Semi-monthly" }, { l: "First cutoff / payout", v: "1–15 · paid 15th" }, { l: "Second cutoff / payout", v: "16–EOM · paid last day" }, { l: "Standard work", v: "5 days/week · 8 hrs" }] },
  { title: "Calculation rules", items: [{ l: "Proration", v: "Calendar days" }, { l: "Rounding", v: "2 decimal places" }, { l: "Overtime", v: "Requires prior approval" }, { l: "Late & undertime", v: "Per-minute deduction" }] },
  { title: "Tables & versions", items: [{ l: "SSS table", v: "2025 · v2 (verify)" }, { l: "PhilHealth", v: "2025 · 5.0% (verify)" }, { l: "Pag-IBIG", v: "2% capped (verify)" }, { l: "Withholding tax", v: "TRAIN 2023 (verify)" }] },
  { title: "Controls", items: [{ l: "Approval chain", v: "Admin → Super admin" }, { l: "Separation of duties", v: "On" }, { l: "Payroll lock date", v: "On approval" }, { l: "Sensitive exports", v: "Super admin only" }] },
];

const STATE_TONE: Record<string, { bg: string; c: string }> = {
  blue: { bg: "var(--color-info-bg)", c: "var(--color-info-text)" },
  red: { bg: "var(--color-danger-bg)", c: "var(--color-danger-text)" },
  amber: { bg: "var(--color-warning-bg)", c: "var(--color-warning-text)" },
  grey: { bg: "var(--color-surface-muted)", c: "var(--color-text-secondary)" },
};

export const PAYROLL_STATES = [
  { tone: "blue", title: "Calculating…", what: "Computing pay for 5 employees. This usually takes under a minute.", action: "Calculation runs automatically" },
  { tone: "red", title: "Calculation failed", what: "A salary rate is missing for Ivy Santos, so the run could not finish. Nothing was saved.", action: "Fix salary & recalculate" },
  { tone: "amber", title: "Needs review", what: "3 results differ notably from the previous cutoff. Confirm the figures before approval.", action: "Open payroll register" },
  { tone: "blue", title: "Processing payment", what: "Transfers for 5 employees are being submitted to the payout provider.", action: "View payment status" },
  { tone: "amber", title: "Partial payment", what: "4 of 5 paid. Ivy Santos is on hold pending a valid payment method.", action: "Resolve held payment" },
  { tone: "red", title: "Payment failed", what: "A GCash transfer was returned — the number could not be verified.", action: "Retry payment" },
  { tone: "red", title: "Contribution overdue", what: "The June SSS remittance is past its due date. File soon to avoid penalties.", action: "Record remittance" },
  { tone: "grey", title: "Payroll locked", what: "PAY-2026-06-B is completed and immutable. Corrections require a reversal.", action: "Create a correction" },
  { tone: "grey", title: "Permission denied", what: "Your role can view attendance but not salaries, deductions or net pay.", action: "Request payroll access" },
  { tone: "amber", title: "Editing conflict", what: "Marisol Reyes changed this run while you were working. Reload to get the latest.", action: "Reload pay run" },
  { tone: "grey", title: "Connection lost", what: "You are offline. Changes are saved locally and will sync when you reconnect.", action: "Retry now" },
  { tone: "red", title: "Export failed", what: "The gross-to-net export could not be generated. No sensitive data left the system.", action: "Try export again" },
].map((s) => ({
  ...s,
  bg: STATE_TONE[s.tone].bg,
  c: STATE_TONE[s.tone].c,
  sev: { red: "Blocking", amber: "Attention", blue: "In progress", grey: "Info" }[s.tone],
}));

export const PAYROLL_STATUS_CHIPS = [
  { label: "Draft", bg: "var(--color-surface-muted)", c: "var(--color-text-secondary)" },
  { label: "Attendance review", bg: "var(--color-warning-bg)", c: "var(--color-warning-text)" },
  { label: "Ready to calculate", bg: "var(--color-info-bg)", c: "var(--color-info-text)" },
  { label: "Needs review", bg: "var(--color-warning-bg)", c: "var(--color-warning-text)" },
  { label: "Awaiting approval", bg: "var(--color-warning-bg)", c: "var(--color-warning-text)" },
  { label: "Approved", bg: "var(--color-success-bg)", c: "var(--color-success-text)" },
  { label: "Scheduled", bg: "var(--color-info-bg)", c: "var(--color-info-text)" },
  { label: "Partially paid", bg: "var(--color-warning-bg)", c: "var(--color-warning-text)" },
  { label: "Paid", bg: "var(--color-success-bg)", c: "var(--color-success-text)" },
  { label: "Rejected", bg: "var(--color-danger-bg)", c: "var(--color-danger-text)" },
  { label: "Cancelled", bg: "var(--color-surface-muted)", c: "var(--color-text-muted)" },
];

// Documentation & Help — reached from the launcher footer, not sidebar apps
export type DocIconKey = "dashboard" | "camera" | "users" | "cart" | "peso" | "userplus" | "folder" | "shield";

type DocBlock =
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string }
  | { kind: "steps"; steps: string[] }
  | { kind: "note"; label: string; text: string };

export interface DocSection {
  key: string;
  title: string;
  accent: AccentId;
  icon: DocIconKey;
  kicker: string;
  desc: string;
  blocks: DocBlock[];
}

const H = (text: string): DocBlock => ({ kind: "heading", text });
const T = (text: string): DocBlock => ({ kind: "text", text });
const STP = (steps: string[]): DocBlock => ({ kind: "steps", steps });
const NT = (label: string, text: string): DocBlock => ({ kind: "note", label, text });

export const DOCS_SECTIONS: DocSection[] = [
  {
    key: "start",
    title: "Getting started",
    accent: "orange",
    icon: "dashboard",
    kicker: "Basics",
    desc: "The launcher is home. Every app is a tile, and every tile opens into a focused workspace that shares one database with the rest.",
    blocks: [
      T("Kahel Studio OS replaces the scatter of DMs, spreadsheets, and manual invoicing with one system. Because every app reads and writes the same database, a booking made in Booking shows up in CRM, Dashboard, and Finance without any copying between them."),
      H("Moving around"),
      STP([
        "Click any tile on the launcher to open that app.",
        "Use the app switcher in the top-left of any workspace — or the “All apps” link — to jump back home.",
        "Press ⌘K anywhere to search apps, accounts, and bookings, or to jump to a recent item.",
        "Use Create (top bar) to start a new booking, account, or sale from wherever you are.",
      ]),
      H("Phases"),
      T("Phase 1 is owner-only and covers Booking, CRM, POS, Dashboard, and Feedback. Later phases add Finance, Quotation, Projects, Tasks, Maintenance & repair, Compliance, Website, Inventory, Marketing, and the people apps — all already visible in the launcher."),
      NT("Note", "Nothing is ever deleted in this system. Records are voided, corrected, or superseded so the history always ties out."),
    ],
  },
  {
    key: "booking",
    title: "Booking",
    accent: "orange",
    icon: "camera",
    kicker: "Core app",
    desc: "Status is the spine of Booking. A job moves inquiry → quoted → confirmed → in progress → completed, and that status shows up as a badge in lists, a stepper on the detail page, and a filter everywhere.",
    blocks: [
      H("Confirming a quote"),
      T("The quoted → confirmed transition is the moment the business runs on. Confirming sends the deposit invoice and locks the date."),
      STP([
        "Open the booking and review the session details and total.",
        "Click Confirm booking in the payment panel.",
        "The deposit invoice is sent and the audit history records the change.",
      ]),
      H("Deposits"),
      T("A deposit is either 50% or the full amount, chosen at checkout. The 50% figure is computed on the server as half the total rounded up — it is never taken from the checkout screen."),
      NT("Balances are derived", "A booking's balance comes from its recorded payments. To change it, add or void a payment rather than editing the number."),
    ],
  },
  {
    key: "crm",
    title: "CRM",
    accent: "ink",
    icon: "users",
    kicker: "Core app",
    desc: "The follow-up queue is the home of CRM — not the accounts list. Inquiries die from no follow-up, silently, and the queue is built to stop that.",
    blocks: [
      H("The three groups"),
      T("The queue splits into overdue, due today, and no next action set. The last group is the one that matters most: an account with no scheduled follow-up is one you are about to forget."),
      STP([
        "Work the “No next action set” group first — set a next action on each.",
        "Clear “Due today” as you complete calls and messages.",
        "Keep “Overdue” empty; when it is, the queue tells you so.",
      ]),
      H("Accounts"),
      T("Accounts are either corporate or consumer. They share a layout but lead differently — corporate leads with contacts and terms, consumer with the household and its history."),
    ],
  },
  {
    key: "pos",
    title: "POS & invoicing",
    accent: "orange",
    icon: "cart",
    kicker: "Core app",
    desc: "POS is built for iPad in landscape. It sells physical products — prints, frames, albums, USBs — and captures a BIR serial on every sale.",
    blocks: [
      H("Taking a sale"),
      STP([
        "Tap products to add them to the cart on the right.",
        "Adjust quantities with the + / − controls.",
        "Tap the large orange Charge button and take payment by cash or PayMongo.",
      ]),
      H("Invoice capture"),
      T("After payment, capture the printed BIR serial: it pre-fills from the active booklet, you photograph the invoice, and confirm. This step is a legal requirement — keep it to a few taps so it never gets skipped."),
      NT("Receipts are email-only", "There is no thermal printer. A copy is emailed to the client on every completed sale."),
    ],
  },
  {
    key: "finance",
    title: "Finance & BIR",
    accent: "teal",
    icon: "peso",
    kicker: "Back office",
    desc: "Finance records serials from your printed BIR Sales Invoice booklets and stores the scans. It is a management system, not your books of accounts.",
    blocks: [
      H("What it does — and doesn't"),
      T("The system records which serial was used, for what, and keeps a scan of the invoice. It never generates a BIR invoice; the printed booklet is always the source of truth."),
      H("Reconciliation"),
      T("Daily reconciliation surfaces three mismatches: orders without a serial, serials without an order, and serials without a scan. When everything ties out, the screen tells you so."),
      NT("All money is centavos", "Every amount is stored as an integer number of centavos. No floating-point money, anywhere."),
    ],
  },
  {
    key: "team",
    title: "Team & freelancers",
    accent: "indigo",
    icon: "userplus",
    kicker: "People",
    desc: "Second shooters and editors are freelancer staff records. Onboarding tracks the paperwork each hire needs before their first payout.",
    blocks: [
      H("Onboarding checklists"),
      T("Each hire gets a checklist — contract, copyright assignment, payout details, equipment orientation, style guide, first engagement. Progress is tracked to the last signature."),
      H("Copyright assignment"),
      T("A written copyright assignment is required from every freelancer. Until it is signed, that person's engagement payout is held."),
      NT("Access", "Staff portal management is protected by the workspace access configuration. Client portals use separate, expiring share links."),
    ],
  },
  {
    key: "workflow",
    title: "Projects & Tasks",
    accent: "indigo",
    icon: "folder",
    kicker: "Operations",
    desc: "Projects and Tasks are separate modules. A project is the client work created from a confirmed booking; a task is internal work assigned to staff.",
    blocks: [
      H("Projects come from bookings"),
      T("Confirming a booking automatically creates one linked project — reconfirming never makes a duplicate. Cancelling or rescheduling flags the project rather than deleting it, so production history is never lost."),
      H("Tasks are internal work"),
      T("Tasks can stand alone (studio cleaning, charging batteries, backups, inventory checks) or link to a project (culling, editing, equipment prep). They carry an assignee, priority, due date, recurrence, checklist, category, status, attachments, and completion evidence."),
      NT("Recurring maintenance raises tasks", "Items in Maintenance & repair that approach their due date automatically raise a linked staff task — you will see a “From maintenance” chip on the task and a “Staff task raised” chip on the maintenance record."),
      H("Working with the board"),
      T("The Board, List, and Calendar views show the same work in different formats. Use Board to manage status, List to scan assignments and due dates, and Calendar to plan the week."),
    ],
  },
  {
    key: "client-portal",
    title: "Client portal",
    accent: "orange",
    icon: "camera",
    kicker: "Delivery",
    desc: "Client portals provide a private gallery for selecting album favorites, reviewing invoices, and leaving feedback.",
    blocks: [
      H("Preparing access"),
      STP([
        "Open Projects → Client portals.",
        "Confirm the client email, publish status, and gallery readiness.",
        "Create a secure share link and send it through your approved delivery channel.",
      ]),
      H("Secure links"),
      T("Each newly created link replaces the previous link and expires after 30 days. Client activity, selects, feedback, and downloads are recorded against the linked project."),
      NT("Local development", "Authentication may be temporarily bypassed only when KAHEL_AUTH_DISABLED=true is set in .env.local. Remove the flag before deployment."),
    ],
  },
  {
    key: "reports",
    title: "Reports",
    accent: "teal",
    icon: "folder",
    kicker: "Insights",
    desc: "Reports centralizes operational, financial, booking, and project summaries for export and review.",
    blocks: [
      H("Using reports"),
      STP([
        "Choose a reporting period and report type.",
        "Open an available report or download it directly from the list.",
        "Use Create report to begin a tailored report request.",
      ]),
      H("Data scope"),
      T("Report cards and exports use the data available to the current workspace. Confirm report totals against source records before using them for statutory filings or external statements."),
    ],
  },
  {
    key: "catalog",
    title: "POS catalog",
    accent: "orange",
    icon: "cart",
    kicker: "Core app",
    desc: "Beyond retail products, POS holds the studio's service and rental catalog: Studio Sessions, Event Coverage, Rentals, Retail, and Add-ons.",
    blocks: [
      H("Categories"),
      STP([
        "Studio Sessions — in-studio shoots by the hour or package.",
        "Event Coverage — on-location wedding, corporate and event packages.",
        "Rentals — gear rented per day with live availability.",
        "Retail — physical products sold at the counter.",
        "Add-ons — extras attached to a session or booking.",
      ]),
      H("Editing catalog rows"),
      T("Use the three-dot action at the end of a row to edit its code, name, details, price, and availability. New item adds a draft row to the active category."),
      NT("Non-VAT", "Kahel Studio is registered Non-VAT, so sales totals carry no 12% VAT line."),
    ],
  },
  {
    key: "compliance",
    title: "Compliance",
    accent: "indigo",
    icon: "shield",
    kicker: "Back office",
    desc: "Compliance tracks permits, renewals, statutory filings and business requirements for the studio's Philippine operations. It is an administrative tracker, not legal advice.",
    blocks: [
      H("What it tracks"),
      T("Government registrations, local permits, BIR filings, statutory remittances (SSS, PhilHealth, Pag-IBIG) and labor/privacy obligations — each with agency, masked reg number, coverage, dates, assigned person, estimated and actual fees, and status."),
      H("Urgency & reminders"),
      T("The register sorts by urgency — expired first, then action required, then due within 30 / 60 / 90 days, then submitted/under review, compliant, and not applicable. Reminders auto-send to the Super Admin and assignee at 90, 60, 30, 14 and 7 days before each deadline, and a linked staff task is created when action is required."),
      NT("Not a legal statement", "Marking an item complete does not by itself mean the studio is legally compliant. Fees are a planning estimate — confirm with the issuing agency. The BIR ₱500 annual registration fee is excluded (collection ceased 22 Jan 2024)."),
    ],
  },
  {
    key: "shiftboard",
    title: "Shift Board",
    accent: "teal",
    icon: "userplus",
    kicker: "Core app",
    desc: "The shift board shows who is working when. Regular hours are 8:00AM – 5:00PM, Monday to Sunday, and event hours are flexible until 12:00AM.",
    blocks: [
      H("Schedule"),
      T("Kahel Studio is open every day. Regular shifts run 8:00AM – 5:00PM. Event coverage (weddings, location shoots) is flexible and often extends past midnight — those shifts show the actual hours on the board."),
      H("Drag & drop"),
      T("Every shift card is draggable. Pick it up and drop it on another day to reassign. Changes save automatically to your browser so they persist between visits."),
      H("Staff"),
      T("The board lists active Kahel Studio OS accounts. Job titles and initials come from linked active payroll employee records when available."),
      H("Legend"),
      T("Each shift type has its own colour: Studio Shoot (red), Event (purple), Editing / Post (amber), Admin / Office (green), Production Support (teal), Remote Work (blue), and Day Off (grey). The colour also maps to the Production View toggle for quick visual scanning."),
      NT("Days off", "Scheduled days off appear as grey cards. The studio is closed on no day — Sunday rest is rotated."),
    ],
  },
];

export const HELP_FAQS = [
  { q: "Why can't I edit a paid balance?", a: "Balances are derived from recorded payments — void or add a payment rather than editing the number." },
  { q: "The system won't print a BIR invoice. Is that a bug?", a: "No. Kahel Studio OS records serials from your printed BIR booklets and stores scans; it never generates an invoice." },
  { q: "How is a deposit calculated?", a: "Server-side as half the total, rounded up. It's never accepted from the checkout screen." },
  { q: "How do I share a client portal?", a: "Open Projects → Client portals, publish the portal, create a secure link, then copy it into your approved delivery email. Creating a new link revokes the previous link." },
  { q: "Why does my client portal link not open?", a: "Links expire after 30 days and stop working when the portal is unpublished. Generate a new secure link from Projects → Client portals." },
  { q: "What's the difference between a Project and a Task?", a: "A project is client work auto-created when a booking is confirmed; a task is internal staff work that can stand alone or link to a project. Confirming a booking never creates a duplicate project." },
  { q: "Why is there no VAT on the sale total?", a: "Kahel Studio is registered Non-VAT, so the cart carries no 12% VAT line." },
  { q: "Does marking a Compliance item complete mean we're legally compliant?", a: "No. Compliance is an administrative tracker only. Fees shown are a planning estimate — confirm the exact amount with the issuing agency." },
  { q: "Where do recurring maintenance tasks come from?", a: "Maintenance & repair raises a linked staff task automatically as each item nears its due date; completing it updates the service history and sets the next due date." },
  { q: "How do I update a POS catalog item?", a: "Open the relevant POS category, select the three-dot action on the row, make your edits, and save. New item creates an editable draft row." },
];
