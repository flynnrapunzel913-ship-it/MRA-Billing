import { COACHING_PACKAGE_TYPE } from "@/lib/constants";

export type StatusFilter = "all" | "active" | "passed_out" | "pending_payment";

/** Subscription name from catalog, or "all". */
export type ServiceFilter = "all" | string;

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
  pendingPayment: boolean;
  hasActiveSubscription: boolean;
  hasExpiredSubscription: boolean;
  /** All coaching package descriptions seen on invoices. */
  subscriptionNames: string[];
  activeSubscriptionNames: string[];
  expiredSubscriptionNames: string[];
  /** @deprecated Kept for display status badge logic. */
  renewalDue: boolean;
};

type InvoiceItemLike = {
  itemType: string;
  description?: string;
  packageEndDate?: string | null;
  planNameSnapshot?: string | null;
  descriptionSnapshot?: string | null;
};

type InvoiceLike = {
  customerId?: string | null;
  paymentStatus: string;
  items?: InvoiceItemLike[];
};

const RENEWAL_WINDOW_DAYS = 14;

function normalizeName(value?: string | null) {
  return (value ?? "").trim();
}

function subscriptionPlanLabel(item: InvoiceItemLike): string {
  const snapshot = normalizeName(item.planNameSnapshot);
  if (snapshot) return snapshot;

  const desc = normalizeName(item.description);
  const separator = desc.indexOf(" — ");
  if (separator > 0) return desc.slice(0, separator).trim();

  return desc || "Coaching Package";
}

function namesMatch(a: string, b: string) {
  return normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase();
}

function isCoachingItem(item: InvoiceItemLike) {
  return item.itemType === COACHING_PACKAGE_TYPE;
}

function isPackageActive(endDate?: string | null) {
  if (!endDate) return true;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end >= today;
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

function addUniqueName(list: string[], name: string) {
  const trimmed = normalizeName(name);
  if (!trimmed) return;
  if (!list.some((existing) => namesMatch(existing, trimmed))) {
    list.push(trimmed);
  }
}

function createEmptyEntry(): InvoiceIndexEntry {
  return {
    pendingPayment: false,
    hasActiveSubscription: false,
    hasExpiredSubscription: false,
    subscriptionNames: [],
    activeSubscriptionNames: [],
    expiredSubscriptionNames: [],
    renewalDue: false,
  };
}

/** Build per-customer flags from invoice list API. */
export function buildCustomerInvoiceIndex(
  invoices: InvoiceLike[]
): Map<string, InvoiceIndexEntry> {
  const map = new Map<string, InvoiceIndexEntry>();

  for (const invoice of invoices) {
    const customerId = invoice.customerId;
    if (!customerId) continue;

    const entry = map.get(customerId) ?? createEmptyEntry();

    if (invoice.paymentStatus === "PENDING" || invoice.paymentStatus === "PARTIALLY_PAID") {
      entry.pendingPayment = true;
    }

    for (const item of invoice.items ?? []) {
      if (!isCoachingItem(item)) continue;

      const subscriptionName = subscriptionPlanLabel(item);
      addUniqueName(entry.subscriptionNames, subscriptionName);

      if (isPackageActive(item.packageEndDate)) {
        addUniqueName(entry.activeSubscriptionNames, subscriptionName);
      } else {
        addUniqueName(entry.expiredSubscriptionNames, subscriptionName);
      }

      if (isPackageRenewalDue(item.packageEndDate)) {
        entry.renewalDue = true;
      }
    }

    map.set(customerId, entry);
  }

  for (const entry of map.values()) {
    entry.hasActiveSubscription = entry.activeSubscriptionNames.length > 0;
    entry.hasExpiredSubscription =
      entry.expiredSubscriptionNames.length > 0 && entry.activeSubscriptionNames.length === 0;
  }

  return map;
}

export function isInactiveCustomer(customer: CustomerListRow) {
  return customer.status === "INACTIVE" || customer.status === "SUSPENDED";
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
  if (index?.hasActiveSubscription || customer.status === "ACTIVE") {
    return { label: "Active", variant: "success" };
  }
  if (isInactiveCustomer(customer) || index?.hasExpiredSubscription) {
    return { label: "Passed Out", variant: "secondary" };
  }
  if (customer.status === "ACTIVE") {
    return { label: "Active", variant: "success" };
  }
  return { label: customer.status, variant: "secondary" };
}

export function matchesStatusFilter(
  customer: CustomerListRow,
  filter: StatusFilter,
  index?: InvoiceIndexEntry
) {
  switch (filter) {
    case "all":
      return true;
    case "active":
      return Boolean(index?.hasActiveSubscription);
    case "passed_out":
      return (
        isInactiveCustomer(customer) ||
        Boolean(index?.hasExpiredSubscription) ||
        (Boolean(index?.subscriptionNames.length) && !index?.hasActiveSubscription)
      );
    case "pending_payment":
      return Boolean(index?.pendingPayment);
    default:
      return true;
  }
}

export function matchesServiceFilter(
  filter: ServiceFilter,
  statusFilter: StatusFilter,
  index?: InvoiceIndexEntry
) {
  if (filter === "all") return true;
  if (!index) return false;

  if (statusFilter === "active") {
    return index.activeSubscriptionNames.some((name) => namesMatch(name, filter));
  }

  if (statusFilter === "passed_out") {
    return index.expiredSubscriptionNames.some((name) => namesMatch(name, filter));
  }

  return index.subscriptionNames.some((name) => namesMatch(name, filter));
}

export function matchesCustomerSearch(customer: CustomerListRow, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    customer.name.toLowerCase().includes(q) || (customer.mobile ?? "").includes(q)
  );
}

