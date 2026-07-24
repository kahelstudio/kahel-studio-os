import { Construction } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function ComingSoon({ screen }: { screen: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <EmptyState
        icon={Construction}
        title={`${screen} is being built`}
        description="This screen isn't wired up yet. It's on the build list and will follow the Kahel Studio OS design handoff."
      />
    </div>
  );
}
