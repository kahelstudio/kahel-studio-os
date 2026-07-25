// Sample data ported verbatim from the Kahel Studio OS design prototype
// (Kahel Studio OS.dc.html) so every screen reads from one consistent set
// of clients, bookings, and figures. Swap for Supabase queries later —
// keep the shapes stable so that swap stays mechanical.

export type BookingStatusId =
  | "inquiry"
  | "quoted"
  | "confirmed"
  | "progress"
  | "completed"
  | "cancelled";

export const BOOKING_STATUS: Record<BookingStatusId, { label: string; bg: string; text: string }> = {
  inquiry: { label: "Inquiry", bg: "#F1EFEC", text: "#6E6963" },
  quoted: { label: "Quoted", bg: "#E3EDFF", text: "#053799" },
  confirmed: { label: "Confirmed", bg: "#E0F7EC", text: "#005430" },
  progress: { label: "In progress", bg: "#FFE3D4", text: "#B33800" },
  completed: { label: "Completed", bg: "#E0F7F8", text: "#00575C" },
  cancelled: { label: "Cancelled", bg: "#FDE4EA", text: "#8A0625" },
};

export type AccountType = "Corporate" | "Consumer";

export interface Contact {
  ini: string;
  name: string;
  tag: string;
  email: string;
}

export interface AccountPayment {
  label: string;
  date: string;
  method: string;
  amount: string;
}

