/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseAdmin } from "./supabase-admin";

export type PayrollOverview = {
  currentRun: {
    id: string;
    reference: string;
    periodLabel: string;
    periodStart: string;
    periodEnd: string;
    paymentDate: string;
    employeeCount: number;
    preparedBy: string;
    grossTotal: number;
    deductionsTotal: number;
    employerShare: number;
    netTotal: number;
    stepsDone: number;
    stepsTotal: number;
    status: string;
  } | null;
  kpis: {
    employeeCount: number;
    avgSalary: number;
    totalPayrollMtd: number;
    nextRunDate: string | null;
  };
};

export type PayrollRun = {
  id: string;
  reference: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  employeeCount: number;
  preparedBy: string;
  grossTotal: number;
  deductionsTotal: number;
  employerShare: number;
  netTotal: number;
  stepsDone: number;
  stepsTotal: number;
  status: string;
  createdAt: string;
};

export type PayrollEmployee = {
  id: string;
  staffId: string | null;
  initials: string;
  name: string;
  role: string;
  employeeRef: string;
  baseSalary: number;
  sssNumber: string | null;
  tin: string | null;
  philhealthNumber: string | null;
  pagibigNumber: string | null;
  status: string;
  hiredAt: string | null;
};

export type PayrollPayslip = {
  id: string;
  runId: string;
  employeeId: string;
  initials: string;
  name: string;
  role: string;
  basicPay: number;
  overtimePay: number;
  grossPay: number;
  sssEe: number;
  philhealthEe: number;
  pagibigEe: number;
  withholdingTax: number;
  otherDeductions: number;
  netPay: number;
};

export async function getPayrollOverview(): Promise<PayrollOverview> {
  try {
    const admin = getSupabaseAdmin();

    const { data: currentRun, error: runError } = await admin
      .from("payroll_runs")
      .select(`
        id,
        reference,
        period_label,
        period_start,
        period_end,
        payment_date,
        employee_count,
        prepared_by,
        gross_total,
        deductions_total,
        employer_share,
        net_total,
        steps_done,
        steps_total,
        status
      `)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (runError) throw runError;

    const { data: employees, error: empError } = await admin
      .from("payroll_employees")
      .select("id, base_salary")
      .eq("status", "active");

    if (empError) throw empError;

    const activeEmployees = employees ?? [];
    const avgSalary = activeEmployees.length > 0
      ? activeEmployees.reduce((s: number, e: any) => s + (Number(e.base_salary) ?? 0), 0) / activeEmployees.length
      : 0;

    const mtdStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

    const { data: mtdRuns, error: mtdError } = await admin
      .from("payroll_runs")
      .select("gross_total")
      .gte("payment_date", mtdStart)
      .eq("status", "paid");

    if (mtdError) throw mtdError;

    const totalPayrollMtd = (mtdRuns ?? []).reduce((s: number, r: any) => s + (Number(r.gross_total) ?? 0), 0);

    return {
      currentRun: currentRun ? {
        id: (currentRun as any).id,
        reference: (currentRun as any).reference,
        periodLabel: (currentRun as any).period_label,
        periodStart: (currentRun as any).period_start,
        periodEnd: (currentRun as any).period_end,
        paymentDate: (currentRun as any).payment_date,
        employeeCount: (currentRun as any).employee_count,
        preparedBy: (currentRun as any).prepared_by,
        grossTotal: Number((currentRun as any).gross_total) ?? 0,
        deductionsTotal: Number((currentRun as any).deductions_total) ?? 0,
        employerShare: Number((currentRun as any).employer_share) ?? 0,
        netTotal: Number((currentRun as any).net_total) ?? 0,
        stepsDone: (currentRun as any).steps_done,
        stepsTotal: (currentRun as any).steps_total,
        status: (currentRun as any).status,
      } : null,
      kpis: {
        employeeCount: activeEmployees.length,
        avgSalary,
        totalPayrollMtd,
        nextRunDate: null,
      },
    };
  } catch (error) {
    console.error("getPayrollOverview: table not available", (error as Error).message);
    return { currentRun: null, kpis: { employeeCount: 0, avgSalary: 0, totalPayrollMtd: 0, nextRunDate: null } };
  }
}

