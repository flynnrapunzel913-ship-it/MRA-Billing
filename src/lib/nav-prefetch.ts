import { prefetchJson } from "@/lib/client-cache";
import type { Role } from "@prisma/client";

const API_BY_ROUTE: Record<string, string | string[] | undefined> = {
  "/dashboard": "/api/dashboard",
  "/customers": "/api/customers?q=",
  "/invoices": "/api/invoices",
  "/invoices/history": "/api/invoices",
  "/invoices/new": ["/api/customers?q=", "/api/catalog/subscriptions", "/api/catalog/products"],
  "/stock": ["/api/stock", "/api/stock/summary"],
  "/expenses": "/api/expenses",
  "/stock/new": "/api/stock/filters",
  "/settings": "/api/settings",
  "/profile": "/api/profile",
  "/reports/revenue": "/api/admin/revenue",
  "/reports/daily-revenue": "/api/admin/financial-summary?period=today",
  "/reports": "/api/reports",
  "/admin/users": "/api/admin/users",
  "/admin/security": "/api/admin/security/events?page=1&pageSize=25",
  "/admin/subscriptions": "/api/admin/subscriptions",
};

export function prefetchRouteData(href: string) {
  const base = href.split("?")[0];

  const invoiceDetail = base.match(/^\/invoices\/([^/]+)$/);
  if (invoiceDetail && invoiceDetail[1] !== "new" && invoiceDetail[1] !== "history") {
    prefetchJson(`/api/invoices/${invoiceDetail[1]}`);
  }

  const stockDetail = base.match(/^\/stock\/([^/]+)$/);
  if (stockDetail && stockDetail[1] !== "new") {
    prefetchJson(`/api/stock/${stockDetail[1]}`);
  }

  const customerDetail = base.match(/^\/customers\/([^/]+)$/);
  if (customerDetail) {
    prefetchJson(`/api/customers/${customerDetail[1]}`);
  }

  const apis = API_BY_ROUTE[base];
  if (!apis) return;
  const list = Array.isArray(apis) ? apis : [apis];
  for (const api of list) prefetchJson(api);
}

export function prefetchAppRoutes(role: Role) {
  const routes =
    role === "ADMIN"
      ? [
          "/dashboard",
          "/invoices",
          "/customers",
          "/stock",
          "/expenses",
          "/reports/revenue",
          "/admin/users",
          "/admin/security",
          "/settings",
        ]
      : ["/dashboard", "/invoices", "/customers", "/stock", "/expenses"];

  for (const route of routes) prefetchRouteData(route);
}