export interface AccountBookingRef {
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

// ── CRM follow-up queue ─────────────────────────────────────────────
export const CRM_NO_ACTION = [
  { ini: "GL", name: "Globe Telecom", meta: "Product shoot inquiry · KS-2026-0155", age: "3 days cold" },
  { ini: "CT", name: "Carla Tan", meta: "Prenup enquiry via Instagram DM", age: "2 days cold" },
];

export const CRM_DUE_TODAY = [
  { ini: "B&M", name: "Bianca & Marco", meta: "Wedding · KS-2026-0142", action: "Send album proof" },
  { ini: "RF", name: "Reyes Family", meta: "Birthday · KS-2026-0151", action: "Follow up on quote" },
];

// ── Bookings ─────────────────────────────────────────────────────────
export interface BookingRow {
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
  payment?: { total: string; deposit: string; balance: string };
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
      { text: "Booking created from inquiry", when: "10 Jun 2026 · 09:11", dot: "#9B9691" },
      { text: "Inquiry received via referral", when: "08 Jun 2026 · 17:45", dot: "#9B9691" },
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
      dateTime: "26 Jul 2026 · 2:00–5:00 PM",
      location: "Studio A, BGC",
      sessionType: "Birthday / Christening",
      balanceDueOn: "24 Jul 2026",
    },
    payment: { total: "₱28,000.00", deposit: "₱14,000.00", balance: "₱14,000.00" },
    auditLog: [
      { text: "Quote sent to Reyes Family", when: "21 Jul 2026 · 09:02", dot: "#0B5FFF" },
      { text: "Booking created from inquiry", when: "19 Jul 2026 · 16:40", dot: "#9B9691" },
      { text: "Inquiry received via Instagram", when: "18 Jul 2026 · 11:15", dot: "#9B9691" },
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
      { text: "Corporate Headshots in progress", when: "22 Jul 2026 · 09:15", dot: "#B33800" },
      { text: "Booking confirmed · deposit invoice sent", when: "10 Jul 2026 · 11:30", dot: "#00A15C" },
      { text: "Quote sent to Ayala Land Premier", when: "05 Jul 2026 · 15:02", dot: "#0B5FFF" },
      { text: "Booking created from inquiry", when: "02 Jul 2026 · 10:00", dot: "#9B9691" },
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
      dateTime: "02 Aug 2026 · 3:00–6:00 PM",
      location: "Bonifacio High Street",
      sessionType: "Prenup / Engagement",
      balanceDueOn: "19 Jul 2026",
    },
    payment: { total: "₱42,000.00", deposit: "₱21,000.00", balance: "₱21,000.00" },
    linkedProjectRef: "PRJ-2026-0149",
    auditLog: [
      { text: "Booking confirmed · deposit invoice sent", when: "28 Jun 2026 · 13:40", dot: "#00A15C" },
      { text: "Quote sent to Aria & Josh Lim", when: "26 Jun 2026 · 09:20", dot: "#0B5FFF" },
      { text: "Booking created from inquiry", when: "24 Jun 2026 · 18:05", dot: "#9B9691" },
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
    auditLog: [{ text: "Inquiry received via LinkedIn", when: "16 Jul 2026 · 14:12", dot: "#9B9691" }],
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

// ── Booking calendar (July 2026) ────────────────────────────────────
export const CALENDAR_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const CALENDAR_EVENTS: Record<number, { label: string; accent: "ink" | "orange" | "indigo" | "teal" }[]> = {
  9: [{ label: "Corporate — Globe", accent: "ink" }],
  14: [{ label: "Product — Globe", accent: "orange" }],
  21: [{ label: "Reyes quote due", accent: "orange" }],
  22: [{ label: "Headshots — Ayala", accent: "ink" }],
  26: [{ label: "Birthday — Reyes", accent: "indigo" }],
  30: [{ label: "Product — Globe", accent: "teal" }],
};

export const CALENDAR_TODAY = 21;

// ── POS ──────────────────────────────────────────────────────────────
export interface Product {
  sku: string;
  id: string;
  name: string;
  category: "Prints" | "Frames" | "Albums" | "Media";
  price: number;
  stock: number;
  swatch: string;
}

export const PRODUCTS: Product[] = [
  { sku: "PR-8X10", id: "P01", name: "8×10 Matte Print", category: "Prints", price: 180, stock: 120, swatch: "#4F3DD9" },
  { sku: "FR-1218", id: "P02", name: "Framed 12×18 (Oak)", category: "Frames", price: 1450, stock: 14, swatch: "#00A5AD" },
  { sku: "AL-30PP", id: "P03", name: "Premium Album (30pp)", category: "Albums", price: 4800, stock: 6, swatch: "#B33800" },
  { sku: "US-64GB", id: "P04", name: "USB Drive 64GB", category: "Media", price: 950, stock: 38, swatch: "#333333" },
  { sku: "CV-1620", id: "P05", name: "Canvas Wrap 16×20", category: "Frames", price: 2200, stock: 9, swatch: "#00A15C" },
  { sku: "AC-0606", id: "P06", name: "Acrylic Block 6×6", category: "Frames", price: 1350, stock: 3, swatch: "#8C2B00" },
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

// ── Dashboard KPIs (July 2026) ───────────────────────────────────────
export const SALES_MONTHS = [
  { label: "May 2026", total: 189000 },
  { label: "June 2026", total: 275000 },
  { label: "July 2026", total: 71000 },
];

export const DASHBOARD_KPIS = [
  { label: "Revenue MTD", value: "₱412,500", delta: "▲ 18% vs Jun", positive: true },
  { label: "Gross profit", value: "₱268,100", delta: "65% margin", positive: true },
  { label: "Avg booking value", value: "₱34,375", delta: "▲ ₱2,100 vs Jun", positive: true },
  { label: "Outstanding", value: "₱71,000", delta: "3 balances due", positive: false },
];

export const REVENUE_CHART = [
  { month: "FEB", value: 238 },
  { month: "MAR", value: 296 },
  { month: "APR", value: 271 },
  { month: "MAY", value: 344 },
  { month: "JUN", value: 349 },
  { month: "JUL", value: 412 },
];

export const DASHBOARD_SCHEDULE = [
  { time: "10:00 AM", title: "Corporate Headshots — Ayala Land", sub: "Studio B · 24 subjects" },
  { time: "2:00 PM", title: "Client call — Reyes Family", sub: "Confirm birthday details" },
  { time: "4:30 PM", title: "Album review — Bianca & Marco", sub: "Final proof approval" },
];

export const DASHBOARD_BALANCES = [
  { name: "Bianca & Marco", ref: "KS-2026-0142", amount: "₱92,500" },
  { name: "Aria & Josh Lim", ref: "KS-2026-0149", amount: "₱21,000" },
  { name: "Reyes Family", ref: "KS-2026-0151", amount: "₱14,000" },
];

export const DASHBOARD_INQUIRIES = [
  { ini: "GL", name: "Globe Telecom", sub: "Product shoot · 30 Jul", when: "3d ago" },
  { ini: "CT", name: "Carla Tan", sub: "Prenup enquiry", when: "2d ago" },
  { ini: "MP", name: "Maria Pascual", sub: "Graduation portraits", when: "5h ago" },
];

// ── Finance ──────────────────────────────────────────────────────────
const FIN_KINDS: Record<string, { bg: string; c: string }> = {
  deposit: { bg: "#E3EDFF", c: "#053799" },
  balance: { bg: "#FFE3D4", c: "#B33800" },
  full: { bg: "#E0F7EC", c: "#005430" },
  retail: { bg: "#E0F7F8", c: "#00575C" },
};

export const FINANCE_KPIS = [
  { label: "Recorded MTD", value: "₱412,500" },
  { label: "Booklet remaining", value: "54 serials" },
  { label: "Unreconciled", value: "2 items" },
];

export const FINANCE_INVOICES = [
  { serial: "KS-000-1042", ref: "KS-2026-0142", kind: "deposit", amount: "₱92,500.00", issued: "20 Jun 2026" },
  { serial: "KS-000-1043", ref: "KS-2026-0149", kind: "deposit", amount: "₱21,000.00", issued: "28 Jun 2026" },
  { serial: "KS-000-1044", ref: "ORD-2026-0771", kind: "retail", amount: "₱3,350.00", issued: "12 Jul 2026" },
  { serial: "KS-000-1045", ref: "KS-2025-0088", kind: "full", amount: "₱29,000.00", issued: "01 Mar 2026" },
  { serial: "KS-000-1046", ref: "KS-2026-0138", kind: "balance", amount: "₱48,000.00", issued: "18 Jul 2026" },
].map((r) => ({
  ...r,
  kindLabel: r.kind.charAt(0).toUpperCase() + r.kind.slice(1),
  kindBg: FIN_KINDS[r.kind].bg,
  kindColor: FIN_KINDS[r.kind].c,
}));

export const FINANCE_SALES_KPIS = [
  { label: "Sales this month", value: "₱125,750" },
  { label: "Transactions", value: "27" },
  { label: "Average sale", value: "₱4,657" },
  { label: "vs. last month", value: "▲ 8%" },
];

export const FINANCE_SALES = [
  { ref: "POS-2026-0712", desc: "Prints & frames — walk-in", method: "Cash", date: "21 Jul 2026", amt: "₱3,450.00" },
  { ref: "POS-2026-0711", desc: "Package add-on — Reyes", method: "GCash", date: "20 Jul 2026", amt: "₱6,000.00" },
  { ref: "KS-2026-0149", desc: "Wedding deposit — Deveza", method: "Bank transfer", date: "28 Jun 2026", amt: "₱21,000.00" },
  { ref: "KS-2026-0142", desc: "Corporate deposit — Globe", method: "Bank transfer", date: "20 Jun 2026", amt: "₱92,500.00" },
  { ref: "POS-2026-0708", desc: "Album reprint — Santos", method: "Maya", date: "18 Jul 2026", amt: "₱2,800.00" },
];

export const FINANCE_EXPENSE_KPIS = [
  { label: "Expenses this month", value: "₱101,830" },
  { label: "Largest category", value: "Payroll" },
  { label: "Entries", value: "18" },
  { label: "vs. last month", value: "▲ 6%" },
];

const EXP_TONE: Record<string, { bg: string; c: string }> = {
  blue: { bg: "#E3EDFF", c: "#053799" },
  indigo: { bg: "#EDEAFD", c: "#2A1F87" },
  orange: { bg: "#FFF4EE", c: "#B33800" },
  teal: { bg: "#E0F7F8", c: "#00575C" },
  grey: { bg: "#F1EFEC", c: "#6E6963" },
};

export const FINANCE_EXPENSES = [
  { ref: "EXP-2026-0221", cat: "Equipment", tone: "blue", desc: "Lens rental — 70-200mm", date: "19 Jul 2026", amt: "₱4,500.00" },
  { ref: "EXP-2026-0220", cat: "Studio", tone: "indigo", desc: "Studio rent — July", date: "01 Jul 2026", amt: "₱35,000.00" },
  { ref: "EXP-2026-0219", cat: "Payroll", tone: "orange", desc: "Semi-monthly payroll — Jul A", date: "15 Jul 2026", amt: "₱47,190.00" },
  { ref: "EXP-2026-0218", cat: "Supplies", tone: "teal", desc: "Prints & framing stock", date: "12 Jul 2026", amt: "₱6,240.00" },
  { ref: "EXP-2026-0217", cat: "Utilities", tone: "grey", desc: "Electricity & internet", date: "08 Jul 2026", amt: "₱8,900.00" },
].map((r) => ({ ...r, catBg: EXP_TONE[r.tone].bg, catColor: EXP_TONE[r.tone].c }));

export const FINANCE_PAYMENT_KPIS = [
  { label: "Money in", value: "₱119,500" },
  { label: "Money out", value: "₱82,190" },
  { label: "Net movement", value: "₱37,310" },
  { label: "Pending", value: "1" },
];

export const FINANCE_PAYMENTS = [
  { ref: "PAY-IN-0342", party: "Reyes Family", dir: "in", method: "GCash ••7712", date: "20 Jul 2026", amt: "₱6,000.00", st: "cleared" },
  { ref: "PAY-OUT-0119", party: "Payroll — Jul A · 5 staff", dir: "out", method: "Bank transfer", date: "15 Jul 2026", amt: "₱47,190.00", st: "cleared" },
  { ref: "PAY-IN-0341", party: "Globe Telecom", dir: "in", method: "Bank transfer", date: "20 Jun 2026", amt: "₱92,500.00", st: "cleared" },
  { ref: "PAY-OUT-0118", party: "Studio rent — July", dir: "out", method: "Bank transfer", date: "01 Jul 2026", amt: "₱35,000.00", st: "cleared" },
  { ref: "PAY-IN-0343", party: "Deveza — balance", dir: "in", method: "Bank transfer", date: "Awaiting", amt: "₱21,000.00", st: "pending" },
].map((r) => ({
  ...r,
  dirColor: r.dir === "in" ? "#005430" : "#8A0625",
  dirSign: r.dir === "in" ? "+" : "−",
  dirBg: r.dir === "in" ? "#E0F7EC" : "#FDE4EA",
  dirLabel: r.dir === "in" ? "In" : "Out",
  stBg: r.st === "cleared" ? "#E0F7EC" : "#FDF0D5",
  stColor: r.st === "cleared" ? "#005430" : "#8A6D00",
  stLabel: r.st === "cleared" ? "Cleared" : "Pending",
}));

// ── Quotation ────────────────────────────────────────────────────────
const QUOTE_ST: Record<string, { bg: string; c: string; l: string }> = {
  draft: { bg: "#ECEAE7", c: "#4A453F", l: "Draft" },
  sent: { bg: "#E3EDFF", c: "#053799", l: "Sent" },
  accepted: { bg: "#E0F7EC", c: "#005430", l: "Accepted" },
  expired: { bg: "#FDE4EA", c: "#8A0625", l: "Expired" },
};

export const QUOTATIONS = [
  { ref: "QT-2026-0074", client: "Bianca & Marco Deveza", type: "Wedding — Full Day", total: "₱185,000", valid: "Valid to 09 Aug", st: "sent" },
  { ref: "QT-2026-0073", client: "Ayala Land Premier", type: "Corporate Headshots", total: "₱96,000", valid: "Valid to 30 Jul", st: "accepted" },
  { ref: "QT-2026-0072", client: "Reyes Family", type: "Birthday / Christening", total: "₱28,000", valid: "Valid to 26 Jul", st: "sent" },
  { ref: "QT-2026-0071", client: "Aria & Josh Lim", type: "Prenup / Engagement", total: "₱42,000", valid: "Expired 18 Jul", st: "expired" },
  { ref: "QT-2026-0070", client: "Globe Telecom", type: "Product — Half Day", total: "₱54,000", valid: "Not sent", st: "draft" },
  { ref: "QT-2026-0069", client: "Santos Wedding", type: "Wedding — Half Day", total: "₱120,000", valid: "Not sent", st: "draft" },
].map((q) => ({ ...q, stBg: QUOTE_ST[q.st].bg, stColor: QUOTE_ST[q.st].c, stL: QUOTE_ST[q.st].l }));

// ── Maintenance & repair ─────────────────────────────────────────────
const MAINT_ST: Record<string, { bg: string; c: string; l: string }> = {
  reported: { bg: "#FDE4EA", c: "#8A0625", l: "Reported" },
  inspect: { bg: "#FDF0D5", c: "#8A6D00", l: "Inspection required" },
  scheduled: { bg: "#E3EDFF", c: "#053799", l: "Scheduled" },
  inrepair: { bg: "#FFE3D4", c: "#B33800", l: "In repair" },
  awaiting: { bg: "#FDF0D5", c: "#8A6D00", l: "Awaiting parts" },
  completed: { bg: "#E0F7EC", c: "#005430", l: "Completed" },
  unrepairable: { bg: "#ECEAE7", c: "#4A453F", l: "Unrepairable" },
};

const MAINT_TASK_RAISED = ["reported", "inspect", "scheduled", "inrepair", "awaiting"];

export const MAINTENANCE_ITEMS = [
  { task: "Air-conditioner cleaning", asset: "FAC-AC-01", mtype: "Preventive", issue: "Quarterly filter & coil clean", who: "Ivy S.", next: "24 Jul 2026", recur: "Every 3 months", est: "₱2,500", warranty: "N/A", st: "scheduled" },
  { task: "Signage cleaning", asset: "FAC-SIG-01", mtype: "Cleaning", issue: "Exterior storefront signage", who: "Ivy S.", next: "02 Sep 2026", recur: "Quarterly", est: "₱800", warranty: "N/A", st: "reported" },
  { task: "Camera & lens servicing", asset: "CAM-R5-02", mtype: "Repair", issue: "Autofocus intermittent on R5 body", who: "Canon Service Center", next: "26 Jul 2026", recur: "As needed", est: "₱6,000", warranty: "In warranty", st: "inrepair" },
  { task: "Printer maintenance", asset: "IT-PR-01", mtype: "Repair", issue: "Paper feed jams, roller worn", who: "Epson Vendor", next: "—", recur: "As needed", est: "₱3,200", warranty: "Expired", st: "awaiting" },
  { task: "Lighting & electrical inspection", asset: "EQ-LT-04", mtype: "Preventive", issue: "Monthly safety inspection", who: "Rafa T.", next: "19 Jul 2026", recur: "Monthly", est: "₱0", warranty: "N/A", st: "inspect" },
  { task: "Computer & storage maintenance", asset: "IT-WS-03", mtype: "Preventive", issue: "Disk health check & backup verify", who: "Danilo C.", next: "10 Aug 2026", recur: "Monthly", est: "₱0", warranty: "N/A", st: "completed" },
  { task: "Studio deep cleaning", asset: "FAC-STU-01", mtype: "Cleaning", issue: "Full-day cyclorama & floor clean", who: "Ivy S.", next: "12 Jul 2026", recur: "Monthly", est: "₱1,500", warranty: "N/A", st: "completed" },
].map((m) => ({
  ...m,
  stBg: MAINT_ST[m.st].bg,
  stColor: MAINT_ST[m.st].c,
  stL: MAINT_ST[m.st].l,
  taskRaised: MAINT_TASK_RAISED.includes(m.st),
}));

// ── Projects ─────────────────────────────────────────────────────────
const PROJ_STAGE_META: Record<string, { label: string; bg: string; c: string }> = {
  culling: { label: "Culling", bg: "#F1EFEC", c: "#6E6963" },
  editing: { label: "Editing", bg: "#FFE3D4", c: "#B33800" },
  review: { label: "Client review", bg: "#E3EDFF", c: "#053799" },
  delivered: { label: "Delivered", bg: "#E0F7EC", c: "#005430" },
};

export const PROJECT_GROUPS = [
  {
    stage: "editing",
    items: [
      { ref: "PRJ-2026-0142", title: "Bianca & Marco — Wedding", meta: "1,240 frames · due 02 Aug", editor: "EB", booking: "From booking KS-2026-0142" },
      { ref: "PRJ-2026-0138", title: "Ayala Land — Headshots", meta: "480 frames · due 25 Jul", editor: "EB", booking: "From booking KS-2026-0138" },
    ],
  },
  {
    stage: "review",
    items: [
      { ref: "PRJ-2026-0131", title: "Solaire — Event coverage", meta: "Gallery sent · awaiting picks", editor: "JR", booking: "From booking KS-2026-0131" },
    ],
  },
  {
    stage: "culling",
    items: [
      { ref: "PRJ-2026-0151", title: "Reyes Family — Birthday", meta: "820 frames · unstarted", editor: "—", booking: "From booking KS-2026-0151" },
    ],
  },
  {
    stage: "delivered",
    items: [
      { ref: "PRJ-2025-0088", title: "Deveza — Prenup", meta: "Delivered 14 Mar · expires in 12d", editor: "EB", booking: "From booking KS-2025-0088" },
    ],
  },
].map((g) => ({
  label: PROJ_STAGE_META[g.stage].label,
  count: g.items.length,
  bg: PROJ_STAGE_META[g.stage].bg,
  color: PROJ_STAGE_META[g.stage].c,
  items: g.items,
}));

// ── Glitches ─────────────────────────────────────────────────────────
const GLITCH_ST: Record<string, { bg: string; c: string; l: string }> = {
  open: { bg: "#FDE4EA", c: "#8A0625", l: "Open" },
  progress: { bg: "#FDF0D5", c: "#8A6D00", l: "Investigating" },
  fixed: { bg: "#E0F7EC", c: "#005430", l: "Fixed" },
  closed: { bg: "#ECEAE7", c: "#4A453F", l: "Closed" },
};

const SEV_COLOR: Record<string, string> = { High: "#8A0625", Medium: "#8A6D00", Low: "#6E6963" };

export const GLITCHES = [
  { ref: "GL-0042", title: "Gallery link expired 3 days early", area: "Website · delivery", by: "Mika R.", sev: "High", when: "22 Jul · 2:14 PM", st: "progress", group: "open" },
  { ref: "GL-0041", title: "Payslip PDF fails to generate for interns", area: "Payroll · payslips", by: "Eusebio D.", sev: "High", when: "21 Jul · 9:02 AM", st: "open", group: "open" },
  { ref: "GL-0040", title: "Softbox stand snapped mid-shoot", area: "Equipment · lighting", by: "Rafa T.", sev: "Medium", when: "20 Jul · 4:47 PM", st: "progress", group: "open" },
  { ref: "GL-0037", title: "Client says delivered album missing 40 photos", area: "Complaint · delivery", by: "Front desk", sev: "High", when: "16 Jul · 11:20 AM", st: "open", group: "open" },
  { ref: "GL-0039", title: "POS serial field accepts letters", area: "POS · checkout", by: "Jules M.", sev: "Medium", when: "19 Jul · 3:35 PM", st: "fixed", group: "closed" },
  { ref: "GL-0038", title: "Cracked lens filter on 50mm kit", area: "Equipment · lenses", by: "Rafa T.", sev: "Low", when: "17 Jul · 10:08 AM", st: "fixed", group: "closed" },
  { ref: "GL-0036", title: "Client complaint: late arrival at venue", area: "Complaint · booking", by: "Front desk", sev: "High", when: "14 Jul · 5:52 PM", st: "closed", group: "closed" },
  { ref: "GL-0035", title: "Feedback form rejects long comments", area: "Feedback · report", by: "Mika R.", sev: "Low", when: "11 Jul · 1:30 PM", st: "closed", group: "closed" },
].map((g) => ({
  ...g,
  stBg: GLITCH_ST[g.st].bg,
  stColor: GLITCH_ST[g.st].c,
  stL: GLITCH_ST[g.st].l,
  sevColor: SEV_COLOR[g.sev],
}));

// ── Website ──────────────────────────────────────────────────────────
const WEB_STATUS: Record<string, { bg: string; c: string; label: string }> = {
  published: { bg: "#E0F7EC", c: "#005430", label: "Published" },
  draft: { bg: "#F1EFEC", c: "#6E6963", label: "Draft" },
};

export const WEBSITE_PORTFOLIO = [
  { slot: "pf1", title: "Deveza Wedding", cat: "Weddings", consent: "CR-2026-014", st: "published" },
  { slot: "pf2", title: "Solaire Gala Night", cat: "Corporate", consent: "CR-2026-011", st: "published" },
  { slot: "pf3", title: "Lim Prenup — Batanes", cat: "Engagement", consent: "CR-2026-018", st: "draft" },
  { slot: "pf4", title: "Ayala Land Portraits", cat: "Corporate", consent: "CR-2026-009", st: "published" },
  { slot: "pf5", title: "Reyes Christening", cat: "Family", consent: "pending", st: "draft" },
  { slot: "pf6", title: "Studio Product Series", cat: "Commercial", consent: "CR-2026-021", st: "published" },
].map((p) => ({
  ...p,
  stBg: WEB_STATUS[p.st].bg,
  stColor: WEB_STATUS[p.st].c,
  stLabel: WEB_STATUS[p.st].label,
  consentMono: p.consent === "pending" ? "consent pending" : p.consent,
}));

export const WEBSITE_PAGES = [
  { path: "/", title: "Home", st: "published" },
  { path: "/portfolio", title: "Portfolio", st: "published" },
  { path: "/services", title: "Services & packages", st: "published" },
  { path: "/about", title: "About the studio", st: "draft" },
].map((p) => ({ ...p, stBg: WEB_STATUS[p.st].bg, stColor: WEB_STATUS[p.st].c, stLabel: WEB_STATUS[p.st].label }));

// ── Inventory ────────────────────────────────────────────────────────
const INV_STATUS: Record<string, { bg: string; c: string; label: string }> = {
  available: { bg: "#E0F7EC", c: "#005430", label: "Available" },
  out: { bg: "#FFE3D4", c: "#B33800", label: "Checked out" },
  maint: { bg: "#FDE4EA", c: "#8A0625", label: "Maintenance" },
};

export const INVENTORY_EQUIPMENT = [
  { serial: "CAM-R5-01", name: "Canon EOS R5", cat: "Camera body", st: "out", note: "Ayala shoot · back 23 Jul" },
  { serial: "CAM-R5-02", name: "Canon EOS R5", cat: "Camera body", st: "available", note: "Studio cabinet" },
  { serial: "LNS-2470-01", name: "RF 24–70mm f/2.8", cat: "Lens", st: "out", note: "Ayala shoot · back 23 Jul" },
  { serial: "LNS-85-01", name: "RF 85mm f/1.2", cat: "Lens", st: "available", note: "Studio cabinet" },
  { serial: "LGT-AD600-01", name: "Godox AD600 Pro", cat: "Lighting", st: "maint", note: "Modelling lamp fault" },
  { serial: "GMB-RS3-01", name: "DJI RS 3 Gimbal", cat: "Support", st: "available", note: "Studio cabinet" },
].map((e) => ({
  ...e,
  stBg: INV_STATUS[e.st].bg,
  stColor: INV_STATUS[e.st].c,
  stLabel: INV_STATUS[e.st].label,
  noteColor: e.st === "maint" ? "#8A0625" : "#6E6963",
}));

// ── Marketing ────────────────────────────────────────────────────────
const MKT_STATUS: Record<string, { bg: string; c: string; label: string }> = {
  live: { bg: "#E0F7EC", c: "#005430", label: "Live" },
  scheduled: { bg: "#E3EDFF", c: "#053799", label: "Scheduled" },
  ended: { bg: "#F1EFEC", c: "#6E6963", label: "Ended" },
};

export const MARKETING_KPIS = [
  { label: "Attributed revenue", value: "₱186,400" },
  { label: "Bookings from campaigns", value: "9" },
  { label: "Cost per booking", value: "₱642" },
];

export const MARKETING_CAMPAIGNS = [
  { name: "Wedding season — Meta", channel: "Facebook · Instagram", spend: "₱24,000", bookings: "5", st: "live" },
  { name: "Corporate headshots — LinkedIn", channel: "LinkedIn Ads", spend: "₱12,500", bookings: "2", st: "live" },
  { name: "Graduation portraits", channel: "Instagram · TikTok", spend: "₱8,000", bookings: "2", st: "scheduled" },
  { name: "Valentine prenup promo", channel: "Facebook", spend: "₱15,000", bookings: "6", st: "ended" },
].map((c) => ({ ...c, stBg: MKT_STATUS[c.st].bg, stColor: MKT_STATUS[c.st].c, stLabel: MKT_STATUS[c.st].label }));

export const MARKETING_SOURCES = [
  { label: "Instagram", pct: 38, val: "₱70,800" },
  { label: "Referral", pct: 27, val: "₱50,300" },
  { label: "Facebook", pct: 21, val: "₱39,100" },
  { label: "Website", pct: 14, val: "₱26,200" },
].map((s, i) => ({ ...s, color: i === 0 ? "#FF5300" : "#C7C3BE", labelColor: i === 0 ? "#B33800" : "#6E6963" }));

// ── Attendance ───────────────────────────────────────────────────────
const ATT_STATUS: Record<string, { bg: string; c: string; label: string }> = {
  in: { bg: "#E0F7EC", c: "#005430", label: "On shoot" },
  done: { bg: "#F1EFEC", c: "#6E6963", label: "Logged" },
  pending: { bg: "#FFE3D4", c: "#B33800", label: "Unsubmitted" },
};

export const ATTENDANCE_ROWS = [
  { ini: "EB", name: "Eusebio Barrun", role: "Owner · Lead", hours: "6.5h", engagement: "Ayala Land — Headshots", st: "in" },
  { ini: "JR", name: "Jasmine Reyes", role: "Second shooter", hours: "8.0h", engagement: "Solaire — Event", st: "done" },
  { ini: "MP", name: "Miguel Padua", role: "Freelance video", hours: "5.0h", engagement: "Deveza — Wedding prep", st: "pending" },
  { ini: "CL", name: "Carla Lim", role: "Retoucher", hours: "7.0h", engagement: "Post — editing pool", st: "done" },
].map((r) => ({ ...r, stBg: ATT_STATUS[r.st].bg, stColor: ATT_STATUS[r.st].c, stLabel: ATT_STATUS[r.st].label }));

export const ATTENDANCE_KPIS = [
  { label: "Logged this week", value: "132.5h" },
  { label: "Active engagements", value: "4" },
  { label: "Unsubmitted", value: "1" },
];

// ── Recruitment ──────────────────────────────────────────────────────
const REC_STAGES: Record<string, { label: string; bg: string; c: string }> = {
  applied: { label: "Applied", bg: "#F1EFEC", c: "#6E6963" },
  screening: { label: "Screening", bg: "#E3EDFF", c: "#053799" },
  interview: { label: "Interview", bg: "#FFE3D4", c: "#B33800" },
  offer: { label: "Offer", bg: "#E0F7EC", c: "#005430" },
};

export const RECRUITMENT_CANDIDATES = [
  { ini: "JD", name: "Jonas Dela Cruz", role: "Second shooter", meta: "Portfolio · 4 yrs weddings", st: "interview" },
  { ini: "RA", name: "Rhea Ang", role: "Retoucher", meta: "Referral · Carla Lim", st: "offer" },
  { ini: "MB", name: "Marco Bautista", role: "Videographer", meta: "Applied via website", st: "screening" },
  { ini: "TS", name: "Trina Salazar", role: "Second shooter", meta: "Instagram outreach", st: "applied" },
].map((c) => ({ ...c, stBg: REC_STAGES[c.st].bg, stColor: REC_STAGES[c.st].c, stLabel: REC_STAGES[c.st].label }));

export const RECRUITMENT_ROLES = [
  { title: "Second shooter (weddings)", type: "Freelance · project", applicants: "6 applicants", open: true },
  { title: "Retoucher", type: "Freelance · retainer", applicants: "3 applicants", open: true },
  { title: "Studio coordinator", type: "Part-time", applicants: "Draft — not posted", open: false },
].map((r) => ({
  ...r,
  stBg: r.open ? "#E0F7EC" : "#F1EFEC",
  stColor: r.open ? "#005430" : "#6E6963",
  stLabel: r.open ? "Open" : "Draft",
}));

function progressMeta(done: number, total: number, completeColor: string, activeColor: string) {
  const pct = Math.round((done / total) * 100);
  const complete = done === total;
  return {
    pct: `${pct}%`,
    label: `${done} / ${total}`,
    barColor: complete ? completeColor : activeColor,
    stBg: complete ? "#E0F7EC" : activeColor === "#4F3DD9" ? "#EDEAFD" : "#FFE3D4",
    stColor: complete ? "#005430" : activeColor === "#4F3DD9" ? "#2A1F87" : "#B33800",
    stLabel: complete ? "Complete" : "In progress",
  };
}

export const ONBOARDING_HIRES = [
  { ini: "MP", name: "Miguel Padua", role: "Freelance videographer", done: 4, total: 6 },
  { ini: "CL", name: "Carla Lim", role: "Retoucher", done: 6, total: 6 },
  { ini: "AT", name: "Andres Tolentino", role: "Second shooter", done: 1, total: 6 },
].map((h) => ({ ...h, ...progressMeta(h.done, h.total, "#00A15C", "#4F3DD9") }));

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
  tick: c.done ? "#00A15C" : "#C7C3BE",
  bg: c.done ? "#E0F7EC" : "#F1EFEC",
  textColor: c.done ? "#242424" : "#9B9691",
}));

