import { toJsonNumber } from "@/lib/serialize-prisma";

type ExpenseLike = {
  amount: unknown;
  expenseDate: Date | string;
  [key: string]: unknown;
};

export function serializeExpenseForJson<T extends ExpenseLike>(expense: T) {
  return {
    ...expense,
    amount: toJsonNumber(expense.amount),
    expenseDate:
      expense.expenseDate instanceof Date
        ? expense.expenseDate.toISOString()
        : expense.expenseDate,
  };
}
