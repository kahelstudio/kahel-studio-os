import { BookingTermsAdmin } from "@/components/legal/booking-terms-admin";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const dynamic = "force-dynamic";

export default async function BookingTermsSettingsPage() {
  const result = await getSupabaseAdmin().from("legal_document_versions").select("id,version_number,version_label,title,effective_date,state,content_hash,change_summary,published_at,updated_at,content,legal_documents!inner(document_key)").eq("legal_documents.document_key", "booking_terms").order("version_number", { ascending: false });
  return <main className="page-shell"><header className="page-header"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#FF5300]">Settings · Legal and policies</p><h1 className="page-title mt-2">Booking terms</h1><p className="page-subtitle">Draft, review, approve, publish, and preserve customer booking terms.</p></div></header><BookingTermsAdmin initialVersions={(result.data ?? []) as never[]} /></main>;
}
