import { describe, expect, it } from "vitest";
import {
  buildCustomerInvoiceIndex,
  computeCustomerSummaryCounts,
  filterCustomers,
  getCustomerCountLabel,
  matchesStatusFilter,
} from "@/lib/customer-list-utils";
import type { CustomerListRow } from "@/lib/customer-list-utils";

const baseCustomer = (id: string, overrides: Partial<CustomerListRow> = {}): CustomerListRow => ({
  id,
  name: `Customer ${id}`,
  mobile: "9876543210",
  membershipId: `MRA${id}`,
  status: "ACTIVE",
  dateJoined: "2026-01-01",
  _count: { invoices: 1 },
  ...overrides,
});

describe("buildCustomerInvoiceIndex", () => {
  it("tracks active and expired subscriptions by description", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);

    const index = buildCustomerInvoiceIndex([
      {
        customerId: "c1",
        paymentStatus: "FULLY_PAID",
        items: [
          {
            itemType: "Coaching Package",
            description: "Summer Camp",
            packageEndDate: future.toISOString(),
          },
        ],
      },
      {
        customerId: "c2",
        paymentStatus: "FULLY_PAID",
        items: [
          {
            itemType: "Coaching Package",
            description: "Monthly Coaching",
            packageEndDate: past.toISOString(),
          },
        ],
      },
    ]);

    expect(index.get("c1")?.hasActiveSubscription).toBe(true);
    expect(index.get("c2")?.hasExpiredSubscription).toBe(true);
  });

  it("flags pending payment from invoice status", () => {
    const index = buildCustomerInvoiceIndex([
      {
        customerId: "c1",
        paymentStatus: "PARTIALLY_PAID",
        items: [],
      },
    ]);
    expect(index.get("c1")?.pendingPayment).toBe(true);
  });
});

describe("filterCustomers", () => {
  const customers = [
    baseCustomer("c1"),
    baseCustomer("c2", { status: "INACTIVE" }),
    baseCustomer("c3"),
  ];

  const future = new Date();
  future.setFullYear(future.getFullYear() + 1);
  const past = new Date();
  past.setFullYear(past.getFullYear() - 1);

  const invoiceIndex = buildCustomerInvoiceIndex([
    {
      customerId: "c1",
      paymentStatus: "FULLY_PAID",
      items: [
        {
          itemType: "Coaching Package",
          description: "Summer Camp",
          packageEndDate: future.toISOString(),
        },
      ],
    },
    {
      customerId: "c2",
      paymentStatus: "FULLY_PAID",
      items: [
        {
          itemType: "Coaching Package",
          description: "Monthly Coaching",
          packageEndDate: past.toISOString(),
        },
      ],
    },
    {
      customerId: "c3",
      paymentStatus: "PENDING",
      items: [
        {
          itemType: "Coaching Package",
          description: "Summer Camp",
          packageEndDate: future.toISOString(),
        },
      ],
    },
  ]);

  it("filters active customers with a specific service", () => {
    const result = filterCustomers(customers, {
      search: "",
      statusFilter: "active",
      serviceFilter: "Summer Camp",
      invoiceIndex,
    });
    expect(result.map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("filters pending payment customers by service", () => {
    const result = filterCustomers(customers, {
      search: "",
      statusFilter: "pending_payment",
      serviceFilter: "Summer Camp",
      invoiceIndex,
    });
    expect(result.map((c) => c.id)).toEqual(["c3"]);
  });

  it("filters passed out customers by expired service", () => {
    const result = filterCustomers(customers, {
      search: "",
      statusFilter: "passed_out",
      serviceFilter: "Monthly Coaching",
      invoiceIndex,
    });
    expect(result.map((c) => c.id)).toEqual(["c2"]);
  });

  it("searches by name and mobile only", () => {
    const result = filterCustomers(customers, {
      search: "9876543210",
      statusFilter: "all",
      serviceFilter: "all",
      invoiceIndex,
    });
    expect(result).toHaveLength(3);
  });
});

describe("getCustomerCountLabel", () => {
  it("returns status-specific labels", () => {
    expect(
      getCustomerCountLabel({ count: 15, statusFilter: "active", serviceFilter: "all", search: "" })
    ).toBe("15 Active Students");
  });

  it("returns combined filter label", () => {
    expect(
      getCustomerCountLabel({
        count: 8,
        statusFilter: "active",
        serviceFilter: "Summer Camp",
        search: "",
      })
    ).toBe("8 Students Found");
  });
});

describe("computeCustomerSummaryCounts", () => {
  it("counts summary buckets", () => {
    const customers = [baseCustomer("c1"), baseCustomer("c2", { status: "INACTIVE" })];
    const invoiceIndex = buildCustomerInvoiceIndex([
      {
        customerId: "c1",
        paymentStatus: "PENDING",
        items: [
          {
            itemType: "Coaching Package",
            description: "Kids Batch",
            packageEndDate: new Date(Date.now() + 86400000).toISOString(),
          },
        ],
      },
    ]);

    const summary = computeCustomerSummaryCounts(customers, invoiceIndex);
    expect(summary.total).toBe(2);
    expect(summary.active).toBe(1);
    expect(summary.pendingPayment).toBe(1);
    expect(summary.passedOut).toBe(1);
  });
});

describe("matchesStatusFilter", () => {
  it("treats inactive customers as passed out", () => {
    const customer = baseCustomer("x", { status: "INACTIVE" });
    expect(matchesStatusFilter(customer, "passed_out")).toBe(true);
    expect(matchesStatusFilter(customer, "active")).toBe(false);
  });
});
