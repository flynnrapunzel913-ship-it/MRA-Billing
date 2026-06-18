import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

const mockAuth = vi.fn();
const mockLoadActiveAccount = vi.fn();

vi.mock("@/lib/auth/config", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/auth/session", () => ({
  loadActiveAccount: (...args: unknown[]) => mockLoadActiveAccount(...args),
}));

vi.mock("@/lib/user-queries", () => ({
  supportsSessionVersion: async () => true,
}));

vi.mock("@/lib/auth/admin-access-audit", () => ({
  logAdminAccessViolation: vi.fn(),
}));

vi.mock("@/lib/auth/disabled-access-audit", () => ({
  logDisabledUserAccessAttempt: vi.fn(),
}));

vi.mock("@/lib/auth/request-meta", () => ({
  getRequestPathname: async () => "/api/test",
}));

vi.mock("@/lib/security/security-log", () => ({
  logSecurityEvent: vi.fn(),
}));

import {
  requireAuth,
  requireOperationalAccess,
} from "@/lib/auth/guards";

const activeCashier = {
  id: "cashier-1",
  username: "cashier1",
  role: Role.CASHIER,
  disabled: false,
  sessionVersion: 2,
};

describe("requireOperationalAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "cashier-1",
        role: Role.CASHIER,
        sessionVersion: 2,
        name: "Cashier",
      },
    });
    mockLoadActiveAccount.mockResolvedValue(activeCashier);
  });

  it("returns 403 for cashier", async () => {
    const { error, user } = await requireOperationalAccess();
    expect(user).toBeNull();
    expect(error?.status).toBe(403);
    const body = await error!.json();
    expect(body).toEqual({ error: "Forbidden", code: "FORBIDDEN" });
  });

  it("allows receptionist", async () => {
    mockLoadActiveAccount.mockResolvedValue({
      id: "rec-1",
      username: "receptionist1",
      role: Role.RECEPTIONIST,
      disabled: false,
      sessionVersion: 1,
    });
    mockAuth.mockResolvedValue({
      user: {
        id: "rec-1",
        role: Role.RECEPTIONIST,
        sessionVersion: 1,
      },
    });

    const { error, user } = await requireOperationalAccess();
    expect(error).toBeNull();
    expect(user?.role).toBe(Role.RECEPTIONIST);
  });
});

describe("requireAuth session version", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadActiveAccount.mockResolvedValue({
      id: "user-1",
      username: "receptionist1",
      role: Role.RECEPTIONIST,
      disabled: false,
      sessionVersion: 2,
    });
  });

  it("rejects stale JWT after role change invalidated the session", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        role: Role.RECEPTIONIST,
        sessionVersion: 1,
        name: "Old Session",
      },
    });

    const { error, user } = await requireAuth();
    expect(user).toBeNull();
    expect(error?.status).toBe(401);
    const body = await error!.json();
    expect(body.error).toBe("Unauthorized or session expired");
  });

  it("allows JWT matching current sessionVersion", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        role: Role.CASHIER,
        sessionVersion: 2,
      },
    });
    mockLoadActiveAccount.mockResolvedValue(activeCashier);

    const { error, user } = await requireAuth();
    expect(error).toBeNull();
    expect(user?.role).toBe(Role.CASHIER);
  });
});
