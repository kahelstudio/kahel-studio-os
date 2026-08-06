export const dynamic = "force-dynamic";

import { getGlitches } from "@/lib/server/glitches-data";
import { GlitchesTable } from "@/components/glitches/glitches-table";

export default async function Page() {
  const glitches = await getGlitches();
  return <GlitchesTable group="open" glitches={glitches} />;
}
