import { getMaintenanceRecords } from "@/lib/server/maintenance-data";
import { MaintenanceTable } from "@/components/maintenance/maintenance-table";

export default async function Page() {
  const records = await getMaintenanceRecords();
  const completed = records.filter((r) => r.status === "completed");
  return <MaintenanceTable rows={completed} historyOnly />;
}
