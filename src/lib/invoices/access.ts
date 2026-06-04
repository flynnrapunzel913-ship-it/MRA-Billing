import { Invoice, Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveInvoiceWhere } from "@/lib/invoice-filters";

/** Prisma cuid() — reject malformed IDs early (enumeration / injection hardening). */
const CUID_PATTERN = /^c[a-z0-9]{24}$/i;

export type InvoiceActor = {
  id: string;
  role: Role | string;
};

export function normalizeInvoiceId(raw: string): string | null {
  const id = raw?.trim();
  if (!id || !CUID_PATTERN.test(id)) return null;
  return id;
}

export function normalizeCustomerId(raw: string): string | null {
  return normalizeInvoiceId(raw);
}

/**
 * Read scope: authenticated staff may view active (non-deleted) academy invoices.
 * Receptionist list/detail UIs load organization-wide invoice data.
 */
export function canViewInvoice(
  actor: InvoiceActor,
  invoice: { createdById: string }
): boolean {
  void actor;
  void invoice;
  return true;
}

/** Delete: admins any invoice; receptionists only invoices they created. */
export function canDeleteInvoice(
  role: Role | string | undefined,
  userId: string | undefined,
  invoice: { createdById?: string | null }
): boolean {
  if (role === Role.ADMIN) return true;
  if (!userId || !invoice.createdById) return false;
  return invoice.createdById === userId;
}

export function canDuplicateInvoice(
  actor: InvoiceActor,
  invoice: { createdById: string }
): boolean {
  return canViewInvoice(actor, invoice);
}

export function invoiceNotFoundResponse() {
  return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
}

export function invoiceForbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type FindInvoiceOptions = {
  include?: Prisma.InvoiceInclude;
};

export type AccessibleInvoiceResult<T = Invoice> =
  | { ok: true; invoice: T }
  | { ok: false; status: 404 }
  | { ok: false; status: 403 };

/**
 * Load a single active invoice and enforce read authorization.
 * Returns 404 for unknown IDs (including invalid cuid) to avoid ID enumeration.
 */
export async function findAccessibleInvoice<T = Invoice>(
  rawId: string,
  actor: InvoiceActor,
  options?: FindInvoiceOptions
): Promise<AccessibleInvoiceResult<T>> {
  const id = normalizeInvoiceId(rawId);
  if (!id) {
    return { ok: false, status: 404 };
  }

  const invoiceWhere = await getActiveInvoiceWhere();
  const invoice = await prisma.invoice.findFirst({
    where: { id, ...invoiceWhere },
    include: options?.include,
  });

  if (!invoice) {
    return { ok: false, status: 404 };
  }

  if (!canViewInvoice(actor, { createdById: invoice.createdById })) {
    return { ok: false, status: 403 };
  }

  return { ok: true, invoice: invoice as T };
}

/** Verify optional customer link exists before attaching to a new invoice. */
export async function assertAccessibleCustomer(
  rawCustomerId: string | null | undefined
): Promise<{ ok: true } | { ok: false; status: 404 }> {
  if (!rawCustomerId?.trim()) {
    return { ok: true };
  }

  const customerId = normalizeCustomerId(rawCustomerId);
  if (!customerId) {
    return { ok: false, status: 404 };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  });

  if (!customer) {
    return { ok: false, status: 404 };
  }

  return { ok: true };
}
