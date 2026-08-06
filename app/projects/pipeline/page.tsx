import { getProjectPipeline } from "@/lib/server/projects-data";
import { type PipelineProject, type PipelineStage, ProjectsPipelinePageClient } from "./pipeline-content";

function mapPipelineToProject(p: {
  id: string;
  reference: string;
  title: string;
  client: string;
  status: string;
  stage: PipelineStage;
  startsAt: string | null;
  completedAt: string | null;
}): PipelineProject {
  const startDate = p.startsAt
    ? new Date(p.startsAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const isCompleted = p.status === "completed" || p.status === "delivered";
  return {
    ref: p.reference,
    client: p.client,
    service: p.title,
    stage: p.stage,
    status: p.status,
    schedule: p.startsAt
      ? new Date(p.startsAt).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "—",
    progress: p.stage === "post" && !isCompleted ? 0 : undefined,
    quick: isCompleted ? "completed" : undefined,
    history: [
      { event: `Project created · status: ${p.status}`, by: "System", when: p.startsAt ?? startDate },
    ],
  };
}

export default async function ProjectsPipelinePage() {
  const pipeline = await getProjectPipeline();
  const allProjects: PipelineProject[] = [
    ...pipeline.pre.map(mapPipelineToProject),
    ...pipeline.production.map(mapPipelineToProject),
    ...pipeline.post.map(mapPipelineToProject),
  ];

  return <ProjectsPipelinePageClient initialProjects={allProjects} />;
}
