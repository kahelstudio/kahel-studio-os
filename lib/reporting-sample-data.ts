export const REPORTING_PERIOD = {
  label: "1–31 Jul 2026",
  comparison: "1–30 Jun 2026",
  updated: "25 Jul 2026, 10:18 PM GST",
  business: "Kahel Studio",
  location: "Zone 1, Cobo, Tabaco City, Albay",
  currency: "PHP",
  dataStatus: "Sample data",
};

export const REPORTING_OVERVIEW = {
  grossSales: "₱260,250",
  discounts: "₱7,500",
  refunds: "₱4,000",
  netRevenue: "₱248,750",
  expenses: "₱96,450",
  operatingProfit: "₱152,300",
  outstandingBalance: "₱67,300",
  paymentsReceived: "₱181,450",
  totalBookings: "28",
  confirmedBookings: "22",
  activeProjects: "14",
  completedProjects: "6",
  averageBookingValue: "₱8,884",
  bookingConversion: "78.6%",
  completionRate: "85.7%",
  newClients: "18",
  returningRate: "42%",
  salesTarget: 250000,
  salesTargetProgress: 99.5,
};

export const REPORTING_SERVICE_REVENUE = [
  { service: "Studio portraits", transactions: "12", gross: "₱48,500", discounts: "₱2,000", refunds: "₱1,000", net: "₱45,500" },
  { service: "Events and weddings", transactions: "4", gross: "₱92,000", discounts: "₱1,500", refunds: "₱0", net: "₱90,500" },
  { service: "Food and commercial", transactions: "5", gross: "₱61,000", discounts: "₱2,000", refunds: "₱0", net: "₱59,000" },
  { service: "Corporate photo and video", transactions: "3", gross: "₱42,000", discounts: "₱1,500", refunds: "₱3,000", net: "₱37,500" },
  { service: "Equipment rental", transactions: "4", gross: "₱16,750", discounts: "₱500", refunds: "₱0", net: "₱16,250" },
];

export const REPORTING_EXPENSES = [
  { category: "Payroll", amount: "₱44,000" },
  { category: "Freelancers and contractors", amount: "₱12,500" },
  { category: "Equipment and supplies", amount: "₱10,850" },
  { category: "Rent and utilities", amount: "₱9,600" },
  { category: "Software and subscriptions", amount: "₱8,460" },
  { category: "Transportation", amount: "₱4,800" },
  { category: "Marketing", amount: "₱3,240" },
  { category: "Repairs and maintenance", amount: "₱3,000" },
];

export const REPORTING_BOOKINGS = [
  { status: "Requested", count: "2" }, { status: "Booked", count: "1" }, { status: "Confirmed", count: "22" },
  { status: "Rescheduled", count: "1" }, { status: "Cancelled", count: "1" }, { status: "No-show", count: "1" },
];

export const REPORTING_PROJECTS = [
  { ref: "KS-2026-0142", client: "Amma's Bistro", stage: "Pre-production", status: "Shot list", progress: "30%", due: "Aug 2" },
  { ref: "KS-2026-0145", client: "Bicol Medical Center", stage: "Pre-production", status: "Awaiting client approval", progress: "40%", due: "Aug 5" },
  { ref: "KS-2026-0138", client: "Cafe Basilio", stage: "Production", status: "In production", progress: "50%", due: "Jul 28" },
  { ref: "KS-2026-0139", client: "Santos wedding", stage: "Production", status: "In production", progress: "45%", due: "Aug 3" },
  { ref: "KS-2026-0126", client: "Sea & Smoke", stage: "Post-production", status: "Photo editing", progress: "75%", due: "Jul 27" },
  { ref: "KS-2026-0129", client: "Kapihan", stage: "Post-production", status: "Video editing", progress: "60%", due: "Jul 28" },
  { ref: "KS-2026-0132", client: "Cruz family", stage: "Post-production", status: "Client review", progress: "90%", due: "Jul 26" },
  { ref: "KS-2026-0135", client: "Pacific Construction", stage: "Post-production", status: "Ready for delivery", progress: "100%", due: "Jul 25" },
];

export const REPORTING_STORAGE = {
  used: "684 GB",
  limit: "1 TB",
  percentage: "68.4%",
  filesUploaded: "2,486",
  archived: "38 GB",
  categories: [
    { name: "Project photos", value: "298 GB" }, { name: "Project videos", value: "241 GB" }, { name: "Client deliverables", value: "72 GB" },
    { name: "Audio files", value: "18 GB" }, { name: "Documents and reports", value: "14 GB" }, { name: "Design files", value: "23 GB" }, { name: "Backups", value: "18 GB" },
  ],
};

export const REPORTING_DETAIL_ROWS = [
  { ref: "INV-2026-0731", description: "Santos wedding coverage", method: "Bank transfer", date: "25 Jul 2026", amount: "₱42,000.00" },
  { ref: "INV-2026-0724", description: "Amma's Bistro content retainer", method: "GCash", date: "24 Jul 2026", amount: "₱28,000.00" },
  { ref: "INV-2026-0720", description: "Bicol Medical Center interview", method: "PayMongo", date: "20 Jul 2026", amount: "₱24,000.00" },
  { ref: "INV-2026-0718", description: "Kapihan social content", method: "Maya", date: "18 Jul 2026", amount: "₱20,000.00" },
  { ref: "INV-2026-0712", description: "Cafe Basilio monthly content", method: "Cash", date: "12 Jul 2026", amount: "₱18,500.00" },
];
