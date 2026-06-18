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

import { requireAuth, requireOperationalAccess } from "@/lib/auth/guards";

describe("requireOperationalAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("allows admin", async () => {
    mockLoadActiveAccount.mockResolvedValue({
      id: "admin-1",
      username: "admin1",
      role: Role.ADMIN,
      disabled: false,
      sessionVersion: 1,
    });
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        role: Role.ADMIN,
        sessionVersion: 1,
      },
    });

    const { error, user } = await requireOperationalAccess();
    expect(error).toBeNull();
    expect(user?.role).toBe(Role.ADMIN);
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
        role: Role.RECEPTIONIST,
        sessionVersion: 2,
      },
    });

    const { error, user } = await requireAuth();
    expect(error).toBeNull();
    expect(user?.role).toBe(Role.RECEPTIONIST);
  });
});
