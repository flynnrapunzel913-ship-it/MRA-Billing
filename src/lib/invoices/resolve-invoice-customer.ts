import type { Prisma } from "@prisma/client";
import { getActiveCustomerWhere } from "@/lib/customer-filters";
import { sanitizeMobileInput } from "@/lib/mobile-input";
import { generateMembershipId } from "@/lib/utils";

export type InvoiceCustomerInput = {
  customerId?: string | null;
  customerName: string;
  customerMobile?: string | null;
  customerAddress?: string | null;
  customerGst?: string | null;
};

export type ResolvedInvoiceCustomer = {
  customerId: string | null;
  customerName: string;
  customerMobile: string | null;
  customerAddress: string | null;
  customerGst: string | null;
  customerJustCreated: { id: string; name: string } | null;
};

/**
 * Resolves or creates a customer inside an invoice transaction.
 * Customer rows are only persisted when invoice creation proceeds in the same transaction.
 */
export async function resolveInvoiceCustomer(
  tx: Prisma.TransactionClient,
  data: InvoiceCustomerInput
): Promise<ResolvedInvoiceCustomer> {
  let customerId: string | null = data.customerId ?? null;
  let customerName = data.customerName;
  let customerMobile = data.customerMobile?.trim() || null;
  let customerAddress = data.customerAddress?.trim() || null;
  let customerGst = data.customerGst?.trim() || null;
  let customerJustCreated: { id: string; name: string } | null = null;
  const activeCustomerWhere = await getActiveCustomerWhere();

  if (customerId) {
    const customer = await tx.customer.findFirst({
      where: { id: customerId, ...activeCustomerWhere },
    });
    if (!customer) {
      throw new Error("Selected customer not found");
    }
    return {
      customerId: customer.id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      customerAddress: customer.address,
      customerGst: customer.gstNumber,
      customerJustCreated: null,
    };
  }

  const mobile = data.customerMobile ? sanitizeMobileInput(data.customerMobile) : "";
  if (mobile) {
    const existing = await tx.customer.findFirst({
      where: { mobile, ...activeCustomerWhere },
    });
    if (existing) {
      if (existing.name !== data.customerName) {
        await tx.customer.update({
          where: { id: existing.id },
          data: { name: data.customerName },
        });
      }
      customerId = existing.id;
      customerName = existing.name;
      customerMobile = existing.mobile;
      customerAddress = existing.address;
      customerGst = existing.gstNumber;
    } else {
      const customer = await tx.customer.create({
        data: {
          name: data.customerName,
          mobile,
          address: data.customerAddress?.trim() || null,
          gstNumber: data.customerGst || null,
          membershipId: generateMembershipId(),
        },
      });
      customerId = customer.id;
      customerName = customer.name;
      customerMobile = customer.mobile;
      customerAddress = customer.address;
      customerGst = customer.gstNumber;
      customerJustCreated = { id: customer.id, name: customer.name };
    }
  }

  return {
    customerId,
    customerName,
    customerMobile,
    customerAddress,
    customerGst,
    customerJustCreated,
  };
}