export async function getPayrollRuns(): Promise<PayrollRun[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("payroll_runs")
      .select(`
        id,
        reference,
        period_label,
        period_start,
        period_end,
        payment_date,
        employee_count,
        prepared_by,
        gross_total,
        deductions_total,
        employer_share,
        net_total,
        steps_done,
        steps_total,
        status,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      id: r.id,
      reference: r.reference,
      periodLabel: r.period_label,
      periodStart: r.period_start,
      periodEnd: r.period_end,
      paymentDate: r.payment_date,
      employeeCount: r.employee_count,
      preparedBy: r.prepared_by,
      grossTotal: Number(r.gross_total) ?? 0,
      deductionsTotal: Number(r.deductions_total) ?? 0,
      employerShare: Number(r.employer_share) ?? 0,
      netTotal: Number(r.net_total) ?? 0,
      stepsDone: r.steps_done,
      stepsTotal: r.steps_total,
      status: r.status,
      createdAt: r.created_at,
    }));
  } catch (error) {
    console.error("getPayrollRuns: table not available", (error as Error).message);
    return [];
  }
}

export async function getPayrollEmployees(): Promise<PayrollEmployee[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("payroll_employees")
      .select("id, staff_id, initials, name, role, employee_ref, base_salary, sss_number, tin, philhealth_number, pagibig_number, status, hired_at")
      .order("name", { ascending: true });

    if (error) throw error;

    return (data ?? []).map((e: any) => ({
      id: e.id,
      staffId: e.staff_id,
      initials: e.initials,
      name: e.name,
      role: e.role,
      employeeRef: e.employee_ref,
      baseSalary: Number(e.base_salary) ?? 0,
      sssNumber: e.sss_number,
      tin: e.tin,
      philhealthNumber: e.philhealth_number,
      pagibigNumber: e.pagibig_number,
      status: e.status,
      hiredAt: e.hired_at,
    }));
  } catch (error) {
    console.error("getPayrollEmployees: table not available", (error as Error).message);
    return [];
  }
}

export async function getPayrollPayslips(runId: string): Promise<PayrollPayslip[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("payroll_payslips")
      .select("id, run_id, employee_id, initials, name, role, basic_pay, overtime_pay, gross_pay, sss_ee, philhealth_ee, pagibig_ee, withholding_tax, other_deductions, net_pay")
      .eq("run_id", runId)
      .order("name", { ascending: true });

    if (error) throw error;

    return (data ?? []).map((p: any) => ({
      id: p.id,
      runId: p.run_id,
      employeeId: p.employee_id,
      initials: p.initials,
      name: p.name,
      role: p.role,
      basicPay: Number(p.basic_pay) ?? 0,
      overtimePay: Number(p.overtime_pay) ?? 0,
      grossPay: Number(p.gross_pay) ?? 0,
      sssEe: Number(p.sss_ee) ?? 0,
      philhealthEe: Number(p.philhealth_ee) ?? 0,
      pagibigEe: Number(p.pagibig_ee) ?? 0,
      withholdingTax: Number(p.withholding_tax) ?? 0,
      otherDeductions: Number(p.other_deductions) ?? 0,
      netPay: Number(p.net_pay) ?? 0,
    }));
  } catch (error) {
    console.error("getPayrollPayslips: table not available", (error as Error).message);
    return [];
  }
}

export type PayrollAdjustment = {
  id: string;
  reference: string;
  employeeName: string;
  kind: string;
  direction: string;
  amount: number;
  runRef: string;
  status: string;
};

export async function getPayrollAdjustments(): Promise<PayrollAdjustment[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("payroll_adjustments")
      .select("id, reference, employee_name, kind, direction, amount, run_ref, status")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    return (data ?? []).map((a: any) => ({
      id: a.id,
      reference: a.reference,
      employeeName: a.employee_name,
      kind: a.kind,
      direction: a.direction,
      amount: Number(a.amount) ?? 0,
      runRef: a.run_ref,
      status: a.status,
    }));
  } catch (error) {
    console.error("getPayrollAdjustments: table not available", (error as Error).message);
    return [];
  }
}

export type PayrollContribution = {
  id: string;
  type: string;
  period: string;
  eeShare: number;
  erShare: number;
  total: number;
  employeeCount: number;
  dueDate: string;
  status: string;
  ref: string;
};

export async function getPayrollContributions(): Promise<PayrollContribution[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("payroll_contributions")
      .select("id, type, period, ee_share, er_share, total, employee_count, due_date, status, ref")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    return (data ?? []).map((c: any) => ({
      id: c.id,
      type: c.type,
      period: c.period,
      eeShare: Number(c.ee_share) ?? 0,
      erShare: Number(c.er_share) ?? 0,
      total: Number(c.total) ?? 0,
      employeeCount: c.employee_count ?? 0,
      dueDate: c.due_date,
      status: c.status,
      ref: c.ref ?? "",
    }));
  } catch (error) {
    console.error("getPayrollContributions: table not available", (error as Error).message);
    return [];
  }
}

export async function getPayrollEmployeeById(employeeId: string): Promise<PayrollEmployee | null> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("payroll_employees")
      .select("id, staff_id, initials, name, role, employee_ref, base_salary, sss_number, tin, philhealth_number, pagibig_number, status, hired_at")
      .eq("id", employeeId)
      .maybeSingle();

    if (error || !data) return null;

    const e = data as any;
    return {
      id: e.id,
      staffId: e.staff_id,
      initials: e.initials,
      name: e.name,
      role: e.role,
      employeeRef: e.employee_ref,
      baseSalary: Number(e.base_salary) ?? 0,
      sssNumber: e.sss_number,
      tin: e.tin,
      philhealthNumber: e.philhealth_number,
      pagibigNumber: e.pagibig_number,
      status: e.status,
      hiredAt: e.hired_at,
    };
  } catch (error) {
    console.error("getPayrollEmployeeById: table not available", (error as Error).message);
    return null;
  }
}

export type ThirteenthMonthRow = {
  id: string;
  name: string;
  basis: number;
  earned: number;
  paid: number;
  balance: number;
  status: "ready" | "partial" | "paid" | "excluded";
};

export type ThirteenthMonthSummary = {
  eligible: number;
  earnedTotal: number;
  paidTotal: number;
  balanceTotal: number;
  rows: ThirteenthMonthRow[];
};

export async function get13thMonthData(): Promise<ThirteenthMonthSummary> {
  const empty: ThirteenthMonthSummary = { eligible: 0, earnedTotal: 0, paidTotal: 0, balanceTotal: 0, rows: [] };
  try {
    const admin = getSupabaseAdmin();
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const yearEnd = `${new Date().getFullYear()}-12-31`;

    const [{ data: employees, error: empErr }, { data: payslips, error: slipErr }, { data: adjustments, error: adjErr }] = await Promise.all([
      admin.from("payroll_employees").select("id, name, status").order("name"),
      admin.from("payroll_payslips").select("employee_id, basic_pay, created_at"),
      admin.from("payroll_adjustments").select("employee_id, amount, reason, status").ilike("reason", "%13th%").eq("status", "approved"),
    ]);

    if (empErr || slipErr || adjErr) return empty;

    const ytdByEmployee: Record<string, number> = {};
    for (const slip of payslips ?? []) {
      const slipDate = (slip as any).created_at?.slice(0, 10) ?? "";
      if (slipDate >= yearStart && slipDate <= yearEnd) {
        ytdByEmployee[(slip as any).employee_id] = (ytdByEmployee[(slip as any).employee_id] ?? 0) + ((slip as any).basic_pay ?? 0);
      }
    }

    const paidByEmployee: Record<string, number> = {};
    for (const adj of adjustments ?? []) {
      paidByEmployee[(adj as any).employee_id] = (paidByEmployee[(adj as any).employee_id] ?? 0) + ((adj as any).amount ?? 0);
    }

    const rows: ThirteenthMonthRow[] = (employees ?? []).map((e: any) => {
      if (e.status !== "active") return { id: e.id, name: e.name, basis: 0, earned: 0, paid: 0, balance: 0, status: "excluded" as const };
      const basis = ytdByEmployee[e.id] ?? 0;
      const earned = Math.round((basis / 12) * 100) / 100;
      const paid = paidByEmployee[e.id] ?? 0;
      const balance = Math.round((earned - paid) * 100) / 100;
      const status: ThirteenthMonthRow["status"] = paid >= earned && earned > 0 ? "paid" : paid > 0 ? "partial" : "ready";
      return { id: e.id, name: e.name, basis, earned, paid, balance, status };
    });

    const eligible = rows.filter((r) => r.status !== "excluded");
    return {
      eligible: eligible.length,
      earnedTotal: eligible.reduce((s, r) => s + r.earned, 0),
      paidTotal: eligible.reduce((s, r) => s + r.paid, 0),
      balanceTotal: eligible.reduce((s, r) => s + r.balance, 0),
      rows,
    };
  } catch (error) {
    console.error("get13thMonthData: table not available", (error as Error).message);
    return empty;
  }
}

export async function getLatestPayrollRunId(): Promise<string | null> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("payroll_runs")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return (data as any).id;
  } catch (error) {
    console.error("getLatestPayrollRunId: table not available", (error as Error).message);
    return null;
  }
}
