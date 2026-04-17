"use client";

import { formatTransactionAmount } from "../lib/formatAmount";
import { formatShortDate } from "@/src/shared/lib/date";
import { CategoryBadge } from "@/src/entities/category";
import type { Transaction } from "../model/types";

interface TransactionCardProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionCard({ transaction, onClick }: TransactionCardProps) {
  const isIncome = transaction.type === "income";

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg">
        {transaction.category?.icon ?? "💳"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-gray-900">
          {transaction.merchant}
        </p>
        <p className="text-xs text-gray-500">
          {formatShortDate(transaction.transaction_date)}
          {transaction.category && (
            <>
              {" · "}
              <CategoryBadge
                name={transaction.category.name}
                color={transaction.category.color}
              />
            </>
          )}
        </p>
      </div>
      <span
        className={`text-sm font-semibold whitespace-nowrap ${
          isIncome ? "text-emerald-600" : "text-gray-900"
        }`}
      >
        {formatTransactionAmount(transaction.amount, transaction.type)}
      </span>
    </button>
  );
}
