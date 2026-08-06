import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Filter,
  FolderKanban,
  History,
  MapPin,
  Search,
  Users,
  X,
} from "lucide-react";
import { type ReactNode, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/toast/toast-provider";
import { getProjectPipeline } from "@/lib/server/projects-data";

export type PipelineStage = "pre" | "production" | "post";

export interface PipelineProject {
  ref: string;
  client: string;
  service: string;
  stage: PipelineStage;
  status: string;
  schedule: string;
  team?: string;
  location?: string;
  progress?: number;
  due?: string;
  quick?: "overdue" | "week" | "completed" | "archived";
  history: { event: string; by: string; when: string }[];
}

const PROJECT_PIPELINE_STAGES: {
  id: PipelineStage;
  name: string;
  description: string;
  statuses: string[];
}[] = [
  {
    id: "pre",
    name: "Pre-production",
    description: "Prepare the brief, shoot plan and team.",
    statuses: [
      "New project",
      "Client briefing",
      "Concept development",
      "Shot list",
      "Schedule confirmed",
      "Location preparation",
      "Equipment preparation",
      "Team assigned",
      "Awaiting client approval",
      "Ready for production",
    ],
  },
  {
    id: "production",
    name: "Production",
    description: "Capture photography, video and audio.",
    statuses: [
      "Ready for production",
      "In production",
      "Shoot paused",
      "Additional shoot required",
      "Production completed",
    ],
  },
  {
    id: "post",
    name: "Post-production",
    description: "Back up, edit, review and deliver work.",
    statuses: [
      "File backup",
      "Culling",
      "Photo editing",
      "Video editing",
      "Audio editing",
      "Internal review",
      "Client review",
      "Revisions",
      "Ready for delivery",
      "Delivered",
      "Completed",
      "Archived",
    ],
  },
];

const quickFilters = [
  ["overdue", "Overdue"],
  ["week", "Due this week"],
  ["completed", "Completed"],
  ["archived", "Archived"],
] as const;

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
    : "\u2014";
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
      : "\u2014",
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

  return (
    <Suspense
      fallback={
        <div className="p-10 text-sm text-[var(--color-text-secondary)]">
          Loading projects…
        </div>
      }
    >
      <ProjectsPipelineContent initialProjects={allProjects} />
    </Suspense>
  );
}

