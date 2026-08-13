export const MESSAGE_STATUSES = ["all", "queued", "processing", "provider_accepted", "sent", "deferred", "delivered", "failed", "bounced", "complained", "suppressed", "cancelled"] as const;
export const MESSAGE_DATE_FILTERS = ["all", "today", "7d", "30d"] as const;
export const FAILED_DEFERRED_THRESHOLD_MS = 30 * 60 * 1000;

export type MessageStatusFilter = (typeof MESSAGE_STATUSES)[number];
export type MessageFilters = {
  query: string;
  status: MessageStatusFilter;
  date: (typeof MESSAGE_DATE_FILTERS)[number];
  template: string;
  module: string;
  environment: string;
  trigger: string;
  source: string;
  provider: string;
  retry: string;
  from: string;
  to: string;
};
export type MessagePermissionContext = { role: "super_admin" | "admin" | "staff"; permissions: string[] };

export function canAccessMessages(principal: MessagePermissionContext) {
  return principal.role === "admin" || principal.role === "super_admin" || principal.permissions.some((permission) => ["bookings.manage", "galleries.read", "loyalty.read"].includes(permission));
}

export type MessageAudit = { id: string; actor: string; event: string; occurredAt: string; detail: string | null };
export type TransactionalMessage = {
  id: string;
  templateId: string | null;
  templateVersionId: string | null;
  templateVersion: number | null;
  templateKey: string;
  recipient: string;
  recipientName: string | null;
  clientName: string | null;
  subject: string;
  status: string;
  environment: string;
  provider: string;
  providerMessageId: string | null;
  trigger: string;
  source: string;
  sourceReference: string | null;
  module: string;
  createdAt: string;
  queuedAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  nextAttemptAt: string | null;
  htmlBody: string | null;
  textBody: string | null;
  containsSecureContent: boolean;
  contentRedacted: boolean;
  lastErrorCode: string | null;
  lastError: string | null;
  retryEligible: boolean;
  attemptCount: number;
  maxAttempts: number;
  actor: string | null;
  parentMessageId: string | null;
  resendSequence: number;
  clientId: string | null;
  bookingId: string | null;
  bookingReference: string | null;
  invoiceId: string | null;
  invoiceReference: string | null;
  paymentId: string | null;
  paymentReference: string | null;
  projectId: string | null;
  projectReference: string | null;
  galleryId: string | null;
  galleryReference: string | null;
  attempts: MessageAttempt[];
  events: MessageEvent[];
  resendHistory: MessageResend[];
  audit: MessageAudit[];
};

export type MessageAttempt = { id: string; messageId: string; number: number | null; status: string; provider: string | null; providerMessageId: string | null; errorCode: string | null; error: string | null; retryable: boolean; actor: string | null; attemptedAt: string; finishedAt: string | null };
export type MessageEvent = { id: string; messageId: string; type: string; status: string | null; occurredAt: string; receivedAt: string | null; providerMessageId: string | null; detail: string | null };
export type MessageResend = { id: string; status: string; sequence: number; createdAt: string; actor: string | null; reason: string | null };

export function parseMessageFilters(input: Record<string, string | string[] | undefined>, forcedStatus?: MessageStatusFilter): MessageFilters {
  const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const statusValue = forcedStatus ?? one(input.status).toLowerCase();
  const date = one(input.date).toLowerCase();
  return {
    query: (one(input.search) || one(input.q)).trim().slice(0, 200),
    status: MESSAGE_STATUSES.includes(statusValue as MessageStatusFilter) ? statusValue as MessageStatusFilter : "all",
    date: MESSAGE_DATE_FILTERS.includes(date as MessageFilters["date"]) ? date as MessageFilters["date"] : "all",
    template: one(input.template).trim().slice(0, 100),
    module: one(input.module).trim().toLowerCase().slice(0, 100),
    environment: one(input.environment).trim().toLowerCase().slice(0, 50),
    trigger: one(input.trigger).trim().toLowerCase().slice(0, 120),
    source: one(input.source).trim().toLowerCase().slice(0, 50),
    provider: one(input.provider).trim().toLowerCase().slice(0, 50),
    retry: ["eligible", "ineligible"].includes(one(input.retry).toLowerCase()) ? one(input.retry).toLowerCase() : "",
    from: validDate(one(input.from)),
    to: validDate(one(input.to)),
  };
}

function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""; }
function manilaDate(value: string) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)); }

