import { connection } from "next/server";
import ProjectRecord from "./project-record";
import { EmailHistory } from "@/components/messages/email-history";
import { getProjectByRef } from "@/lib/server/projects-data";

export default async function ProjectRecordPage({ params }: { params: Promise<{ projectRef: string }> }) {
  await connection();
  const { projectRef } = await params;
  const project = await getProjectByRef(projectRef);
  return <><ProjectRecord projectRef={projectRef} /><div className="mx-auto w-full max-w-5xl px-5 pb-14 sm:px-10"><EmailHistory context={{ projectId: project?.id, projectReference: projectRef, bookingId: project?.bookingId ?? undefined, clientId: project?.clientId }} /></div></>;
}