function ProjectsPipelineContent({
  initialProjects,
}: {
  initialProjects: PipelineProject[];
}) {
  const { fireToast } = useToast();
  const searchParams = useSearchParams();
  const requestedPipelineStage = searchParams.get("stage");
  const [projects, setProjects] = useState(initialProjects);
  const [stageFilter, setPipelineStageFilter] = useState<PipelineStage | "all">("all");
  const stage: PipelineStage | "all" =
    requestedPipelineStage === "pre" ||
    requestedPipelineStage === "production" ||
    requestedPipelineStage === "post"
      ? requestedPipelineStage
      : stageFilter;
  const [status, setStatus] = useState<string | null>(null);
  const [quick, setQuick] = useState<string | null>(null);
  const [openPipelineStages, setOpenPipelineStages] = useState<PipelineStage[]>([
    "pre",
    "production",
    "post",
  ]);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<PipelineProject | null>(null);
  const [pendingMove, setPendingMove] = useState<PipelineProject | null>(null);
  const activePipelineStage =
    stage === "all" ? null : PROJECT_PIPELINE_STAGES.find((item) => item.id === stage);

  const filtered = projects.filter((project) => {
    const matchesPipelineStage = stage === "all" || project.stage === stage;
    const matchesStatus = !status || project.status === status;
    const matchesQuick = !quick || project.quick === quick;
    const matchesQuery =
      !query ||
      `${project.ref} ${project.client} ${project.service}`
        .toLowerCase()
        .includes(query.toLowerCase());
    return matchesPipelineStage && matchesStatus && matchesQuick && matchesQuery;
  });

  function selectPipelineStage(nextPipelineStage: PipelineStage | "all") {
    setPipelineStageFilter(nextPipelineStage);
    setStatus(null);
    setQuick(null);
    setFiltersOpen(false);
  }

  function selectStatus(nextPipelineStage: PipelineStage, nextStatus: string) {
    setPipelineStageFilter(nextPipelineStage);
    setStatus(status === nextStatus ? null : nextStatus);
    setQuick(null);
  }

  function togglePipelineStage(stageId: PipelineStage) {
    setOpenPipelineStages((current) =>
      current.includes(stageId)
        ? current.filter((item) => item !== stageId)
        : [...current, stageId],
    );
  }

  function moveToPost(project: PipelineProject) {
    setProjects((current) =>
      current.map((item) =>
        item.ref === project.ref
          ? {
              ...item,
              stage: "post",
              status: "File backup",
              progress: 0,
              history: [
                {
                  event: "Moved to post-production",
                  by: "Eusebio Barrun",
                  when: "25 Jul 2026, 17:10",
                },
                ...item.history,
              ],
            }
          : item,
      ),
    );
    setSelected((current) =>
      current?.ref === project.ref
        ? {
            ...current,
            stage: "post",
            status: "File backup",
            progress: 0,
            history: [
              {
                event: "Moved to post-production",
                by: "Eusebio Barrun",
                when: "25 Jul 2026, 17:10",
              },
              ...current.history,
            ],
          }
        : current,
    );
    setPendingMove(null);
    fireToast(`${project.ref} moved to post-production.`, "success");
  }

  function confirmCompletion(project: PipelineProject) {
    const history = [
      {
        event: "Project completed after delivery and payment confirmation",
        by: "Eusebio Barrun",
        when: "25 Jul 2026, 17:12",
      },
      ...project.history,
    ];
    setProjects((current) =>
      current.map((item) =>
        item.ref === project.ref
          ? { ...item, status: "Completed", quick: "completed", history }
          : item,
      ),
    );
    setSelected({
      ...project,
      status: "Completed",
      quick: "completed",
      history,
    });
    fireToast(`${project.ref} marked completed.`, "success");
  }

  function updateProjectStatus(project: PipelineProject, nextStatus: string) {
    const history = [
      {
        event: `Status changed to ${nextStatus}`,
        by: "Eusebio Barrun",
        when: "25 Jul 2026, 17:10",
      },
      ...project.history,
    ];
    const updated = { ...project, status: nextStatus, history };
    setProjects((current) =>
      current.map((item) => (item.ref === project.ref ? updated : item)),
    );
    setSelected(updated);
    if (nextStatus === "Production completed") setPendingMove(updated);
    else fireToast(`${project.ref} updated to ${nextStatus}.`, "success");
  }

  return (
    <div className="min-w-0 p-5 pb-14 sm:p-8 lg:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            <FolderKanban className="h-3.5 w-3.5 text-[var(--color-kahel-500)]" />{" "}
            Project workflow
          </div>
          <h1 className="mt-2 font-display text-[36px] font-semibold tracking-[-0.025em]">
            {activePipelineStage?.name ?? "Projects"}
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            {activePipelineStage?.description ??
              "Projects are created once per confirmed booking and remain separate from staff tasks."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)] sm:block">
            {projects.length} active projects
          </span>
          <button
            onClick={() => setFiltersOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm font-semibold xl:hidden"
          >
            <Filter className="h-4 w-4" /> Workflow filters
          </button>
        </div>
      </div>

      <div className="mt-7">
        <main className="min-w-0">
          <div className="flex justify-end border-b border-[var(--color-border)] pb-4">
            <label className="flex h-10 w-full items-center gap-2 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:w-64">
              <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-muted)]"
                placeholder="Search projects"
              />
            </label>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard
                key={project.ref}
                project={project}
                onOpen={() => setSelected(project)}
              />
            ))}
          </div>
          {!filtered.length && (
            <div className="mt-5 rounded-card border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-14 text-center">
              <Filter className="mx-auto h-5 w-5 text-[var(--color-text-muted)]" />
              <div className="mt-3 font-display text-lg font-semibold">
                No projects match these filters
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Clear a status or quick filter to return to the workflow.
              </p>
              <button
                onClick={() => {
                  setPipelineStageFilter("all");
                  setStatus(null);
                  setQuick(null);
                  setQuery("");
                }}
                className="mt-4 text-sm font-semibold text-[var(--color-kahel-700)]"
              >
                Reset filters
              </button>
            </div>
          )}
        </main>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 xl:hidden">
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-card bg-[var(--color-surface)] p-5 shadow-[var(--shadow-dialog)]">
            <div className="mb-5 flex items-center justify-between">
              <div className="font-display text-xl font-semibold">
                Workflow filters
              </div>
              <button
                onClick={() => setFiltersOpen(false)}
                className="rounded-control p-2 hover:bg-[var(--color-surface-muted)]"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <WorkflowSidebar
              stage={stage}
              status={status}
              quick={quick}
              projects={projects}
              openPipelineStages={openPipelineStages}
              onPipelineStage={selectPipelineStage}
              onStatus={selectStatus}
              onQuick={(value) => {
                setQuick(quick === value ? null : value);
                setPipelineStageFilter("all");
                setStatus(null);
              }}
              onToggle={togglePipelineStage}
              mobile
            />
            <button
              onClick={() => setFiltersOpen(false)}
              className="mt-5 h-11 w-full rounded-control bg-[var(--color-kahel-500)] text-sm font-semibold text-white"
            >
              Apply filters
            </button>
          </div>
        </div>
      )}
      {selected && (
        <ProjectDetail
          project={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(nextStatus) =>
            updateProjectStatus(selected, nextStatus)
          }
          onMove={() =>
            selected.status === "Production completed"
              ? setPendingMove(selected)
              : fireToast(
                  "Update the project status from its workflow stage.",
                  "info",
                )
          }
          onComplete={() => confirmCompletion(selected)}
        />
      )}
      {pendingMove && (
        <MoveDialog
          project={pendingMove}
          onClose={() => setPendingMove(null)}
          onConfirm={() => moveToPost(pendingMove)}
        />
      )}
    </div>
  );
}

