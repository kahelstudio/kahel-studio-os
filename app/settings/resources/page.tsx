import { ResourceAdmin } from "@/components/booking/resource-admin";
import { getResourceDirectory } from "@/lib/server/resource-scheduling";

export const dynamic = "force-dynamic";

export default async function BookingResourcesSettingsPage() {
  const directory = await getResourceDirectory();
  return (
    <div className="app-page p-5 pt-6 sm:p-10 sm:pt-8">
      <div className="mb-8">
        <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">Booking resources</h1>
        <p className="mt-1.5 text-[15px] text-[var(--color-text-secondary)]">Studios, photographers, videographers and equipment: working hours, leave and blocks, and what each service needs.</p>
      </div>
      <ResourceAdmin initial={directory} />
    </div>
  );
}
