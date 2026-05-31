/** Normalize dashboard KPI counts — always returns finite numbers. */

export function toKpiNumber(value: unknown): number {

  const n = Number(value);

  return Number.isFinite(n) ? n : 0;

}



export function formatKpiValue(value: unknown): string {

  return toKpiNumber(value).toLocaleString("en-IN");

}



export interface DashboardKpis {

  invoicesGenerated: number;

  activeStudents: number;

  pendingPayments: number;

}



export function normalizeDashboardKpis(data: Record<string, unknown>): DashboardKpis {

  return {

    invoicesGenerated: toKpiNumber(data.invoicesGenerated ?? data.invoiceCount),

    activeStudents: toKpiNumber(data.activeStudents),

    pendingPayments: toKpiNumber(data.pendingPayments),

  };

}



export function normalizeDashboardPayload(data: Record<string, unknown>) {

  const kpis = normalizeDashboardKpis(data);

  const role = data.role === "ADMIN" ? "ADMIN" : "RECEPTIONIST";



  return {

    role,

    invoicesGenerated: kpis.invoicesGenerated,

    activeStudents: kpis.activeStudents,

    pendingPayments: kpis.pendingPayments,

    recentInvoices: Array.isArray(data.recentInvoices) ? data.recentInvoices : [],

  };

}

