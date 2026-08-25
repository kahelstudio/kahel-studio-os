import { notFound } from "next/navigation";
import { LegalDocument } from "@/components/legal/legal-document";
import { PrintLegalDocument } from "@/components/legal/print-legal-document";
import { requireCustomerIdentity } from "@/lib/server/customer-auth";
import { getClientAgreement } from "@/lib/server/legal-documents";

export const dynamic = "force-dynamic";

export default async function PortalAgreementPage({ params }: { params: Promise<{ acceptanceId: string }> }) {
  const { acceptanceId } = await params;
  const identity = await requireCustomerIdentity(`/portal/agreements/${acceptanceId}`);
  const agreement = await getClientAgreement(acceptanceId, identity.clientId);
  if (!agreement || !agreement.version.effective_date || !agreement.version.published_at) notFound();
  const terms = { id: agreement.version.id, versionNumber: agreement.version.version_number, versionLabel: agreement.version.version_label, title: agreement.version.title, summary: agreement.version.parsedContent.summary, effectiveDate: agreement.version.effective_date, publishedAt: agreement.version.published_at, updatedAt: agreement.version.updated_at, contentHash: agreement.version.content_hash, sections: agreement.version.parsedContent.sections };
  return <main className="bg-canvas text-text-primary"><div className="mx-auto flex max-w-6xl justify-end px-4 pt-6 sm:px-6"><PrintLegalDocument /></div><LegalDocument terms={terms} acceptedAt={agreement.acceptance.accepted_at} /></main>;
}
