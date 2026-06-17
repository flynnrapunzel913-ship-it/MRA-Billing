import type { Prisma } from "@prisma/client";

/**
 * DEVELOPMENT / TESTING ticket numbering — NOT for production.
 *
 * - Empty database → next ticket is 1
 * - Deleted tickets free their numbers (lowest available gap is reused)
 *
 * Before production: replace imports of `allocateCasualSwimTicketNumber` with a
 * monotonic sequence implementation (see CasualSwimTicketSequence in schema).
 */

type TicketNumberTx = Pick<Prisma.TransactionClient, "casualSwimBill">;

/** Pure helper — smallest positive integer not used by an existing ticket. */
export function nextDevTicketNumber(existingTicketNumbers: number[]): number {
  if (existingTicketNumbers.length === 0) return 1;

  const sorted = [...existingTicketNumbers].sort((a, b) => a - b);
  let candidate = 1;
  for (const n of sorted) {
    if (n === candidate) candidate += 1;
    else if (n > candidate) break;
  }
  return candidate;
}

export async function allocateCasualSwimTicketNumber(tx: TicketNumberTx): Promise<number> {
  const rows = await tx.casualSwimBill.findMany({
    select: { ticketNumber: true },
  });
  return nextDevTicketNumber(rows.map((row) => row.ticketNumber));
}
