"use client";

import { TransactionCard } from "@/src/entities/transaction";
import type { Transaction } from "@/src/entities/transaction";
import { Spinner } from "@/src/shared/ui/spinner";

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
}

export function TransactionList({
  transactions,
  loading,
  onTransactionClick,
}: TransactionListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No hay transacciones para mostrar</p>
      </div>
    );
  }

  // Group by date
  const grouped = transactions.reduce<Record<string, Transaction[]>>(
    (acc, t) => {
      const date = t.transaction_date.split("T")[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(t);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, txns]) => (
        <div key={date}>
          <p className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">
            {new Date(date + "T12:00:00").toLocaleDateString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <div className="divide-y divide-gray-100 bg-white dark:bg-slate-800 rounded-lg">
            {txns.map((t) => (
              <TransactionCard
                key={t.id}
                transaction={t}
                onClick={
                  onTransactionClick
                    ? () => onTransactionClick(t)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
