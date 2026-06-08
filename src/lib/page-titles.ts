export function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/invoices/new")) return "Create Invoice";
  if (pathname.startsWith("/invoices/history")) return "Invoice History";
  if (pathname.match(/^\/invoices\/[^/]+$/)) return "Invoice Details";
  if (pathname.startsWith("/invoices")) return "Invoices";
  if (pathname.match(/^\/customers\/[^/]+$/)) return "Customer Profile";
  if (pathname.startsWith("/customers")) return "Customers";
  if (pathname.startsWith("/reports/revenue")) return "Revenue";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/admin/security")) return "Security Dashboard";
  if (pathname.startsWith("/admin/users")) return "User Management";
  if (pathname.startsWith("/settings")) return "Academy Settings";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  return "MR Academy Billing";
}
