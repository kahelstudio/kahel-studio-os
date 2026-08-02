import { connection } from "next/server";
import ProjectRecord from "./project-record";

export default async function ProjectRecordPage({ params }: { params: Promise<{ projectRef: string }> }) {
  await connection();
  const { projectRef } = await params;
  return <ProjectRecord projectRef={projectRef} />;
}
