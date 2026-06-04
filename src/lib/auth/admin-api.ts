/**
 * Admin API authorization — import requireAdmin from here in every /api/admin/* route.
 * UI nav hiding is not sufficient; server-side role checks are mandatory.
 */
export { requireAdmin, requireAuth, forbiddenResponse } from "@/lib/auth/guards";