export const OFFBOARDING_DEPARTURES = [
  { ini: "DL", name: "Danniel Lopez", role: "Retoucher · freelance", done: 3, total: 5 },
  { ini: "GV", name: "Grace Villar", role: "Second shooter", done: 5, total: 5 },
].map((h) => ({ ...h, ...progressMeta(h.done, h.total, "#00A15C", "#B33800") }));

export const OFFBOARDING_CHECKLIST = [
  { label: "Final payout cleared", done: true },
  { label: "Equipment returned", done: true },
  { label: "Cloud & gallery access revoked", done: true },
  { label: "Client handover", done: false },
  { label: "Portfolio rights confirmed", done: false },
].map((c) => ({
  label: c.label,
  done: c.done,
  tick: c.done ? "#00A15C" : "#C7C3BE",
  bg: c.done ? "#E0F7EC" : "#F1EFEC",
  textColor: c.done ? "#242424" : "#9B9691",
}));

// ── Performance ──────────────────────────────────────────────────────
const PF_STATUS: Record<string, { bg: string; c: string; label: string }> = {
  due: { bg: "#FFE3D4", c: "#B33800", label: "Review due" },
  scheduled: { bg: "#E3EDFF", c: "#053799", label: "Scheduled" },
  done: { bg: "#E0F7EC", c: "#005430", label: "Completed" },
};