export function canReadMessage(message: TransactionalMessage, principal: MessagePermissionContext) {
  if (principal.role === "admin" || principal.role === "super_admin") return true;
  if ((message.bookingId || message.invoiceId || message.paymentId || message.clientId) && principal.permissions.includes("bookings.manage")) return true;
  if ((message.galleryId || message.projectId) && principal.permissions.includes("galleries.read")) return true;
  return message.templateKey.startsWith("loyalty") && principal.permissions.includes("loyalty.read");
}

export function isFailedMessage(message: TransactionalMessage, now = new Date()) {
  if (["failed", "bounced", "complained", "suppressed"].includes(message.status)) return true;
  return message.status === "deferred" && now.getTime() - new Date(message.updatedAt).getTime() >= FAILED_DEFERRED_THRESHOLD_MS;
}

export function canRetryMessage(message: TransactionalMessage) {
  return message.status === "failed" && message.retryEligible && !message.containsSecureContent && !message.contentRedacted && message.attemptCount < message.maxAttempts;
}

export function filterMessages(messages: TransactionalMessage[], filters: MessageFilters, now = new Date()) {
  const query = filters.query.toLocaleLowerCase();
  const today = manilaDate(now.toISOString());
  const relativeStart = filters.date === "7d" || filters.date === "30d" ? new Date(now.getTime() - (filters.date === "7d" ? 7 : 30) * 86400000) : null;
  return messages.filter((message) => {
    if (filters.status !== "all" && message.status !== filters.status) return false;
    if (filters.template && message.templateKey !== filters.template && message.templateId !== filters.template) return false;
    if (filters.module && message.module !== filters.module) return false;
    if (filters.environment && message.environment !== filters.environment) return false;
    if (filters.trigger && message.trigger !== filters.trigger) return false;
    if (filters.source && message.source !== filters.source) return false;
    if (filters.provider && message.provider !== filters.provider) return false;
    if (filters.retry === "eligible" && !canRetryMessage(message)) return false;
    if (filters.retry === "ineligible" && canRetryMessage(message)) return false;
    const date = manilaDate(message.createdAt);
    if (filters.date === "today" && date !== today) return false;
    if (relativeStart && new Date(message.createdAt) < relativeStart) return false;
    if (filters.from && date < filters.from) return false;
    if (filters.to && date > filters.to) return false;
    if (!query) return true;
    return [message.id, message.clientName, message.recipient, message.recipientName, message.subject, message.templateKey, message.providerMessageId, message.sourceReference, message.bookingReference, message.invoiceReference, message.paymentReference, message.projectReference, message.galleryReference]
      .some((value) => value?.toLocaleLowerCase().includes(query));
  });
}

export function messageSummary(messages: TransactionalMessage[], now = new Date()) {
  const today = manilaDate(now.toISOString());
  return {
    sentToday: messages.filter((item) => item.sentAt && manilaDate(item.sentAt) === today).length,
    delivered: messages.filter((item) => item.status === "delivered").length,
    pending: messages.filter((item) => ["queued", "processing", "provider_accepted", "sent", "deferred"].includes(item.status)).length,
    failed: messages.filter((item) => isFailedMessage(item, now)).length,
  };
}

export function sanitizeSafeError(value: string | null) {
  if (!value) return null;
  return value.replace(/(?:bearer\s+)?[A-Za-z0-9_-]{32,}/gi, "[redacted]").replace(/[\r\n\t]+/g, " ").trim().slice(0, 500) || null;
}

export function sanitizeEmailPreview(html: string) {
  let safe = html
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<(script|iframe|object|embed|form|input|button|video|audio|source|link|meta|base)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|iframe|object|embed|form|input|button|video|audio|source|link|meta|base)\b[^>]*\/?\s*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:srcdoc|nonce|integrity)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src|poster|background)\s*=\s*(["'])([\s\S]*?)\2/gi, (_match, attribute: string, quote: string, value: string) => {
      const normalized = value.trim().replace(/&colon;/gi, ":");
      if (attribute.toLowerCase() === "href") return ` href="#" data-masked-link="true" aria-label="External link blocked in preview"`;
      return /^(?:data:image\/(?:png|gif|jpe?g|webp);base64,)/i.test(normalized) ? ` ${attribute}=${quote}${normalized}${quote}` : ` data-blocked-${attribute}="remote-resource"`;
    })
    .replace(/url\s*\(\s*(['"]?)(?!data:)[^)]+\1\s*\)/gi, "none");
  const policy = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src 'none'; media-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
  safe = `<meta http-equiv="Content-Security-Policy" content="${policy}"><style>html{color-scheme:light}body{margin:0;overflow-wrap:anywhere}a[data-masked-link]{cursor:not-allowed;text-decoration:line-through}</style>${safe}`;
  return safe;
}
