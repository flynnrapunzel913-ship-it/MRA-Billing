/** Normalize dashboard KPI counts — always returns finite numbers. */

export function toKpiNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatKpiValue(value: unknown): string {
  return toKpiNumber(value).toLocaleString("en-IN");
}

export interface AdminDashboardKpis {
  invoicesGenerated: number;
  activeStudents: number;
  pendingPayments: number;
}

export interface ReceptionistDashboardKpis {
  activeCustomers: number;
  invoicesToday: number;
  pendingPayments: number;
}

export interface FinancialSummaryKpis {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export function normalizeFinancialSummary(data: Record<string, unknown>): FinancialSummaryKpis {
  const totalRevenue = toKpiNumber(data.totalRevenue);
  const totalExpenses = toKpiNumber(data.totalExpenses);
  return {
    totalRevenue,
    totalExpenses,
    netProfit: toKpiNumber(data.netProfit ?? totalRevenue - totalExpenses),
  };
}

export function normalizeAdminDashboardKpis(data: Record<string, unknown>): AdminDashboardKpis {
  return {
    invoicesGenerated: toKpiNumber(data.invoicesGenerated ?? data.invoiceCount),
    activeStudents: toKpiNumber(data.activeStudents),
    pendingPayments: toKpiNumber(data.pendingPayments),
  };
}

export function normalizeReceptionistDashboardKpis(
  data: Record<string, unknown>
): ReceptionistDashboardKpis {
  return {
    activeCustomers: toKpiNumber(data.activeCustomers ?? data.activeStudents),
    invoicesToday: toKpiNumber(data.invoicesToday ?? data.invoicesGenerated),
    pendingPayments: toKpiNumber(data.pendingPayments),
  };
}

export function normalizeDashboardPayload(data: Record<string, unknown>) {
  const role = data.role === "ADMIN" ? "ADMIN" : "RECEPTIONIST";

  if (role === "ADMIN") {
    const kpis = normalizeAdminDashboardKpis(data);
    const financial = normalizeFinancialSummary(data);
    return {
      role: "ADMIN" as const,
      ...kpis,
      ...financial,
      recentInvoices: Array.isArray(data.recentInvoices) ? data.recentInvoices : [],
    };
  }

  const kpis = normalizeReceptionistDashboardKpis(data);
  const financial = normalizeFinancialSummary(data);
  return {
    role: "RECEPTIONIST" as const,
    ...kpis,
    ...financial,
    recentInvoices: Array.isArray(data.recentInvoices) ? data.recentInvoices : [],
  };
}

/** @deprecated Use role-specific normalizers */
export function normalizeDashboardKpis(data: Record<string, unknown>): AdminDashboardKpis {
  return normalizeAdminDashboardKpis(data);
}
