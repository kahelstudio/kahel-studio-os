import { connection } from "next/server";
import ClientPortalPage from "@/components/client-portal/client-portal-page";

export default async function ProjectClientPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectRef: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  await connection();
  const [{ projectRef }, { token }] = await Promise.all([params, searchParams]);
  return <ClientPortalPage projectRef={projectRef} token={typeof token === "string" ? token : undefined} />;
}
