import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

const { txUser, prismaUser } = vi.hoisted(() => ({
  txUser: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  prismaUser: {
    findFirst: vi.fn().mockResolvedValue({ status: "ACTIVE", sessionVersion: 1 }),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: prismaUser },
}));

vi.mock("@/lib/invoice-filters", () => ({
  isSchemaDriftError: () => false,
}));

import { updateUserRecord } from "@/lib/user-queries";

const tx = { user: txUser };

const baseUser = {
  id: "user-1",
  username: "staff1",
  role: Role.RECEPTIONIST,
  status: "ACTIVE" as const,
  createdAt: new Date(),
};

describe("updateUserRecord session invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txUser.findUnique.mockResolvedValue({
      status: "ACTIVE",
      password: "hash",
      role: Role.RECEPTIONIST,
    });
    txUser.update
      .mockResolvedValueOnce(baseUser)
      .mockResolvedValueOnce({ sessionVersion: 2 });
  });

  it("bumps sessionVersion when role changes receptionist → admin", async () => {
    await updateUserRecord(
      "user-1",
      {
        username: "staff1",
        role: Role.ADMIN,
        status: "ACTIVE",
      },
      tx as never
    );

    expect(txUser.update).toHaveBeenCalledTimes(2);
    expect(txUser.update).toHaveBeenLastCalledWith({
      where: { id: "user-1" },
      data: { sessionVersion: { increment: 1 } },
    });
  });

  it("bumps sessionVersion when role changes admin → receptionist", async () => {
    txUser.findUnique.mockResolvedValue({
      status: "ACTIVE",
      password: "hash",
      role: Role.ADMIN,
    });

    await updateUserRecord(
      "user-1",
      {
        username: "staff1",
        role: Role.RECEPTIONIST,
        status: "ACTIVE",
      },
      tx as never
    );

    expect(txUser.update).toHaveBeenCalledTimes(2);
    expect(txUser.update).toHaveBeenLastCalledWith({
      where: { id: "user-1" },
      data: { sessionVersion: { increment: 1 } },
    });
  });

  it("does not bump sessionVersion when role is unchanged", async () => {
    txUser.findUnique.mockResolvedValue({
      status: "ACTIVE",
      password: "hash",
      role: Role.RECEPTIONIST,
    });

    await updateUserRecord(
      "user-1",
      {
        username: "staff1",
        role: Role.RECEPTIONIST,
        status: "ACTIVE",
      },
      tx as never
    );

    expect(txUser.update).toHaveBeenCalledTimes(1);
  });
});
