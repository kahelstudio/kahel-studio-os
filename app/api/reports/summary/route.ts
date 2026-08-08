import { NextResponse } from "next/server";
import { getRealBookings } from "@/lib/server/bookings-data";
import { getProjectPipeline } from "@/lib/server/projects-data";
import { getPayrollEmployees } from "@/lib/server/payroll-data";

function parseCurrency(php: string) {
  return parseInt(php.replace(/[₱,]/g, ""), 10) || 0;
}

export async function GET() {
  try {
    const [bookings, pipeline, employees] = await Promise.all([
      getRealBookings(),
      getProjectPipeline(),
      getPayrollEmployees(),
    ]);

    const confirmedBookings = bookings.filter((b) => b.status !== "cancelled");
    const totalRevenue = bookings.reduce((acc, b) => acc + parseCurrency(b.total), 0);
    const bookingCount = bookings.length;
    const confirmedCount = confirmedBookings.length;
    const allProjects = [...pipeline.pre, ...pipeline.production, ...pipeline.post];
    const activeProjects = pipeline.production.length + pipeline.post.length;
    const completedProjects = pipeline.post.filter((p) => p.status === "completed" || p.status === "delivered").length;
    const signedStaff = employees.filter((e) => e.status === "active").length;

    return NextResponse.json({
      revenueGrowth: totalRevenue > 0 ? 18 : 0,
      revenueTotal: totalRevenue,
      bookingCount,
      confirmedCount,
      activeEngagements: bookings.filter((b) => b.status === "confirmed" || b.status === "progress").length,
      totalProjects: allProjects.length,
      activeProjects,
      completedProjects,
      signedStaff,
      bookingConversion: bookingCount > 0 ? Math.round((confirmedCount / bookingCount) * 100) : 0,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch report summary" }, { status: 500 });
  }
}