export const PERFORMANCE_REVIEWS = [
  { ini: "JR", name: "Jasmine Reyes", role: "Second shooter", cycle: "H1 2026", rating: "4.6", st: "done" },
  { ini: "CL", name: "Carla Lim", role: "Retoucher", cycle: "H1 2026", rating: "—", st: "due" },
  { ini: "MP", name: "Miguel Padua", role: "Freelance video", cycle: "H1 2026", rating: "—", st: "scheduled" },
].map((r) => ({ ...r, stBg: PF_STATUS[r.st].bg, stColor: PF_STATUS[r.st].c, stLabel: PF_STATUS[r.st].label }));

export const PERFORMANCE_ME_KPIS = [
  { label: "Shoots delivered", value: "23", delta: "▲ 4 vs H2 2025", positive: true },
  { label: "Avg delivery time", value: "10.5d", delta: "▼ 1.5d faster", positive: true },
  { label: "Client rating", value: "4.8", delta: "Across 19 reviews", positive: null },
  { label: "Revenue owned", value: "₱1.42M", delta: "▲ 22% YoY", positive: true },
];

export const PERFORMANCE_ME_CYCLES = [
  { cycle: "H1 2026", rating: "4.8", note: "Fastest delivery half on record" },
  { cycle: "H2 2025", rating: "4.6", note: "Grew referral share to 24%" },
  { cycle: "H1 2025", rating: "4.5", note: "Launched corporate headshot line" },
];

export const PERFORMANCE_GOALS = [
  { label: "Lift gallery delivery to <10 days", owner: "Studio", pct: 72, val: "12 → 10.5 days" },
  { label: "Grow referral share to 30%", owner: "Studio", pct: 90, val: "27% of bookings" },
  { label: "Second-shooter bench of 4", owner: "Hiring", pct: 50, val: "2 of 4 onboarded" },
];

// ── Tasks ────────────────────────────────────────────────────────────
const TASK_COL_DEFS = [
  { key: "todo", label: "To do", c: "#6E6963", bg: "#F1EFEC" },
  { key: "doing", label: "In progress", c: "#B33800", bg: "#FFE3D4" },
  { key: "blocked", label: "Blocked", c: "#8A0625", bg: "#FDE4EA" },
  { key: "done", label: "Done", c: "#005430", bg: "#E0F7EC" },
];

const TASK_PRIO: Record<string, { bg: string; c: string }> = {
  High: { bg: "#FDE4EA", c: "#8A0625" },
  Med: { bg: "#FDF0D5", c: "#8A6D00" },
  Low: { bg: "#F1EFEC", c: "#6E6963" },
};

