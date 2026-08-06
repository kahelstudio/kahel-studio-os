import { ContributionsClient } from "./contributions-client";
import { getPayrollContributions } from "@/lib/server/payroll-data";

export default async function PayrollContributionsPage() {
  const contributions = await getPayrollContributions();

  return <ContributionsClient contributions={contributions} />;
}
