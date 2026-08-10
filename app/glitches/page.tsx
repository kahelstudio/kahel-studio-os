export const dynamic = "force-dynamic";

import { GlitchesWorkspaceView } from "@/components/glitches/glitches-workspace";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";
import { getGlitchesWorkspace } from "@/lib/server/glitches-data";

export default async function GlitchesPage() {
  const principal = await getCurrentStaffPrincipal();
  if (!principal) return <div className="p-8"><h1 className="font-display text-2xl font-semibold">Unauthorized</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">Sign in with an active staff account to view glitches.</p></div>;
  let workspace = null;
  try {
    workspace = await getGlitchesWorkspace(principal);
  } catch (error) {
    console.error("Unable to render glitches", error);
  }
  return <GlitchesWorkspaceView initialWorkspace={workspace} />;
}
