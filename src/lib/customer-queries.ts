import { prisma } from "@/lib/prisma";
import { getActiveCustomerWhere } from "@/lib/customer-filters";
import { getActiveInvoiceWhere, isSchemaDriftError } from "@/lib/invoice-filters";
import type { Prisma } from "@prisma/client";

type CustomerListWhere = Prisma.CustomerWhereInput;

/** List customers with active (non-deleted) invoice counts. */
export async function listCustomersWithInvoiceCounts(
  where: CustomerListWhere,
  options?: { take?: number }
) {
  const [invoiceWhere, customerWhere] = await Promise.all([
    getActiveInvoiceWhere(),
    getActiveCustomerWhere(),
  ]);
  const baseArgs = {
    where: { AND: [where, customerWhere] },
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
  const [invoiceWhere, customerWhere] = await Promise.all([
    getActiveInvoiceWhere(),
    getActiveCustomerWhere(),
  ]);
  const invoiceInclude = {
    where: invoiceWhere,
    orderBy: { invoiceDate: "desc" as const },
    include: { items: true },
  };
  const detailWhere = { id, ...customerWhere };

  try {
    return await prisma.customer.findFirst({
      where: detailWhere,
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

    return prisma.customer.findFirst({
      where: detailWhere,
      include: { invoices: invoiceInclude },
    });
  }
}
