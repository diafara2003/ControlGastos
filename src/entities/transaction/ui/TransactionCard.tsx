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
      className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200 hover:bg-gray-50 active:bg-gray-100 active:scale-[0.99]"
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg transition-transform duration-200 ${
        isIncome ? "bg-emerald-50" : "bg-gray-50"
      }`}>
        {transaction.category?.icon ?? "💳"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-gray-900 text-[15px]">
          {transaction.merchant}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatShortDate(transaction.transaction_date)}
          {transaction.card_last_four && (
            <span className="text-gray-300"> · *{transaction.card_last_four}</span>
          )}
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
        className={`text-sm font-semibold whitespace-nowrap tabular-nums ${
          isIncome ? "text-emerald-600" : "text-gray-800"
        }`}
      >
        {formatTransactionAmount(transaction.amount, transaction.type)}
      </span>
    </button>
  );
}
