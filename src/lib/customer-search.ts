export type CustomerSearchResult = {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  membershipId: string;
  dateJoined: string;
  status: string;
};

export function customerToSearchResult(customer: {
  id: string;
  name: string;
  mobile: string | null;
  email?: string | null;
  address?: string | null;
  gstNumber?: string | null;
  membershipId: string;
  dateJoined: string | Date;
  status: string;
}): CustomerSearchResult {
  return {
    id: customer.id,
    name: customer.name,
    mobile: customer.mobile,
    email: customer.email ?? null,
    address: customer.address ?? null,
    gstNumber: customer.gstNumber ?? null,
    membershipId: customer.membershipId,
    dateJoined:
      typeof customer.dateJoined === "string"
        ? customer.dateJoined
        : customer.dateJoined.toISOString(),
    status: customer.status,
  };
}

/** Prefill name or mobile from search query when opening quick-create */
export function parseSearchQueryForCreate(query: string): { name: string; mobile: string } {
  const trimmed = query.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 6) {
    return { name: "", mobile: digits };
  }
  return { name: trimmed, mobile: "" };
}
