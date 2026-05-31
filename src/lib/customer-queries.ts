import { prisma } from "@/lib/prisma";
import { getActiveInvoiceWhere, isSchemaDriftError } from "@/lib/invoice-filters";
import type { Prisma } from "@prisma/client";

type CustomerListWhere = Prisma.CustomerWhereInput;

/** List customers with active (non-deleted) invoice counts. */
export async function listCustomersWithInvoiceCounts(
  where: CustomerListWhere,
  options?: { take?: number }
) {
  const invoiceWhere = await getActiveInvoiceWhere();
  const baseArgs = {
    where,
    orderBy: { createdAt: "desc" as const },
    ...(options?.take !== undefined ? { take: options.take } : {}),
  };

  return prisma.customer.findMany({
    ...baseArgs,
    include: {
      _count: {
        select: {
          invoices:
            Object.keys(invoiceWhere).length > 0 ? { where: invoiceWhere } : true,
        },
      },
    },
  });
}

/** Load customer profile; omits activities if CRM migration is pending. */
export async function getCustomerWithDetails(id: string) {
  const invoiceWhere = await getActiveInvoiceWhere();
  const invoiceInclude = {
    where: invoiceWhere,
    orderBy: { invoiceDate: "desc" as const },
    include: { items: true },
  };

  try {
    return await prisma.customer.findUnique({
      where: { id },
      include: {
        invoices: invoiceInclude,
        activities: { orderBy: { createdAt: "desc" as const } },
      },
    });
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;

    console.warn(
      "[getCustomerWithDetails] CRM tables missing — run: npx prisma migrate deploy"
    );

    return prisma.customer.findUnique({
      where: { id },
      include: { invoices: invoiceInclude },
    });
  }
}