export function filterCustomers(
  customers: CustomerListRow[],
  options: {
    search: string;
    statusFilter: StatusFilter;
    serviceFilter: ServiceFilter;
    invoiceIndex: Map<string, InvoiceIndexEntry>;
  }
) {
  return customers.filter((customer) => {
    const index = options.invoiceIndex.get(customer.id);

    if (!matchesStatusFilter(customer, options.statusFilter, index)) return false;
    if (!matchesServiceFilter(options.serviceFilter, options.statusFilter, index)) return false;
    if (!matchesCustomerSearch(customer, options.search)) return false;

    return true;
  });
}

export type CustomerSummaryCounts = {
  total: number;
  active: number;
  passedOut: number;
  pendingPayment: number;
};

export function computeCustomerSummaryCounts(
  customers: CustomerListRow[],
  invoiceIndex: Map<string, InvoiceIndexEntry>
): CustomerSummaryCounts {
  let active = 0;
  let passedOut = 0;
  let pendingPayment = 0;

  for (const customer of customers) {
    const index = invoiceIndex.get(customer.id);
    if (matchesStatusFilter(customer, "active", index)) active += 1;
    if (matchesStatusFilter(customer, "passed_out", index)) passedOut += 1;
    if (matchesStatusFilter(customer, "pending_payment", index)) pendingPayment += 1;
  }

  return {
    total: customers.length,
    active,
    passedOut,
    pendingPayment,
  };
}

export function getCustomerCountLabel(options: {
  count: number;
  statusFilter: StatusFilter;
  serviceFilter: ServiceFilter;
  search: string;
}) {
  const { count, statusFilter, serviceFilter, search } = options;
  const noun = count === 1 ? "Customer" : "Customers";
  const hasSearch = search.trim().length > 0;
  const hasService = serviceFilter !== "all";
  const hasStatus = statusFilter !== "all";

  if (hasSearch || (hasService && hasStatus)) {
    return `${count} ${noun} Found`;
  }

  if (hasService) {
    return `${count} ${serviceFilter} ${noun}`;
  }

  if (statusFilter === "active") return `${count} Active ${noun}`;
  if (statusFilter === "passed_out") return `${count} Passed Out ${noun}`;
  if (statusFilter === "pending_payment") return `${count} Pending Payment ${noun}`;

  return `${count} ${noun}`;
}
