import "server-only";

import { getSupabaseAdmin, getSupabaseAuthClient } from "./supabase-admin";
import type { StaffPrincipal } from "./staff-auth";

const PROGRAM_CODE = "kahel-loyalty";

type ProgramRow = { id: string; name: string; active: boolean; threshold: number; launch_date: string };
type RewardRow = { id: string; sequence: number; status: string; issued_at: string; reserved_at: string | null; redeemed_at: string | null; voided_at: string | null; review_required: boolean; review_reason: string | null };
type BookingHistoryRow = { id: string; reference: string; service_type: string; completed_at: string | null; service_date: string; reward_id?: string | null; status?: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function program() {
  const { data, error } = await getSupabaseAdmin().from("loyalty_programs")
    .select("id,name,active,threshold,launch_date").eq("code", PROGRAM_CODE).single<ProgramRow>();
  if (error) throw error;
  return data;
}

export async function resolveClientId(clientRef: string) {
  const query = getSupabaseAdmin().from("clients").select("id");
  const { data, error } = await (isUuid(clientRef) ? query.eq("id", clientRef) : query.eq("external_ref", clientRef)).maybeSingle<{ id: string }>();
  if (error) throw error;
  return data?.id ?? null;
}

export async function resolveProjectClientId(projectRef: string) {
  const { data, error } = await getSupabaseAdmin().from("projects").select("client_id").eq("reference", projectRef).maybeSingle<{ client_id: string }>();
  if (error) throw error;
  return data?.client_id ?? null;
}

export async function getLoyaltySummary(clientId: string) {
  const p = await program();
  const admin = getSupabaseAdmin();
  const [eventsResult, rewardsResult, eligibilityResult, termsResult] = await Promise.all([
    admin.from("loyalty_booking_events").select("delta").eq("client_id", clientId).eq("program_id", p.id),
    admin.from("loyalty_rewards").select("id,sequence,status,issued_at,reserved_at,redeemed_at,voided_at,review_required,review_reason").eq("client_id", clientId).eq("program_id", p.id).order("sequence", { ascending: false }),
    admin.from("loyalty_booking_eligibility").select("booking_id").eq("client_id", clientId).eq("program_id", p.id).eq("contribution", 1).order("evaluated_at", { ascending: false }),
    admin.from("loyalty_terms_versions").select("version,effective_at").eq("program_id", p.id).order("version", { ascending: false }).limit(1).maybeSingle<{ version: number; effective_at: string }>(),
  ]);
  const error = eventsResult.error ?? rewardsResult.error ?? eligibilityResult.error ?? termsResult.error;
  if (error) throw error;
  const eligibleCount = Math.max(0, (eventsResult.data ?? []).reduce((sum, event) => sum + event.delta, 0));
  const rewards = (rewardsResult.data ?? []) as RewardRow[];
  const bookingIds = (eligibilityResult.data ?? []).map((row) => row.booking_id);
  let bookings: BookingHistoryRow[] = [];
  if (bookingIds.length) {
    const result = await admin.from("bookings").select("id,reference,service_type,completed_at,service_date").in("id", bookingIds).order("completed_at", { ascending: false });
    if (result.error) throw result.error;
    bookings = result.data as BookingHistoryRow[];
  }
  const available = rewards.filter((reward) => reward.status === "available" && !reward.review_required).length;
  const cycleProgress = eligibleCount % p.threshold;
  return {
    programTitle: "Solo Session Reward",
    active: p.active,
    threshold: p.threshold,
    eligibleCount,
    cycleProgress,
    remaining: p.threshold - cycleProgress,
    available,
    reserved: rewards.filter((reward) => reward.status === "reserved").length,
    redeemed: rewards.filter((reward) => reward.status === "redeemed").length,
    lifetime: rewards.length,
    eligibleBookingHistory: bookings.map((booking) => ({ id: booking.id, bookingRef: booking.reference, title: booking.service_type, bookedAt: booking.completed_at ?? booking.service_date })),
    rewardsHistory: rewards.map((reward) => ({
      id: reward.id,
      title: `Complimentary Solo Session #${reward.sequence}`,
      status: reward.status,
      date: reward.redeemed_at ?? reward.reserved_at ?? reward.voided_at ?? reward.issued_at,
    })),
    termsVersion: String(termsResult.data?.version ?? 1),
    termsEffectiveDate: termsResult.data?.effective_at ?? `${p.launch_date}T00:00:00+08:00`,
    termsUrl: "/portal/loyalty/terms",
    bookingUrl: "/?view=book",
    redeemUrl: "/portal/loyalty/redeem",
  };
}

export async function getLoyaltyAdmin(clientRef: string) {
  const clientId = await resolveClientId(clientRef);
  if (!clientId) return null;
  const admin = getSupabaseAdmin();
  const summary = await getLoyaltySummary(clientId);
  const [clientResult, excludedResult, rewardBookingsResult, emailsResult, auditResult] = await Promise.all([
    admin.from("clients").select("id,name,external_ref").eq("id", clientId).single(),
    admin.from("bookings").select("id,reference,service_type,loyalty_exclusion_reason,loyalty_excluded_at").eq("client_id", clientId).not("loyalty_excluded_at", "is", null).order("loyalty_excluded_at", { ascending: false }),
    admin.from("bookings").select("id,reference,status,service_date,reward_id").eq("client_id", clientId).not("reward_id", "is", null).order("created_at", { ascending: false }),
    admin.from("loyalty_email_outbox").select("id,reward_id,status,attempts,sent_at,last_error,created_at,updated_at").eq("client_id", clientId).order("created_at", { ascending: false }),
    admin.from("loyalty_audit_log").select("id,action,reason,previous_data,new_data,created_at,actor_user_id").eq("entity_id", clientId).order("created_at", { ascending: false }).limit(100),
  ]);
  const error = clientResult.error ?? excludedResult.error ?? rewardBookingsResult.error ?? emailsResult.error ?? auditResult.error;
  if (error) throw error;
  return {
    linked: true,
    client: clientResult.data,
    loyaltyAccount: { clientId },
    summary: { ...summary, eligibleTarget: summary.threshold },
    excludedBookings: (excludedResult.data ?? []).map((row) => ({ id: row.id, bookingRef: row.reference, service: row.service_type, excludedAt: row.loyalty_excluded_at, reason: row.loyalty_exclusion_reason })),
    rewardBookings: (rewardBookingsResult.data ?? []).map((row) => ({ id: row.reward_id, bookingId: row.id, bookingRef: row.reference, status: row.status, date: row.service_date })),
    emailStatuses: (emailsResult.data ?? []).map((row) => ({ id: row.id, type: "Reward earned", status: row.status, attempts: row.attempts, sentAt: row.sent_at, createdAt: row.created_at, error: row.last_error })),
    termsVersion: summary.termsVersion,
    activity: (auditResult.data ?? []).map((row) => ({ id: String(row.id), action: row.action, reason: row.reason, previous: JSON.stringify(row.previous_data), new: JSON.stringify(row.new_data), createdAt: row.created_at, actor: row.actor_user_id ?? "System" })),
  };
}

function requirePermission(principal: StaffPrincipal, permission: string) {
  if (!principal.permissions.includes(permission)) throw new Error("Forbidden");
  if (!principal.accessToken) throw new Error("Staff authentication must be enabled for loyalty changes.");
  return getSupabaseAuthClient(principal.accessToken);
}

export async function performLoyaltyAdminAction(principal: StaffPrincipal, clientRef: string, input: { action: string; targetId?: string; value?: number; reason: string }) {
  const clientId = await resolveClientId(clientRef);
  if (!clientId) throw new Error("Client not found.");
  const reason = input.reason?.trim();
  if (!reason) throw new Error("A reason is required.");
  const targetId = input.targetId;
  if (input.action === "issue") {
    const db = requirePermission(principal, "loyalty.issue");
    const quantity = Math.max(1, Math.min(20, Math.trunc(input.value ?? 1)));
    for (let index = 0; index < quantity; index += 1) {
      const { error } = await db.rpc("loyalty_issue_manual_reward", { requested_client_id: clientId, reason });
      if (error) throw error;
    }
    return;
  }
  if (input.action === "correct_progress") {
    const db = requirePermission(principal, "loyalty.correct_progress");
    if (!Number.isInteger(input.value) || (input.value ?? -1) < 0) throw new Error("A valid eligible booking count is required.");
    const { error } = await db.rpc("loyalty_correct_progress", { requested_client_id: clientId, requested_eligible_count: input.value!, reason });
    if (error) throw error;
    return;
  }
  if (["exclude_booking", "restore_booking"].includes(input.action)) {
    const permission = input.action === "exclude_booking" ? "loyalty.exclude_booking" : "loyalty.restore_booking";
    const db = requirePermission(principal, permission);
    if (!targetId) throw new Error("Booking is required.");
    const { error } = await db.rpc("loyalty_set_booking_exclusion", { requested_booking_id: targetId, excluded: input.action === "exclude_booking", reason });
    if (error) throw error;
    return;
  }
  if (["cancel_reward", "reinstate_reward", "redeem_reward"].includes(input.action)) {
    const permission = `loyalty.${input.action}`;
    const db = requirePermission(principal, permission);
    if (!targetId) throw new Error("Reward is required.");
    const requestedStatus = input.action === "cancel_reward" ? "cancelled" : input.action === "reinstate_reward" ? "available" : "redeemed";
    const { error } = await db.rpc("loyalty_transition_reward", { requested_reward_id: targetId, requested_status: requestedStatus, reason });
    if (error) throw error;
    return;
  }
  if (input.action === "resend") {
    requirePermission(principal, "loyalty.resend");
    if (!targetId) throw new Error("Email is required.");
    const { error } = await getSupabaseAdmin().from("loyalty_email_outbox").update({ status: "pending", available_at: new Date().toISOString(), last_error: null }).eq("id", targetId).neq("status", "processing");
    if (error) throw error;
    await processLoyaltyRewardEmail(targetId);
    return;
  }
  throw new Error("Unsupported loyalty action.");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export async function processLoyaltyRewardEmail(outboxId?: string) {
  const admin = getSupabaseAdmin();
  const { data: claimed, error: claimError } = await admin.rpc("loyalty_claim_email", { requested_outbox_id: outboxId ?? null });
  if (claimError) throw claimError;
  if (!claimed) return { processed: false };
  try {
    const [profileResult, rewardResult] = await Promise.all([
      admin.from("client_profiles").select("email,first_name").eq("client_id", claimed.client_id).eq("status", "active").order("created_at").limit(1).single<{ email: string; first_name: string }>(),
      admin.from("loyalty_rewards").select("status,sequence").eq("id", claimed.reward_id).single<{ status: string; sequence: number }>(),
    ]);
    if (profileResult.error || rewardResult.error) throw profileResult.error ?? rewardResult.error;
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.LOYALTY_EMAIL_FROM ?? process.env.BOOKING_EMAIL_FROM;
    const siteUrl = process.env.PUBLIC_SITE_URL;
    if (!apiKey || !from || !siteUrl) throw new Error("Resend loyalty email is not configured.");
    const firstName = profileResult.data.first_name;
    const portalUrl = new URL("/portal/loyalty", siteUrl).toString();
    const termsUrl = new URL("/portal/loyalty/terms", siteUrl).toString();
    const safeName = escapeHtml(firstName);
    const safePortal = escapeHtml(portalUrl);
    const safeTerms = escapeHtml(termsUrl);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `loyalty-reward-${claimed.reward_id}` },
      body: JSON.stringify({
        from,
        to: [profileResult.data.email],
        reply_to: process.env.BOOKING_EMAIL_REPLY_TO ?? undefined,
        subject: "You earned a complimentary Solo Session",
        html: `<div style="margin:0;background:#f5f3ef;padding:24px 12px;font:16px/1.6 Arial,sans-serif;color:#1d1d1f"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #dedbd5"><div style="padding:24px 28px;background:#171717;color:#fff;font-size:20px;font-weight:700">KAHEL STUDIO</div><div style="padding:28px"><h1 style="margin:0 0 16px;font-size:28px;line-height:1.15">Your free Solo Session is ready</h1><p>Hi ${safeName},</p><p>You completed eight eligible bookings and earned a complimentary Solo Session.</p><p><strong>Status:</strong> ${escapeHtml(rewardResult.data.status)}</p><p><a href="${safePortal}" style="display:inline-block;margin:12px 0;padding:13px 22px;background:#FF5300;color:#fff;text-decoration:none;font-weight:700">Book your free session</a></p><p>The reward covers the approved standard Solo Session only. Upgrades, add-ons, prints, extra edits, and unrelated fees remain chargeable. Rewards are account-linked, non-transferable, and subject to availability.</p><p><a href="${safeTerms}" style="color:#b33800">View complete terms and conditions</a></p><p>Questions? Reply to this email.</p></div></div></div>`,
        text: `Your free Solo Session is ready\n\nHi ${firstName},\n\nYou completed eight eligible bookings and earned a complimentary Solo Session.\nStatus: ${rewardResult.data.status}\n\nBook your free session: ${portalUrl}\n\nThe reward covers the approved standard Solo Session only. Upgrades, add-ons, prints, extra edits, and unrelated fees remain chargeable. Rewards are account-linked, non-transferable, and subject to availability.\n\nTerms: ${termsUrl}\nQuestions? Reply to this email.`,
      }),
    });
    const result = await response.json() as { id?: string; message?: string };
    if (!response.ok || !result.id) throw new Error(result.message ?? `Resend returned ${response.status}.`);
    await admin.rpc("loyalty_finish_email", { requested_outbox_id: claimed.id, succeeded: true, provider_id: result.id, failure: null });
    return { processed: true, sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown loyalty email failure.";
    await admin.rpc("loyalty_finish_email", { requested_outbox_id: claimed.id, succeeded: false, provider_id: null, failure: message });
    return { processed: true, sent: false };
  }
}

export async function createRewardBooking(input: { clientId: string; profileId: string; rewardId: string; date: string; time: string; location: string; idempotencyKey: string }) {
  const reference = `KS-LOY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const { data, error } = await getSupabaseAdmin().rpc("loyalty_create_reward_booking", {
    requested_client_id: input.clientId,
    requested_profile_id: input.profileId,
    requested_reward_id: input.rewardId,
    requested_idempotency_key: input.idempotencyKey,
    requested_reference: reference,
    requested_date: input.date,
    requested_time: input.time,
    requested_location: input.location,
  });
  if (error) throw error;
  return data;
}