const TASK_ITEMS = [
  { col: "todo", title: "Create social media content", meta: "Marketing · Marisol", due: "Due 23 Jul", prio: "High", cat: "Content", standalone: true, recur: "Weekly", fromMaint: false },
  { col: "todo", title: "Clean the studio", meta: "Maintenance · FAC-STU-01", due: "Due 23 Jul", prio: "Med", cat: "Maintenance", standalone: true, recur: "Daily", fromMaint: true },
  { col: "todo", title: "Charge batteries", meta: "Equipment · Danilo", due: "Due 24 Jul", prio: "High", cat: "Equipment", standalone: true, recur: "Before each shoot", fromMaint: false },
  { col: "todo", title: "Check inventory", meta: "Inventory · Ivy", due: "Due 26 Jul", prio: "Low", cat: "Inventory", standalone: true, recur: "Weekly", fromMaint: false },
  { col: "doing", title: "Cull Deveza wedding set", meta: "PRJ-2026-0142 · Danilo", due: "Due 25 Jul", prio: "High", cat: "Production", standalone: false, recur: "", fromMaint: false },
  { col: "doing", title: "Clean cameras and lenses", meta: "Maintenance · CAM-R5-02", due: "Due 24 Jul", prio: "Med", cat: "Equipment", standalone: true, recur: "Weekly", fromMaint: true },
  { col: "doing", title: "Prepare equipment", meta: "PRJ-2026-0138 · Rafa", due: "Due 24 Jul", prio: "High", cat: "Production", standalone: false, recur: "", fromMaint: false },
  { col: "blocked", title: "Back up files", meta: "Maintenance · IT-WS-03", due: "Due 23 Jul", prio: "High", cat: "Maintenance", standalone: true, recur: "Daily", fromMaint: true },
  { col: "done", title: "Perform routine maintenance", meta: "Equipment · Rafa", due: "20 Jul", prio: "Low", cat: "Maintenance", standalone: true, recur: "Monthly", fromMaint: false },
  { col: "done", title: "Confirm Deveza booking", meta: "Booking · Marisol", due: "20 Jul", prio: "High", cat: "Admin", standalone: true, recur: "", fromMaint: false },
];

export const TASKS_BOARD = TASK_COL_DEFS.map((c) => {
  const items = TASK_ITEMS.filter((t) => t.col === c.key);
  return {
    label: c.label,
    c: c.c,
    bg: c.bg,
    count: items.length,
    items: items.map((t) => ({
      ...t,
      pBg: TASK_PRIO[t.prio].bg,
      pColor: TASK_PRIO[t.prio].c,
    })),
  };
});

const TASK_STATUS: Record<string, { l: string; bg: string; c: string }> = {
  todo: { l: "To do", bg: "#F1EFEC", c: "#6E6963" },
  doing: { l: "In progress", bg: "#FFE3D4", c: "#B33800" },
  blocked: { l: "Blocked", bg: "#FDE4EA", c: "#8A0625" },
  done: { l: "Done", bg: "#E0F7EC", c: "#005430" },
};

export const TASKS_MINE = TASK_ITEMS.map((t) => ({
  title: t.title,
  meta: t.meta,
  due: t.due,
  prio: t.prio,
  pBg: TASK_PRIO[t.prio].bg,
  pColor: TASK_PRIO[t.prio].c,
  stL: TASK_STATUS[t.col].l,
  stBg: TASK_STATUS[t.col].bg,
  stColor: TASK_STATUS[t.col].c,
  ring: t.col === "done" ? "#00A15C" : "#C7C3BE",
  done: t.col === "done",
  recur: t.recur,
  cat: t.cat,
}));

// ── Shiftboard ───────────────────────────────────────────────────────
const SHIFT_LOC: Record<string, { bg: string; c: string; label: string }> = {
  studio: { bg: "#E0F7F8", c: "#00575C", label: "Studio" },
  location: { bg: "#FFF4EE", c: "#B33800", label: "On location" },
};

export interface ShiftEntry {
  id: string;
  d: number;
  ini: string;
  who: string;
  role: string;
  time: string;
  loc: "studio" | "location";
}

export const SHIFT_DEFAULT: ShiftEntry[] = [
  { id: "s1", d: 0, ini: "MR", who: "Marisol", role: "Studio open", time: "9:00–18:00", loc: "studio" },
  { id: "s2", d: 0, ini: "DC", who: "Danilo", role: "Editing", time: "10:00–18:00", loc: "studio" },
  { id: "s3", d: 1, ini: "EB", who: "Eusebio", role: "Ayala shoot", time: "8:00–14:00", loc: "location" },
  { id: "s4", d: 1, ini: "IS", who: "Ivy", role: "Studio duty", time: "9:00–18:00", loc: "studio" },
  { id: "s5", d: 2, ini: "DC", who: "Danilo", role: "Editing", time: "10:00–18:00", loc: "studio" },
  { id: "s6", d: 2, ini: "JL", who: "Josefa", role: "Retouch", time: "13:00–18:00", loc: "studio" },
  { id: "s7", d: 3, ini: "EB", who: "Eusebio", role: "Deveza prep", time: "9:00–17:00", loc: "studio" },
  { id: "s8", d: 3, ini: "MR", who: "Marisol", role: "Studio open", time: "9:00–18:00", loc: "studio" },
  { id: "s9", d: 4, ini: "IS", who: "Ivy", role: "Headshots", time: "10:00–16:00", loc: "location" },
  { id: "s10", d: 4, ini: "KT", who: "Kevin", role: "Assist", time: "10:00–16:00", loc: "location" },
  { id: "s11", d: 5, ini: "EB", who: "Eusebio", role: "Wedding — Deveza", time: "14:00–23:00", loc: "location" },
  { id: "s12", d: 5, ini: "MR", who: "Marisol", role: "Coordinator", time: "14:00–23:00", loc: "location" },
];

export const SHIFT_DAY_META: [string, string, boolean][] = [
  ["Mon", "21", true],
  ["Tue", "22", false],
  ["Wed", "23", false],
  ["Thu", "24", false],
  ["Fri", "25", false],
  ["Sat", "26", false],
];

export function shiftLocStyle(loc: "studio" | "location") {
  return SHIFT_LOC[loc];
}

// ── Compliance ───────────────────────────────────────────────────────
const COMP_ST: Record<string, { bg: string; c: string; l: string; o: number }> = {
  expired: { bg: "#FDE4EA", c: "#8A0625", l: "Expired", o: 1 },
  action: { bg: "#FFE3D4", c: "#B33800", l: "Action required", o: 2 },
  duesoon: { bg: "#FDF0D5", c: "#8A6D00", l: "Due soon", o: 3 },
  submitted: { bg: "#E3EDFF", c: "#053799", l: "Submitted", o: 6 },
  review: { bg: "#E3EDFF", c: "#053799", l: "Under review", o: 6 },
  compliant: { bg: "#E0F7EC", c: "#005430", l: "Compliant", o: 7 },
  na: { bg: "#ECEAE7", c: "#6E6963", l: "Not applicable", o: 8 },
};

const COMPLIANCE_DATA_RAW = [
  { req: "Mayor's / business permit", cat: "Local permit", agency: "Tabaco City BPLU", num: "BP-2025-04821", freq: "Annual", who: "Marisol A.", est: "₱2,000–₱15,000", act: "₱8,400", st: "compliant", expiry: "31 Jan 2027" },
  { req: "Barangay business clearance", cat: "Local permit", agency: "Barangay Divino Rostro", num: "BRGY-3391", freq: "Annual", who: "Marisol A.", est: "₱300–₱1,000", act: "₱650", st: "compliant", expiry: "31 Jan 2027" },
  { req: "Fire Safety Inspection Certificate", cat: "Local permit", agency: "Bureau of Fire Protection", num: "FSIC-2025-1180", freq: "Annual", who: "Marisol A.", est: "₱500–₱5,000", act: "—", st: "duesoon", expiry: "15 Aug 2026" },
  { req: "Sanitary permit", cat: "Local permit", agency: "City Health Office", num: "SP-2025-0774", freq: "Annual", who: "Ivy S.", est: "₱300–₱1,500", act: "—", st: "action", expiry: "30 Jul 2026" },
  { req: "Community Tax Certificate", cat: "Local tax", agency: "City Treasurer's Office", num: "CTC-2026-2210", freq: "Annual", who: "Marisol A.", est: "₱50–₱500+", act: "₱500", st: "compliant", expiry: "31 Dec 2026" },
  { req: "Occupational permits", cat: "Local permit", agency: "City Health Office", num: "OP-2025-118", freq: "Annual", who: "Ivy S.", est: "₱100–₱500 / person", act: "₱400", st: "compliant", expiry: "31 Jan 2027" },
  { req: "DTI business-name registration", cat: "Registration", agency: "DTI", num: "DTI-•••4471", freq: "5-yearly", who: "Eusebio B.", est: "₱200–₱2,000", act: "₱530", st: "compliant", expiry: "12 Apr 2029" },
  { req: "BIR Certificate of Registration", cat: "BIR", agency: "BIR RDO 067", num: "COR-•••2093", freq: "As needed", who: "Eusebio B.", est: "Assessment-based", act: "—", st: "compliant", expiry: "—" },
  { req: "Books of accounts", cat: "BIR", agency: "BIR RDO 067", num: "BOA-2026-08", freq: "As required", who: "Danilo C.", est: "₱200–₱1,500", act: "₱380", st: "submitted", expiry: "—" },
  { req: "Authority to Print / invoicing", cat: "BIR", agency: "BIR RDO 067", num: "ATP-2025-5514", freq: "As needed", who: "Danilo C.", est: "Supplier costs vary", act: "₱1,200", st: "review", expiry: "—" },
  { req: "Income-tax returns", cat: "Tax filing", agency: "BIR", num: "1701Q / 1701", freq: "Quarterly", who: "Eusebio B.", est: "Tax due + filing", act: "—", st: "duesoon", expiry: "15 Aug 2026" },
  { req: "Percentage tax / VAT returns", cat: "Tax filing", agency: "BIR", num: "2551Q", freq: "Quarterly", who: "Eusebio B.", est: "Based on sales", act: "—", st: "duesoon", expiry: "25 Jul 2026" },
  { req: "Withholding-tax returns", cat: "Tax filing", agency: "BIR", num: "1601C / 1604", freq: "Monthly", who: "Danilo C.", est: "Based on withheld", act: "—", st: "action", expiry: "10 Jul 2026" },
  { req: "SSS remittances", cat: "Statutory", agency: "SSS", num: "ER-•••8820", freq: "Monthly", who: "Danilo C.", est: "Per contribution table", act: "₱6,240", st: "compliant", expiry: "31 Jul 2026" },
  { req: "PhilHealth remittances", cat: "Statutory", agency: "PhilHealth", num: "ER-•••1177", freq: "Monthly", who: "Danilo C.", est: "Per contribution table", act: "₱2,100", st: "compliant", expiry: "31 Jul 2026" },
  { req: "Pag-IBIG remittances", cat: "Statutory", agency: "Pag-IBIG (HDMF)", num: "ER-•••4402", freq: "Monthly", who: "Danilo C.", est: "Per contribution table", act: "₱1,200", st: "compliant", expiry: "31 Jul 2026" },
  { req: "DOLE & OSH requirements", cat: "Labor", agency: "DOLE", num: "—", freq: "As required", who: "Marisol A.", est: "Training costs vary", act: "—", st: "action", expiry: "—" },
  { req: "Data Privacy Act compliance", cat: "Privacy", agency: "NPC", num: "NPC-•••pending", freq: "Ongoing", who: "Eusebio B.", est: "Assessment-based", act: "—", st: "review", expiry: "—" },
  { req: "Building / occupancy permits", cat: "Local permit", agency: "City Engineering Office", num: "OCC-2019-334", freq: "As required", who: "Marisol A.", est: "Assessment-based", act: "—", st: "na", expiry: "—" },
  { req: "Signage permit", cat: "Local permit", agency: "Tabaco City BPLU", num: "SGN-2024-091", freq: "Annual", who: "Marisol A.", est: "₱300–₱2,000", act: "—", st: "expired", expiry: "31 May 2026" },
];

