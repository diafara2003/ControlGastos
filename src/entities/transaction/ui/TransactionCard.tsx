"use client";

import { formatTransactionAmount } from "../lib/formatAmount";
import { formatShortDate } from "@/src/shared/lib/date";
import { LucideIcon } from "@/src/shared/ui/lucide-icon";
import type { Transaction } from "../model/types";

interface TransactionCardProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionCard({ transaction, onClick }: TransactionCardProps) {
  const isIncome = transaction.type === "income";
  const isWithdrawal =
    transaction.category?.name === "Retiro cajero" ||
    transaction.category?.name === "Efectivo" ||
    /cajero|retiro|atm|servibanca/i.test(transaction.merchant);
  const pendingDetails = isWithdrawal && !transaction.withdrawal_resolved;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3 px-1 text-left transition-colors active:bg-gray-50"
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 ${
          isIncome ? "bg-emerald-50" : "bg-gray-50"
        }`}
      >
        <LucideIcon
          name={transaction.category?.icon ?? "credit-card"}
          size={18}
          className={isIncome ? "text-emerald-600" : "text-gray-500"}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-gray-900 text-sm leading-tight">
          {transaction.merchant}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatShortDate(transaction.transaction_date)}
          {transaction.category && (
            <span className="text-gray-300"> · {transaction.category.name}</span>
          )}
          {transaction.classification_method === "pattern" && (
            <span className="ml-1 text-[9px] text-violet-500 font-medium bg-violet-50 px-1 py-0.5 rounded">
              sugerida
            </span>
          )}
          {isWithdrawal && transaction.withdrawal_resolved && (
            <span className="ml-1 text-[9px] text-emerald-600 font-medium bg-emerald-50 px-1 py-0.5 rounded">
              detallado
            </span>
          )}
          {pendingDetails && (
            <span className="ml-1 text-[9px] text-amber-600 font-medium bg-amber-50 px-1 py-0.5 rounded">
              sin detallar
            </span>
          )}
        </p>
      </div>
      <span
        className={`text-sm font-semibold whitespace-nowrap tabular-nums ${
          isIncome ? "text-emerald-600" : pendingDetails ? "text-amber-600" : "text-gray-900"
        }`}
      >
        {formatTransactionAmount(transaction.amount, transaction.type)}
      </span>
    </button>
  );
}
