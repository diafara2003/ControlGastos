import { formatCOP } from "@/src/shared/lib/currency";
import { type TransactionType } from "../model/types";

export function formatTransactionAmount(
  amount: number,
  type: TransactionType
): string {
  const formatted = formatCOP(amount);
  return type === "income" ? `+${formatted}` : `-${formatted}`;
}