export const COMPLIANCE_REGISTER = COMPLIANCE_DATA_RAW.map((c) => {
  const m = COMP_ST[c.st];
  return { ...c, stBg: m.bg, stColor: m.c, stL: m.l, ord: m.o };
}).sort((a, b) => a.ord - b.ord);

function complianceCount(st: string) {
  return COMPLIANCE_DATA_RAW.filter((c) => c.st === st).length;
}

const complianceActionNeeded = complianceCount("expired") + complianceCount("action") > 0;

export const COMPLIANCE_SUMMARY = [
  {
    label: "Overall status",
    value: complianceActionNeeded ? "Action needed" : "On track",
    tone: complianceActionNeeded ? "#B33800" : "#005430",
    sub: `${COMPLIANCE_DATA_RAW.length} requirements tracked`,
  },
  { label: "Expired", value: String(complianceCount("expired")), tone: "#8A0625", sub: "Renew immediately" },
  {
    label: "Due within 30 days",
    value: String(complianceCount("duesoon") + complianceCount("action")),
    tone: "#8A6D00",
    sub: "Action required soon",
  },
  {
    label: "Pending applications",
    value: String(complianceCount("submitted") + complianceCount("review")),
    tone: "#053799",
    sub: "Submitted / under review",
  },
  { label: "Estimated fees due", value: "₱18,500", tone: "#141414", sub: "Planning estimate" },
  { label: "Actual fees paid (YTD)", value: "₱21,900", tone: "#141414", sub: "2026 to date" },
];

// ── Feedback ─────────────────────────────────────────────────────────
export const FEEDBACK_REPORTS = [
  { kind: "Problem", kc: "#8A0625", kb: "#FDE4EA", summary: "Balance on Reyes booking doesn't match deposit", iid: "#248", app: "Booking", status: "In progress", sc: "#0B5FFF" },
  { kind: "Idea", kc: "#053799", kb: "#E3EDFF", summary: "Add a \"duplicate booking\" action", iid: "#241", app: "Booking", status: "Triaged", sc: "#6E6963" },
  { kind: "Problem", kc: "#8A0625", kb: "#FDE4EA", summary: "POS cart clears if I switch tabs", iid: "#236", app: "POS", status: "Shipped", sc: "#00A15C" },
  { kind: "Idea", kc: "#053799", kb: "#E3EDFF", summary: "Show referral source on account cards", iid: "#229", app: "CRM", status: "Submitted", sc: "#9B9691" },
];

// ── Settings ─────────────────────────────────────────────────────────
export const SETTINGS_GENERAL = [
  { label: "Workspace name", value: "Kahel Studio", mono: false },
  { label: "Domain", value: "app.kahelstudio.com", mono: true },
  { label: "Timezone", value: "Asia/Manila (GMT+8)", mono: false },
  { label: "Currency", value: "PHP · ₱ · centavos", mono: false },
  { label: "Date format", value: "21 Jul 2026", mono: true },
  { label: "Booking reference", value: "KS-YYYY-XXXX", mono: true },
];

export const SETTINGS_TOGGLES = [
  { label: "Email receipts to clients", sub: "Send a copy on every completed sale", on: true },
  { label: "Deposit reminders", sub: "Nudge accounts 3 days before balance due", on: true },
  { label: "Low-stock alerts", sub: "Warn when a product drops below threshold", on: true },
  { label: "Weekly digest", sub: "Monday summary of the week ahead", on: false },
];

export const SETTINGS_LOGS = [
  { ev: "Signed in", actor: "Eusebio Barrun", when: "22 Jul 2026 · 08:41", type: "auth", tL: "Auth" },
  { ev: "Payroll released · PAY-2026-07-A", actor: "Eusebio Barrun", when: "15 Jul 2026 · 16:02", type: "ok", tL: "Action" },
  { ev: "Gallery delivered · Reyes", actor: "Danilo Cruz", when: "14 Jul 2026 · 11:20", type: "data", tL: "Data" },
  { ev: "Failed login attempt", actor: "Unknown · 112.198.x.x", when: "12 Jul 2026 · 02:14", type: "warn", tL: "Security" },
  { ev: "BIR serial recorded · KS-000-1046", actor: "Marisol Reyes", when: "18 Jul 2026 · 09:33", type: "data", tL: "Data" },
  { ev: "Team member invited", actor: "Eusebio Barrun", when: "10 Jul 2026 · 15:07", type: "auth", tL: "Auth" },
].map((r) => {
  const tone: Record<string, { bg: string; c: string }> = {
    auth: { bg: "#EDEAFD", c: "#2A1F87" },
    data: { bg: "#E3EDFF", c: "#053799" },
    warn: { bg: "#FDF0D5", c: "#8A6D00" },
    ok: { bg: "#E0F7EC", c: "#005430" },
  };
  return { ...r, tBg: tone[r.type].bg, tColor: tone[r.type].c };
});

export const USAGE_KPIS = [
  { label: "Storage used", value: "312 GB" },
  { label: "Galleries delivered", value: "48" },
  { label: "Team seats", value: "6 of 10" },
  { label: "Emails sent (Jul)", value: "1,284" },
];

export const USAGE_BARS = [
  { label: "Cloud storage", sub: "312 GB of 500 GB", pct: 62, bar: "#00A5AD" },
  { label: "Bandwidth (July)", sub: "184 GB of 400 GB", pct: 46, bar: "#4F3DD9" },
  { label: "Team seats", sub: "6 of 10 used", pct: 60, bar: "#FF5300" },
  { label: "Email quota (July)", sub: "1,284 of 5,000", pct: 26, bar: "#00A15C" },
];

export const BILLING_ROWS = [
  { label: "Active booklet ATP", value: "ATP-0AU-2026-0142" },
  { label: "Serial range", value: "KS-000-1042 → 1100" },
  { label: "Current serial", value: "KS-000-1046" },
];

// ── My Profile ───────────────────────────────────────────────────────
export const PROFILE_INFO = [
  { label: "Full name", value: "Eusebio Barrun" },
  { label: "Preferred name", value: "Sebi" },
  { label: "Email", value: "eusebio@kahelstudio.com" },
  { label: "Mobile", value: "+63 917 555 0142" },
];

export const PROFILE_META = [
  { label: "Role", value: "Owner · Lead photographer" },
  { label: "Member since", value: "March 2021" },
  { label: "User ID", value: "KS-USR-0001" },
];

export const PROFILE_GOV = [
  { label: "SSS number", value: "34-•••••••-8", audit: "Verified by M. Reyes · 12 Mar 2024" },
  { label: "TIN", value: "•••-•••-•••-000", audit: "Verified by M. Reyes · 12 Mar 2024" },
  { label: "PhilHealth number", value: "••-•••••••-4", audit: "Verified by M. Reyes · 12 Mar 2024" },
  { label: "Pag-IBIG MID number", value: "••••-••••-2201", audit: "Verified by M. Reyes · 12 Mar 2024" },
  { label: "Employee ID", value: "EMP-001", audit: "System-assigned · 01 Mar 2021" },
];

export const PROFILE_SIZES = [
  { label: "T-shirt size", value: "L" },
  { label: "Pants waist", value: "34 in" },
  { label: "Pants length / inseam", value: "31 in" },
  { label: "Shoe size", value: "10 (PH/US)" },
  { label: "Fit / sizing notes", value: "Prefers relaxed fit tees" },
  { label: "Last updated", value: "18 Jun 2026" },
];

export const PROFILE_STATS = [
  { label: "Shoots delivered", value: "23" },
  { label: "Active bookings", value: "6" },
  { label: "Avg rating", value: "4.9" },
  { label: "On time", value: "96%" },
];

export const EMERGENCY_CONTACTS = [
  {
    name: "Marisol Barrun",
    rel: "Spouse",
    primary: true,
    phone: "+63 918 220 4471",
    alt: "+63 2 8555 0110",
    email: "marisol.b@gmail.com",
    address: "24 Maginhawa St, Sikatuna Village, Quezon City, 1101",
    notes: "Prefers Tagalog · best reached after 6 PM",
    verified: "Verified 02 Jun 2026",
  },
  {
    name: "Rafael Barrun",
    rel: "Sibling",
    primary: false,
    phone: "+63 917 441 2280",
    alt: "—",
    email: "rafa.barrun@gmail.com",
    address: "8 Times St, West Triangle, Quezon City, 1104",
    notes: "English or Tagalog · daytime only",
    verified: "Verified 02 Jun 2026",
  },
].map((c) => ({
  ...c,
  badgeL: c.primary ? "Primary" : "Secondary",
  badgeBg: c.primary ? "#FFF4EE" : "#F1EFEC",
  badgeColor: c.primary ? "#B33800" : "#6E6963",
}));

