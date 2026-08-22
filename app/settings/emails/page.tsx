import { redirect } from "next/navigation";
import { EmailTemplatesWorkspace } from "@/components/messages/email-templates-workspace";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";
import { canAccessMessages } from "@/lib/messages";
import { getEmailTemplates } from "@/lib/server/messages-data";

export default async function SettingsEmailsPage() {
  const principal = await getCurrentStaffPrincipal();
  if (!principal) redirect("/login");
  if (!canAccessMessages(principal)) redirect("/settings/general");
  return <EmailTemplatesWorkspace result={await getEmailTemplates()} canManage={["admin", "super_admin"].includes(principal.role)} />;
}
