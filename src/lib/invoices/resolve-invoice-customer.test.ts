import { describe, expect, it, vi } from "vitest";
import { resolveInvoiceCustomer } from "./resolve-invoice-customer";

function createMockTx(overrides: {
  findUnique?: ReturnType<typeof vi.fn>;
  findFirst?: ReturnType<typeof vi.fn>;
  create?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
}) {
  return {
    customer: {
      findUnique: overrides.findUnique ?? vi.fn(),
      findFirst: overrides.findFirst ?? vi.fn(),
      create: overrides.create ?? vi.fn(),
      update: overrides.update ?? vi.fn(),
    },
  };
}

describe("resolveInvoiceCustomer", () => {
  it("links an explicitly selected customer without creating a new row", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: "cust-existing",
      name: "Ravi Kumar",
      mobile: "9876543210",
      address: "Main St",
      gstNumber: null,
    });
    const create = vi.fn();
    const tx = createMockTx({ findUnique, create });

    const result = await resolveInvoiceCustomer(tx as never, {
      customerId: "cust-existing",
      customerName: "Ignored Draft Name",
      customerMobile: "9876543210",
    });

    expect(result.customerId).toBe("cust-existing");
    expect(result.customerJustCreated).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a customer only when resolving for a new mobile inside the transaction", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({
      id: "cust-new",
      name: "Sanjana",
      mobile: "9123456789",
      address: null,
      gstNumber: null,
    });
    const tx = createMockTx({ findFirst, create });

    const result = await resolveInvoiceCustomer(tx as never, {
      customerName: "Sanjana",
      customerMobile: "91234 56789",
    });

    expect(findFirst).toHaveBeenCalledWith({ where: { mobile: "9123456789" } });
    expect(create).toHaveBeenCalledOnce();
    expect(result.customerId).toBe("cust-new");
    expect(result.customerJustCreated).toEqual({ id: "cust-new", name: "Sanjana" });
  });

  it("reuses an existing customer matched by mobile without creating a duplicate", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "cust-existing",
      name: "Old Name",
      mobile: "9876543210",
      address: null,
      gstNumber: null,
    });
    const update = vi.fn().mockResolvedValue({});
    const create = vi.fn();
    const tx = createMockTx({ findFirst, update, create });

    const result = await resolveInvoiceCustomer(tx as never, {
      customerName: "Updated Name",
      customerMobile: "9876543210",
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: "cust-existing" },
      data: { name: "Updated Name" },
    });
    expect(create).not.toHaveBeenCalled();
    expect(result.customerId).toBe("cust-existing");
    expect(result.customerJustCreated).toBeNull();
  });

  it("does not create a customer when no customerId and no mobile are provided", async () => {
    const findFirst = vi.fn();
    const create = vi.fn();
    const tx = createMockTx({ findFirst, create });

    const result = await resolveInvoiceCustomer(tx as never, {
      customerName: "Walk-in Guest",
    });

    expect(result.customerId).toBeNull();
    expect(result.customerJustCreated).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
