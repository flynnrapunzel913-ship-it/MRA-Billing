import { prefetchJson } from "@/lib/client-cache";

const API_BY_ROUTE: Record<string, string | undefined> = {
  "/dashboard": "/api/dashboard",
  "/customers": "/api/customers?q=",
  "/invoices": "/api/invoices",
  "/stock": "/api/stock",
  "/settings": "/api/settings",
  "/profile": undefined,
  "/reports/revenue": "/api/reports/revenue",
  "/admin/users": "/api/admin/users",
};

export function prefetchRouteData(href: string) {
  const api = API_BY_ROUTE[href];
  if (api) prefetchJson(api);
}