export const SECURITY_ITEMS = [
  { label: "Password", sub: "Last changed 22 Apr 2026", action: "Change" },
  { label: "Two-factor authentication", sub: "Authenticator app · enabled", action: "Manage" },
  { label: "Recovery email", sub: "sebi.personal@gmail.com", action: "Edit" },
];

export const SECURITY_SESSIONS = [
  { device: "MacBook Pro · Chrome", meta: "Quezon City · this device", current: true },
  { device: "iPhone 15 · Kahel app", meta: "Quezon City · 2 hours ago", current: false },
  { device: "iPad · Safari", meta: "Tagaytay · 3 days ago", current: false },
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

export const PREFERENCES_NOTIFY = [
  { label: "Follow-up queue nudges", sub: "When an account has no next action set", on: true },
  { label: "Booking status changes", sub: "When a booking moves stage", on: true },
  { label: "New feedback replies", sub: "When your reports get a reply on GitLab", on: false },
  { label: "Daily brief", sub: "Your schedule and dues at 7:00 AM", on: true },
  { label: "Sound", sub: "Play a chime for in-app alerts", on: false },
];

// ── Company Policies ─────────────────────────────────────────────────
export type PolicyBlock =
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

// ── Payroll ──────────────────────────────────────────────────────────
function pmoney(n: number) {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const PAYROLL_PRIMARY_KPIS = [
  { label: "Estimated gross pay", value: pmoney(55420), tag: "Estimated" },
  { label: "Total deductions", value: pmoney(7865.5), tag: "Estimated" },
  { label: "Estimated net pay", value: pmoney(47554.5), tag: "Estimated" },
  { label: "Employees included", value: "5", tag: "This run" },
];

export const PAYROLL_SEC_STATS = [
  { label: "Attendance exceptions", value: "3", sub: "2 blocking · 1 non-blocking", accent: "#8A6D00" },
  { label: "Pending approvals", value: "1", sub: "Awaiting super admin", accent: "#8A6D00" },
  { label: "Employer contributions", value: pmoney(6142), sub: "SSS · PhilHealth · Pag-IBIG", accent: "#00575C" },
  { label: "Upcoming payment", value: "31 Jul 2026", sub: "Second cutoff", accent: "#2A1F87" },
];

export const PAYROLL_ATTENTION = [
  { emp: "Ivy Santos", issue: "Missing attendance", detail: "No timesheet for 28–29 Jul", sev: "block", date: "29 Jul", action: "Import timesheet", who: "M. Reyes" },
  { emp: "Danilo Cruz", issue: "Unapproved overtime", detail: "2.0 hrs pending manager approval", sev: "block", date: "27 Jul", action: "Request approval", who: "E. Barrun" },
  { emp: "Josefa Lim", issue: "Duplicate adjustment", detail: "Incentive entered twice", sev: "warn", date: "26 Jul", action: "Review adjustments", who: "M. Reyes" },
].map((a) => ({
  ...a,
  sevBg: a.sev === "block" ? "#FDE4EA" : "#FDF0D5",
  sevColor: a.sev === "block" ? "#8A0625" : "#8A6D00",
  sevLabel: a.sev === "block" ? "Blocking" : "Non-blocking",
  dot: a.sev === "block" ? "#D3163C" : "#C99400",
}));

const PAYROLL_STATUS: Record<string, { bg: string; c: string; label: string }> = {
  draft: { bg: "#F1EFEC", c: "#6E6963", label: "Draft" },
  attreview: { bg: "#FDF0D5", c: "#8A6D00", label: "Attendance review" },
  paid: { bg: "#E0F7EC", c: "#005430", label: "Paid" },
  completed: { bg: "#E0F7EC", c: "#005430", label: "Completed" },
};

export const PAYROLL_RUNS = [
  { ref: "PAY-2026-07-B", period: "16–31 Jul 2026", pay: "31 Jul 2026", emps: "5", gross: pmoney(55420), ded: pmoney(7865.5), net: pmoney(47554.5), st: "attreview", by: "M. Reyes" },
  { ref: "PAY-2026-07-A", period: "1–15 Jul 2026", pay: "15 Jul 2026", emps: "5", gross: pmoney(54980), ded: pmoney(7790), net: pmoney(47190), st: "paid", by: "M. Reyes" },
  { ref: "PAY-2026-06-B", period: "16–30 Jun 2026", pay: "30 Jun 2026", emps: "5", gross: pmoney(54200), ded: pmoney(7710), net: pmoney(46490), st: "completed", by: "M. Reyes" },
  { ref: "PAY-2026-06-OC1", period: "Off-cycle · Jun", pay: "20 Jun 2026", emps: "1", gross: pmoney(3200), ded: pmoney(0), net: pmoney(3200), st: "completed", by: "M. Reyes" },
  { ref: "PAY-2026-06-A", period: "1–15 Jun 2026", pay: "15 Jun 2026", emps: "5", gross: pmoney(53900), ded: pmoney(7680), net: pmoney(46220), st: "completed", by: "M. Reyes" },
].map((r) => ({ ...r, stBg: PAYROLL_STATUS[r.st].bg, stColor: PAYROLL_STATUS[r.st].c, stLabel: PAYROLL_STATUS[r.st].label }));

const EMP_TYPE_TINT: Record<string, { bg: string; c: string }> = {
  "Full time": { bg: "#EDEAFD", c: "#2A1F87" },
  "Part time": { bg: "#E0F7F8", c: "#00575C" },
  Intern: { bg: "#F1EFEC", c: "#6E6963" },
  Freelancer: { bg: "#FFF4EE", c: "#B33800" },
};

export const PAYROLL_EMPLOYEES = [
  { ini: "MR", name: "Marisol Reyes", id: "EMP-002", role: "Studio manager", type: "Full time", basis: "Monthly", rate: "₱35,000/mo", method: "BPI ••4021", ready: true },
  { ini: "DC", name: "Danilo Cruz", id: "EMP-004", role: "Senior editor", type: "Full time", basis: "Monthly", rate: "₱30,000/mo", method: "BDO ••7788", ready: true },
  { ini: "IS", name: "Ivy Santos", id: "EMP-007", role: "Junior photographer", type: "Full time", basis: "Monthly", rate: "₱22,000/mo", method: "GCash ••7712", ready: true },
  { ini: "JL", name: "Josefa Lim", id: "EMP-009", role: "Retouch assistant", type: "Part time", basis: "Hourly", rate: "₱180/hr", method: "Maya ••1150", ready: true },
  { ini: "KT", name: "Kevin Tan", id: "EMP-011", role: "Production intern", type: "Intern", basis: "Allowance", rate: "₱8,000/mo", method: "GCash ••3390", ready: true },
  { ini: "MP", name: "Miguel Padua", id: "FRL-003", role: "Videographer", type: "Freelancer", basis: "Per project", rate: "By statement", method: "Bank ••9921", ready: false },
].map((e) => ({
  ...e,
  tBg: EMP_TYPE_TINT[e.type].bg,
  tColor: EMP_TYPE_TINT[e.type].c,
  readyBg: e.ready ? "#E0F7EC" : "#FDF0D5",
  readyColor: e.ready ? "#005430" : "#8A6D00",
  readyLabel: e.ready ? "Ready" : "Needs setup",
}));

export const PAYROLL_EMPLOYEE_PROFILE = {
  name: "Marisol Reyes",
  id: "EMP-002",
  role: "Studio manager",
  team: "Operations",
  type: "Full time",
  schedule: "Semi-monthly · 5 days/week · 8 hrs",
  rate: "₱35,000.00 / month",
  semi: "₱17,500.00 / cutoff",
  bank: "BPI •••• 4021",
  sss: "34-•••••••-8",
  ph: "12-••••••••-4",
  pag: "1210-••••-••21",
  tin: "284-•••-•••-000",
  earnings: [
    { label: "Basic salary", value: "₱17,500.00 / cutoff" },
    { label: "Communication allowance", value: "₱1,000.00 / cutoff" },
  ],
  deductions: [
    { label: "SSS (EE share)", value: "₱787.50" },
    { label: "PhilHealth (EE share)", value: "₱437.50" },
    { label: "Pag-IBIG (EE share)", value: "₱100.00" },
    { label: "Company loan", value: "₱500.00 · 4 of 10" },
  ],
  history: [
    { prev: "₱30,000.00", next: "₱35,000.00", date: "1 Jan 2026", reason: "Promotion to studio manager" },
    { prev: "₱26,000.00", next: "₱30,000.00", date: "1 Jul 2025", reason: "Annual merit increase" },
  ],
  payslips: [
    { ref: "PS-2026-07-A-002", period: "1–15 Jul 2026", net: "₱15,590.00" },
    { ref: "PS-2026-06-B-002", period: "16–30 Jun 2026", net: "₱15,475.00" },
    { ref: "PS-2026-06-A-002", period: "1–15 Jun 2026", net: "₱15,410.00" },
  ],
};

const ADJ_STATUS: Record<string, { bg: string; c: string }> = {
  applied: { bg: "#E0F7EC", c: "#005430" },
  approved: { bg: "#E0F7EC", c: "#005430" },
  awaiting: { bg: "#FDF0D5", c: "#8A6D00" },
  rejected: { bg: "#FDE4EA", c: "#8A0625" },
  reversed: { bg: "#EDEAFD", c: "#2A1F87" },
};

export const PAYROLL_ADJUSTMENTS = [
  { ref: "ADJ-0142", emp: "Marisol Reyes", kind: "Company loan", dir: "Deduction", amt: "−₱500.00", run: "PAY-2026-07-B", st: "applied", stL: "Applied" },
  { ref: "ADJ-0141", emp: "Danilo Cruz", kind: "Salary advance", dir: "Deduction", amt: "−₱1,000.00", run: "PAY-2026-07-B", st: "applied", stL: "Applied" },
  { ref: "ADJ-0140", emp: "Ivy Santos", kind: "Holiday pay", dir: "Earning", amt: "+₱500.00", run: "PAY-2026-07-B", st: "approved", stL: "Approved" },
  { ref: "ADJ-0139", emp: "Josefa Lim", kind: "Incentive", dir: "Earning", amt: "+₱500.00", run: "PAY-2026-07-B", st: "awaiting", stL: "Awaiting approval" },
  { ref: "ADJ-0138", emp: "Josefa Lim", kind: "Incentive (duplicate)", dir: "Earning", amt: "+₱500.00", run: "PAY-2026-07-B", st: "rejected", stL: "Rejected" },
  { ref: "ADJ-0137", emp: "Danilo Cruz", kind: "Retro pay correction", dir: "Earning", amt: "+₱1,200.00", run: "PAY-2026-06-B", st: "reversed", stL: "Reversed" },
].map((a) => ({ ...a, dirColor: a.dir === "Earning" ? "#005430" : "#8A0625", stBg: ADJ_STATUS[a.st].bg, stColor: ADJ_STATUS[a.st].c }));

const PS_STATUS: Record<string, { bg: string; c: string }> = {
  generated: { bg: "#E3EDFF", c: "#053799" },
  published: { bg: "#E0F7EC", c: "#005430" },
  viewed: { bg: "#E0F7EC", c: "#005430" },
  downloaded: { bg: "#E0F7EC", c: "#005430" },
};

export const PAYROLL_PAYSLIPS = [
  { ref: "PS-2026-07-A-002", emp: "Marisol Reyes", period: "1–15 Jul 2026", net: "₱15,590.00", st: "downloaded", stL: "Downloaded" },
  { ref: "PS-2026-07-A-004", emp: "Danilo Cruz", period: "1–15 Jul 2026", net: "₱13,020.00", st: "viewed", stL: "Viewed" },
  { ref: "PS-2026-07-A-007", emp: "Ivy Santos", period: "1–15 Jul 2026", net: "₱10,410.00", st: "published", stL: "Published" },
  { ref: "PS-2026-07-A-009", emp: "Josefa Lim", period: "1–15 Jul 2026", net: "₱4,760.00", st: "generated", stL: "Generated" },
  { ref: "PS-2026-07-A-011", emp: "Kevin Tan", period: "1–15 Jul 2026", net: "₱4,000.00", st: "published", stL: "Published" },
].map((p) => ({ ...p, stBg: PS_STATUS[p.st].bg, stColor: PS_STATUS[p.st].c }));

const CONT_STATUS: Record<string, { bg: string; c: string; l: string }> = {
  ready: { bg: "#E3EDFF", c: "#053799", l: "Ready for review" },
  due: { bg: "#FDF0D5", c: "#8A6D00", l: "Due" },
  scheduled: { bg: "#E3EDFF", c: "#053799", l: "Scheduled" },
  remitted: { bg: "#E0F7EC", c: "#005430", l: "Remitted" },
};

export const PAYROLL_CONTRIB_TABS = [
  { k: "sss", label: "SSS" },
  { k: "philhealth", label: "PhilHealth" },
  { k: "pagibig", label: "Pag-IBIG" },
  { k: "tax", label: "Withholding tax" },
] as const;

export const PAYROLL_CONTRIB_DATA: Record<string, { period: string; ee: string; er: string; total: string; emps: string; due: string; st: string; ref: string }[]> = {
  sss: [
    { period: "Jul 2026", ee: "₱2,182.50", er: "₱4,057.50", total: "₱6,240.00", emps: "4", due: "31 Aug 2026", st: "due", ref: "—" },
    { period: "Jun 2026", ee: "₱2,182.50", er: "₱4,057.50", total: "₱6,240.00", emps: "4", due: "31 Jul 2026", st: "remitted", ref: "SSS-0626-118" },
  ],
  philhealth: [
    { period: "Jul 2026", ee: "₱1,212.50", er: "₱1,212.50", total: "₱2,425.00", emps: "4", due: "20 Aug 2026", st: "ready", ref: "—" },
    { period: "Jun 2026", ee: "₱1,212.50", er: "₱1,212.50", total: "₱2,425.00", emps: "4", due: "20 Jul 2026", st: "remitted", ref: "PH-0626-771" },
  ],
  pagibig: [
    { period: "Jul 2026", ee: "₱400.00", er: "₱400.00", total: "₱800.00", emps: "4", due: "10 Aug 2026", st: "scheduled", ref: "PI-SCHED-08" },
    { period: "Jun 2026", ee: "₱400.00", er: "₱400.00", total: "₱800.00", emps: "4", due: "10 Jul 2026", st: "remitted", ref: "PI-0626-410" },
  ],
  tax: [
    { period: "Jul 2026", ee: "₱2,450.00", er: "—", total: "₱2,450.00", emps: "3", due: "10 Aug 2026", st: "ready", ref: "—" },
    { period: "Jun 2026", ee: "₱2,450.00", er: "—", total: "₱2,450.00", emps: "3", due: "10 Jul 2026", st: "remitted", ref: "BIR-0626-902" },
  ],
};

export function contribStyle(st: string) {
  return CONT_STATUS[st];
}

export const PAYROLL_13TH = [
  { name: "Marisol Reyes", basis: "₱210,000.00", earned: "₱17,500.00", paid: "₱0.00", bal: "₱17,500.00", st: "ready", stL: "Ready" },
  { name: "Danilo Cruz", basis: "₱180,000.00", earned: "₱15,000.00", paid: "₱0.00", bal: "₱15,000.00", st: "ready", stL: "Ready" },
  { name: "Ivy Santos", basis: "₱132,000.00", earned: "₱11,000.00", paid: "₱0.00", bal: "₱11,000.00", st: "ready", stL: "Ready" },
  { name: "Josefa Lim", basis: "₱54,000.00", earned: "₱4,500.00", paid: "₱0.00", bal: "₱4,500.00", st: "review", stL: "Needs review" },
  { name: "Kevin Tan", basis: "—", earned: "—", paid: "—", bal: "—", st: "excluded", stL: "Not eligible" },
].map((r) => {
  const m: Record<string, { bg: string; c: string }> = {
    ready: { bg: "#E3EDFF", c: "#053799" },
    review: { bg: "#FDF0D5", c: "#8A6D00" },
    excluded: { bg: "#F1EFEC", c: "#9B9691" },
  };
  return { ...r, stBg: m[r.st].bg, stColor: m[r.st].c };
});

export const PAYROLL_13TH_TOTALS = { eligible: "4", earned: "₱48,000.00", paid: "₱0.00", bal: "₱48,000.00" };

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

export const PAYROLL_AUDIT = [
  { ev: "Attendance imported", actor: "Marisol Reyes", ref: "PAY-2026-07-B", prev: "—", next: "5 timesheets", reason: "Cutoff close", when: "22 Jul 2026 · 14:20", dot: "#053799" },
  { ev: "Adjustment rejected", actor: "Marisol Reyes", ref: "ADJ-0138", prev: "Awaiting", next: "Rejected", reason: "Duplicate incentive", when: "22 Jul 2026 · 11:05", dot: "#8A0625" },
  { ev: "Salary change approved", actor: "Eusebio Barrun", ref: "EMP-002", prev: "₱30,000.00", next: "₱35,000.00", reason: "Promotion", when: "1 Jan 2026 · 09:00", dot: "#005430" },
  { ev: "Payroll released", actor: "Eusebio Barrun", ref: "PAY-2026-07-A", prev: "Approved", next: "Paid", reason: "Payment confirmed", when: "15 Jul 2026 · 16:02", dot: "#005430" },
  { ev: "Sensitive export", actor: "Eusebio Barrun", ref: "RPT · Gross-to-net", prev: "—", next: "XLSX", reason: "Accountant request", when: "15 Jul 2026 · 16:40", dot: "#2A1F87" },
];

const STATE_TONE: Record<string, { bg: string; c: string }> = {
  blue: { bg: "#E3EDFF", c: "#053799" },
  red: { bg: "#FDE4EA", c: "#8A0625" },
  amber: { bg: "#FDF0D5", c: "#8A6D00" },
  grey: { bg: "#F1EFEC", c: "#6E6963" },
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
  { label: "Draft", bg: "#F1EFEC", c: "#6E6963" },
  { label: "Attendance review", bg: "#FDF0D5", c: "#8A6D00" },
  { label: "Ready to calculate", bg: "#E3EDFF", c: "#053799" },
  { label: "Needs review", bg: "#FDF0D5", c: "#8A6D00" },
  { label: "Awaiting approval", bg: "#FDF0D5", c: "#8A6D00" },
  { label: "Approved", bg: "#E0F7EC", c: "#005430" },
  { label: "Scheduled", bg: "#E3EDFF", c: "#053799" },
  { label: "Partially paid", bg: "#FDF0D5", c: "#8A6D00" },
  { label: "Paid", bg: "#E0F7EC", c: "#005430" },
  { label: "Rejected", bg: "#FDE4EA", c: "#8A0625" },
  { label: "Cancelled", bg: "#F1EFEC", c: "#9B9691" },
];