function WorkflowSidebar({
  stage,
  status,
  quick,
  projects,
  openPipelineStages,
  onPipelineStage,
  onStatus,
  onQuick,
  onToggle,
  mobile = false,
}: {
  stage: PipelineStage | "all";
  status: string | null;
  quick: string | null;
  projects: PipelineProject[];
  openPipelineStages: PipelineStage[];
  onPipelineStage: (stage: PipelineStage | "all") => void;
  onStatus: (stage: PipelineStage, status: string) => void;
  onQuick: (filter: string) => void;
  onToggle: (stage: PipelineStage) => void;
  mobile?: boolean;
}) {
  const contents = (
    <>
      <button
        onClick={() => onPipelineStage("all")}
        className={`flex w-full items-center justify-between rounded-control px-3 py-2.5 text-left text-sm font-semibold ${stage === "all" && !quick ? "bg-[var(--color-kahel-500)] text-white" : "hover:bg-[var(--color-surface-muted)]"}`}
      >
        <span>All projects</span>
        <span className="tabular-nums opacity-75">{projects.length}</span>
      </button>
      <div className="mt-4 border-t border-[var(--color-border)] pt-3">
        <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Workflow stages
        </div>
        {PROJECT_PIPELINE_STAGES.map((item) => {
          const count = projects.filter(
            (project) => project.stage === item.id,
          ).length;
          const open = openPipelineStages.includes(item.id);
          return (
            <div key={item.id} className="mt-1">
              <div
                className={`flex items-center rounded-control ${stage === item.id && !status ? "bg-[var(--color-kahel-100)] text-[var(--color-kahel-700)]" : ""}`}
              >
                <button
                  onClick={() => onPipelineStage(item.id)}
                  className="min-w-0 flex-1 px-3 py-2.5 text-left text-sm font-semibold"
                >
                  {item.name}
                  <span className="mt-0.5 block text-[11px] font-normal opacity-70">
                    {item.description}
                  </span>
                </button>
                <span className="text-xs tabular-nums opacity-70">{count}</span>
                <button
                  onClick={() => onToggle(item.id)}
                  className="p-2.5"
                  aria-label={`Toggle ${item.name} statuses`}
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>
              {open && (
                <div className="ml-3 border-l border-[var(--color-border)] py-1">
                  {item.statuses.map((itemStatus) => {
                    const statusCount = projects.filter(
                      (project) =>
                        project.stage === item.id &&
                        project.status === itemStatus,
                    ).length;
                    return (
                      <button
                        key={itemStatus}
                        onClick={() => onStatus(item.id, itemStatus)}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs ${status === itemStatus ? "font-semibold text-[var(--color-kahel-700)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
                      >
                        <span>{itemStatus}</span>
                        {statusCount > 0 && (
                          <span className="tabular-nums text-[var(--color-text-muted)]">
                            {statusCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 border-t border-[var(--color-border)] pt-3">
        <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Quick filters
        </div>
        {quickFilters.map(([id, label]) => (
          <button
            key={id}
            onClick={() => onQuick(id)}
            className={`mt-1 flex w-full items-center justify-between rounded-control px-3 py-2 text-left text-sm ${quick === id ? "bg-[var(--color-kahel-100)] font-semibold text-[var(--color-kahel-700)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"}`}
          >
            <span>{label}</span>
            <span className="tabular-nums text-xs opacity-70">
              {projects.filter((project) => project.quick === id).length}
            </span>
          </button>
        ))}
      </div>
    </>
  );
  return (
    <aside className={mobile ? "" : "hidden xl:block"}>
      <div
        className={
          mobile
            ? ""
            : "sticky top-4 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
        }
      >
        {contents}
      </div>
    </aside>
  );
}

function ProjectCard({
  project,
  onOpen,
}: {
  project: PipelineProject;
  onOpen: () => void;
}) {
  const colors =
    project.stage === "pre"
      ? "bg-[var(--color-info-bg)] text-[var(--color-info-text)]"
      : project.stage === "production"
        ? "bg-[var(--color-kahel-100)] text-[var(--color-kahel-700)]"
        : "bg-[var(--color-indigo-100)] text-[var(--color-indigo-800)]";
  return (
    <button
      onClick={onOpen}
      className="group rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:border-[var(--color-kahel-500)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">
          {project.ref}
        </span>
        <span
          className={`rounded-pill px-2 py-1 text-[10px] font-bold uppercase tracking-[0.04em] ${colors}`}
        >
          {PROJECT_PIPELINE_STAGES.find((item) => item.id === project.stage)?.name}
        </span>
      </div>
      <div className="mt-3 font-display text-base font-semibold">
        {project.client}
      </div>
      <div className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
        {project.service}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs font-semibold">
        <span
          className={`h-2 w-2 rounded-full ${project.status === "In production" ? "bg-[var(--color-kahel-500)]" : project.status === "Completed" ? "bg-[var(--color-success)]" : "bg-[var(--color-info)]"}`}
        />
        {project.status}
      </div>
      {project.progress !== undefined && (
        <>
          <div className="mt-3 flex justify-between text-xs text-[var(--color-text-secondary)]">
            <span>Deliverable progress</span>
            <span className="font-semibold tabular-nums">
              {project.progress}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-[var(--color-surface-muted)]">
            <div
              className="h-full rounded-pill bg-[var(--color-kahel-500)]"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {project.due ? `Due ${project.due}` : project.schedule}
        </span>
        <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-kahel-700)]" />
      </div>
    </button>
  );
}

function ProjectDetail({
  project,
  onClose,
  onStatusChange,
  onMove,
  onComplete,
}: {
  project: PipelineProject;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onMove: () => void;
  onComplete: () => void;
}) {
  const canComplete = project.status === "Delivered";
  const stageStatuses =
    PROJECT_PIPELINE_STAGES.find((item) => item.id === project.stage)?.statuses ?? [];
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40 sm:items-stretch sm:justify-end">
      <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-modal bg-[var(--color-surface)] shadow-[var(--shadow-dialog)] sm:h-full sm:max-h-none sm:max-w-xl sm:rounded-none">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
          <div className="min-w-0">
            <div className="text-xs font-medium text-[var(--color-text-muted)]">
              {project.ref}
            </div>
            <h2 className="mt-1 truncate font-display text-xl font-semibold sm:text-2xl">
              {project.client}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {project.service}
            </p>
          </div>
          <button
            onClick={onClose}
            className="-m-2 shrink-0 rounded-control p-3 hover:bg-[var(--color-surface-muted)]"
            aria-label="Close project"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:p-5">
          <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-canvas)] p-3.5 sm:p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
              Current workflow status
            </div>
            <label className="mt-3 block text-xs font-semibold text-[var(--color-text-secondary)]">
              {PROJECT_PIPELINE_STAGES.find((item) => item.id === project.stage)?.name}
              <select
                value={project.status}
                onChange={(event) => onStatusChange(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-text-primary)]"
              >
                {stageStatuses.map((itemStatus) => (
                  <option key={itemStatus}>{itemStatus}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail
              label="Schedule"
              value={project.schedule}
              icon={<CalendarDays className="h-4 w-4" />}
            />
            <Detail
              label={project.location ? "Location" : "Team"}
              value={project.location ?? project.team ?? "Unassigned"}
              icon={
                project.location ? (
                  <MapPin className="h-4 w-4" />
                ) : (
                  <Users className="h-4 w-4" />
                )
              }
            />
          </div>
          {project.status === "Production completed" && (
            <button
              onClick={onMove}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white"
            >
              Move to post-production
            </button>
          )}
          {canComplete && (
            <button
              onClick={onComplete}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white"
            >
              Confirm deliverables and payment settled{" "}
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[var(--color-kahel-700)]" />
              <h3 className="font-display text-lg font-semibold">
                Stage history
              </h3>
            </div>
            <div className="mt-3 border-l border-[var(--color-border)] pl-4">
              {project.history.map((entry, index) => (
                <div
                  key={`${entry.when}-${index}`}
                  className="relative pb-5 last:pb-0"
                >
                  <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[var(--color-kahel-500)]" />
                  <div className="text-sm font-semibold">{entry.event}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {entry.by} · {entry.when}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 rounded-control border border-[var(--color-warning-bg)] bg-[var(--color-warning-bg)] p-3 text-xs text-[var(--color-warning-text)]">
            <CircleAlert className="h-4 w-4 shrink-0" />
            Rescheduled bookings update this linked project. Cancelled bookings
            are flagged for review and never delete the project.
          </div>
        </div>
      </section>
    </div>
  );
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-control border border-[var(--color-border)] p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

function MoveDialog({
  project,
  onClose,
  onConfirm,
}: {
  project: PipelineProject;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-dialog)]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-kahel-100)] text-[var(--color-kahel-700)]">
          <ArrowRight className="h-5 w-5" />
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold">
          Move to post-production?
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {project.ref} is marked Production completed. Move it to File backup
          in Post-production now?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-10 rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold"
          >
            Keep in production
          </button>
          <button
            onClick={onConfirm}
            className="h-10 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white"
          >
            Move project
          </button>
        </div>
      </div>
    </div>
  );
}
