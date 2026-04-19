"use client";

import { TransactionCard } from "@/src/entities/transaction";
import type { Transaction } from "@/src/entities/transaction";
import { Spinner } from "@/src/shared/ui/spinner";
import { formatCOP } from "@/src/shared/lib/currency";

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
}

function getDaySummary(txns: Transaction[]) {
  let expenses = 0;
  let income = 0;
  for (const t of txns) {
    if (t.type === "expense") expenses += t.amount;
    else income += t.amount;
  }
  return { expenses, income };
}

function getWeekendSummary(
  grouped: Record<string, Transaction[]>,
  currentDate: string
) {
  const d = new Date(currentDate + "T12:00:00");
  const day = d.getDay(); // 0=domingo, 6=sábado

  if (day !== 6) return null; // Solo mostrar en sábado

  // Buscar el domingo siguiente
  const sunday = new Date(d);
  sunday.setDate(sunday.getDate() + 1);
  const sundayKey = sunday.toISOString().split("T")[0];

  const satTxns = grouped[currentDate] ?? [];
  const sunTxns = grouped[sundayKey] ?? [];
  const all = [...satTxns, ...sunTxns];

  if (all.length === 0) return null;

  let expenses = 0;
  let income = 0;
  for (const t of all) {
    if (t.type === "expense") expenses += t.amount;
    else income += t.amount;
  }

  return { expenses, income, hasSunday: sunTxns.length > 0 };
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
      {Object.entries(grouped).map(([date, txns]) => {
        const { expenses, income } = getDaySummary(txns);
        const d = new Date(date + "T12:00:00");
        const dayOfWeek = d.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const weekendSummary = getWeekendSummary(grouped, date);

        return (
          <div key={date}>
            {/* Weekend summary banner — only on Saturday */}
            {weekendSummary && (
              <div className="mb-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 px-3 py-2">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                  Fin de semana
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  {weekendSummary.expenses > 0 && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      Gastos: -{formatCOP(weekendSummary.expenses)}
                    </span>
                  )}
                  {weekendSummary.income > 0 && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                      Ingresos: +{formatCOP(weekendSummary.income)}
                    </span>
                  )}
                  <span className={`text-sm font-bold ${weekendSummary.income - weekendSummary.expenses >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                    Total: {weekendSummary.income - weekendSummary.expenses >= 0 ? "+" : ""}{formatCOP(weekendSummary.income - weekendSummary.expenses)}
                  </span>
                </div>
              </div>
            )}

            {/* Date header with daily summary */}
            <div className={`sticky top-0 z-10 px-3 py-1.5 flex items-center justify-between ${isWeekend ? "bg-purple-50/50 dark:bg-purple-900/10" : "bg-gray-50 dark:bg-slate-900"}`}>
              <p className="text-xs font-medium text-gray-500 uppercase">
                {d.toLocaleDateString("es-CO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <div className="flex items-center gap-2">
                {expenses > 0 && (
                  <span className="text-xs text-red-500">
                    -{formatCOP(expenses)}
                  </span>
                )}
                {income > 0 && (
                  <span className="text-xs text-emerald-600">
                    +{formatCOP(income)}
                  </span>
                )}
                {(expenses > 0 || income > 0) && (
                  <span className={`text-xs font-bold ${income - expenses >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                    {income - expenses >= 0 ? "+" : ""}{formatCOP(income - expenses)}
                  </span>
                )}
              </div>
            </div>

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
        );
      })}
    </div>
  );
}
