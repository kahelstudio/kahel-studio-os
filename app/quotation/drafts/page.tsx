import { getQuotations } from "@/lib/server/quotation-data";
import { QuotationTable } from "@/components/quotation/quotation-table";

export default async function Page() {
  const rows = await getQuotations("draft");
  return <QuotationTable rows={rows} draftsOnly />;
}
