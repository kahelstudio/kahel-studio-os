import "server-only";

import { createHash } from "node:crypto";
import type { Json } from "./supabase-database";
import { getSupabaseAdmin } from "./supabase-admin";
import { parseBookingTermsContent, type PublishedBookingTerms } from "@/lib/legal-documents";

type VersionRow = {
  id: string;
  version_number: number;
  version_label: string;
  title: string;
  summary: Json;
  effective_date: string | null;
  published_at: string | null;
  updated_at: string;
  content_hash: string;
  content: Json;
  state: string;
};

export async function getCurrentBookingTerms(): Promise<PublishedBookingTerms | null> {
  const today = new Date().toISOString().slice(0, 10);
  const document = await getSupabaseAdmin().from("legal_documents").select("id").eq("document_key", "booking_terms").maybeSingle<{ id: string }>();
  if (document.error || !document.data) return null;
  const result = await getSupabaseAdmin().from("legal_document_versions")
    .select("id,version_number,version_label,title,summary,effective_date,published_at,updated_at,content_hash,content,state")
    .eq("legal_document_id", document.data.id).eq("state", "published").lte("effective_date", today).maybeSingle<VersionRow>();
  if (result.error || !result.data?.effective_date || !result.data.published_at) return null;
  const content = parseBookingTermsContent(result.data.content);
  if (!content || !content.sections.length) return null;
  return {
    id: result.data.id,
    versionNumber: result.data.version_number,
    versionLabel: result.data.version_label,
    title: result.data.title,
    summary: content.summary,
    effectiveDate: result.data.effective_date,
    publishedAt: result.data.published_at,
    updatedAt: result.data.updated_at,
    contentHash: result.data.content_hash,
    sections: content.sections,
  };
}

export async function getBookingTermsVersion(versionId: string, includeUnpublished = false) {
  let query = getSupabaseAdmin().from("legal_document_versions")
    .select("id,version_number,version_label,title,summary,effective_date,published_at,updated_at,content_hash,content,state")
    .eq("id", versionId);
  if (!includeUnpublished) query = query.in("state", ["published", "superseded", "withdrawn"]);
  const result = await query.maybeSingle<VersionRow>();
  if (result.error || !result.data) return null;
  const content = parseBookingTermsContent(result.data.content);
  return content ? { ...result.data, parsedContent: content } : null;
}

export function hashBookingSummary(summary: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(summary)).digest("hex");
}

export async function getBookingAgreement(bookingId: string, clientId?: string) {
  let query = getSupabaseAdmin().from("agreement_acceptances")
    .select("id,booking_id,client_id,legal_document_version_id,version_number,document_hash,accepted_at,method,source,locale,booking_summary,booking_summary_hash")
    .eq("booking_id", bookingId).order("accepted_at", { ascending: false }).limit(1);
  if (clientId) query = query.eq("client_id", clientId);
  const acceptance = await query.maybeSingle();
  if (acceptance.error || !acceptance.data) return null;
  const version = await getBookingTermsVersion(acceptance.data.legal_document_version_id);
  return version ? { acceptance: acceptance.data, version } : null;
}

export async function listClientAgreements(clientId: string) {
  const result = await getSupabaseAdmin().from("agreement_acceptances")
    .select("id,booking_id,legal_document_version_id,version_number,document_hash,accepted_at,method,source,locale,booking_summary,booking_summary_hash")
    .eq("client_id", clientId).order("accepted_at", { ascending: false });
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function getClientAgreement(acceptanceId: string, clientId: string) {
  const result = await getSupabaseAdmin().from("agreement_acceptances")
    .select("id,booking_id,client_id,legal_document_version_id,version_number,document_hash,accepted_at,method,source,locale,booking_summary,booking_summary_hash")
    .eq("id", acceptanceId).eq("client_id", clientId).maybeSingle();
  if (result.error || !result.data) return null;
  const version = await getBookingTermsVersion(result.data.legal_document_version_id);
  return version ? { acceptance: result.data, version } : null;
}
