import { COACHING_PACKAGE_TYPE } from "@/lib/constants";

export type QuickFilter =
  | "all"
  | "active"
  | "renewal_due"
  | "pending_payment"
  | "recent";

export type ServiceFilter = "all" | "swimming" | "coaching";

export type CustomerListRow = {
  id: string;
  name: string;
  mobile: string | null;
  membershipId: string;
  status: string;
  dateJoined: string;
  createdAt?: string;
  _count: { invoices: number };
};

export type InvoiceIndexEntry = {
  hasCoaching: boolean;
  hasSwimming: boolean;
  renewalDue: boolean;
  pendingPayment: boolean;
};

type InvoiceItemLike = {
  itemType: string;
  description?: string;
  packageEndDate?: string | null;
};

type InvoiceLike = {
  customerId?: string | null;
  paymentStatus: string;
  items?: InvoiceItemLike[];
};

const RENEWAL_WINDOW_DAYS = 14;

function isCoachingItem(item: InvoiceItemLike) {
  return item.itemType === COACHING_PACKAGE_TYPE;
}

function isSwimmingItem(item: InvoiceItemLike) {
  if (isCoachingItem(item)) return false;
  const text = `${item.itemType} ${item.description ?? ""}`.toLowerCase();
  return text.includes("swim") || item.itemType !== COACHING_PACKAGE_TYPE;
}

function isPackageRenewalDue(endDate?: string | null) {
  if (!endDate) return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + RENEWAL_WINDOW_DAYS);
  return end <= windowEnd;
}

/** Build per-customer flags from existing invoice list API (no backend changes). */
export function buildCustomerInvoiceIndex(
  invoices: InvoiceLike[]
): Map<string, InvoiceIndexEntry> {
  const map = new Map<string, InvoiceIndexEntry>();

  for (const invoice of invoices) {
    const customerId = invoice.customerId;
    if (!customerId) continue;

    const entry = map.get(customerId) ?? {
      hasCoaching: false,
      hasSwimming: false,
      renewalDue: false,
      pendingPayment: false,
    };

    if (invoice.paymentStatus === "PENDING" || invoice.paymentStatus === "PARTIALLY_PAID") {
      entry.pendingPayment = true;
    }

    for (const item of invoice.items ?? []) {
      if (isCoachingItem(item)) {
        entry.hasCoaching = true;
        if (isPackageRenewalDue(item.packageEndDate)) {
          entry.renewalDue = true;
        }
      }
      if (isSwimmingItem(item)) {
        entry.hasSwimming = true;
      }
    }

    map.set(customerId, entry);
  }

  return map;
}

export function getDisplayStatus(
  customer: CustomerListRow,
  index?: InvoiceIndexEntry
): { label: string; variant: "success" | "warning" | "destructive" | "secondary" } {
  if (index?.renewalDue) {
    return { label: "Renewal Due", variant: "warning" };
  }
  if (index?.pendingPayment) {
    return { label: "Pending Payment", variant: "destructive" };
  }
  if (customer.status === "ACTIVE") {
    return { label: "Active", variant: "success" };
  }
  if (customer.status === "SUSPENDED") {
    return { label: "Suspended", variant: "secondary" };
  }
  if (customer.status === "INACTIVE") {
    return { label: "Inactive", variant: "secondary" };
  }
  return { label: customer.status, variant: "secondary" };
}

function isRecentCustomer(customer: CustomerListRow) {
  const joined = new Date(customer.dateJoined);
  if (Number.isNaN(joined.getTime())) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return joined >= cutoff;
}

export function matchesQuickFilter(
  customer: CustomerListRow,
  filter: QuickFilter,
  index?: InvoiceIndexEntry
) {
  switch (filter) {
    case "all":
      return true;
    case "active":
      return customer.status === "ACTIVE" && !index?.renewalDue && !index?.pendingPayment;
    case "renewal_due":
      return Boolean(index?.renewalDue);
    case "pending_payment":
      return Boolean(index?.pendingPayment);
    case "recent":
      return isRecentCustomer(customer);
    default:
      return true;
  }
}

export function matchesServiceFilter(
  customerId: string,
  filter: ServiceFilter,
  index?: InvoiceIndexEntry
) {
  if (filter === "all") return true;
  if (filter === "coaching") return Boolean(index?.hasCoaching);
  if (filter === "swimming") return Boolean(index?.hasSwimming);
  return true;
}

export function filterCustomers(
  customers: CustomerListRow[],
  options: {
    search: string;
    quickFilter: QuickFilter;
    serviceFilter: ServiceFilter;
    invoiceIndex: Map<string, InvoiceIndexEntry>;
  }
) {
  const q = options.search.trim().toLowerCase();

  return customers.filter((customer) => {
    const index = options.invoiceIndex.get(customer.id);

    if (!matchesQuickFilter(customer, options.quickFilter, index)) return false;
    if (!matchesServiceFilter(customer.id, options.serviceFilter, index)) return false;

    if (!q) return true;

    return (
      customer.name.toLowerCase().includes(q) ||
      (customer.mobile ?? "").includes(q) ||
      customer.membershipId.toLowerCase().includes(q)
    );
  });
}
