"use client";

import { useState } from "react";
import { TransactionCard } from "@/src/entities/transaction";
import type { Transaction } from "@/src/entities/transaction";

import { formatCOP } from "@/src/shared/lib/currency";

/** Get YYYY-MM-DD in Colombia timezone */
function toColombiaDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Bogota" }); // en-CA gives YYYY-MM-DD
}

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

  if (day !== 0 && day !== 6) return null;

  const saturday = day === 6 ? d : new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  const sunday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1);
  const satKey = saturday.toISOString().split("T")[0];
  const sunKey = sunday.toISOString().split("T")[0];

  // Show banner on Saturday. On Sunday, only if Saturday has no transactions.
  if (day === 0 && (grouped[satKey]?.length ?? 0) > 0) return null;

  const all = [...(grouped[satKey] ?? []), ...(grouped[sunKey] ?? [])];
  if (all.length === 0) return null;

  let expenses = 0;
  let income = 0;
  for (const t of all) {
    if (t.type === "expense") expenses += t.amount;
    else income += t.amount;
  }

  return { expenses, income };
}

export function TransactionList({
  transactions,
  loading,
  onTransactionClick,
}: TransactionListProps) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {/* Date header skeleton */}
        <div className="flex justify-between px-3 py-1.5">
          <div className="h-3 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
        </div>
        {/* Transaction rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3 px-1">
            <div className="h-9 w-9 bg-gray-200 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 bg-gray-200 rounded" />
              <div className="h-2.5 w-20 bg-gray-100 rounded" />
            </div>
            <div className="h-3.5 w-20 bg-gray-200 rounded" />
          </div>
        ))}
        {/* Second group */}
        <div className="flex justify-between px-3 py-1.5 mt-2">
          <div className="h-3 w-28 bg-gray-200 rounded" />
          <div className="h-3 w-14 bg-gray-200 rounded" />
        </div>
        {[6, 7, 8].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3 px-1">
            <div className="h-9 w-9 bg-gray-100 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-28 bg-gray-100 rounded" />
              <div className="h-2.5 w-16 bg-gray-50 rounded" />
            </div>
            <div className="h-3.5 w-16 bg-gray-100 rounded" />
          </div>
        ))}
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
      const date = toColombiaDate(t.transaction_date);
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
            {weekendSummary && (() => {
              const wkBalance = weekendSummary.income - weekendSummary.expenses;
              const overspent = weekendSummary.expenses > weekendSummary.income && weekendSummary.income > 0;
              const onlyExpenses = weekendSummary.expenses > 0 && weekendSummary.income === 0;
              const isNegative = overspent || onlyExpenses;

              return (
                <div className={`mb-2 rounded-lg border px-4 py-3 ${
                  isNegative
                    ? "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800"
                    : "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800"
                }`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold ${
                      isNegative ? "text-rose-700 dark:text-rose-300" : "text-purple-700 dark:text-purple-300"
                    }`}>
                      Fin de semana
                    </p>
                    <p className={`text-sm font-bold tabular-nums ${
                      wkBalance >= 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-rose-700 dark:text-rose-300"
                    }`}>
                      {wkBalance >= 0 ? "+" : ""}{formatCOP(wkBalance)}
                    </p>
                  </div>
                  {isNegative && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1">
                      Gastaste {formatCOP(weekendSummary.expenses)}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Date header with daily summary */}
            <div className={`sticky top-0 z-10 px-3 py-1.5 rounded-lg ${isWeekend ? "bg-purple-50 dark:bg-purple-900/10" : "bg-gray-50 dark:bg-slate-900"}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase">
                  {d.toLocaleDateString("es-CO", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                {(expenses > 0 || income > 0) && (
                  <span
                    onClick={() =>
                      setExpandedDate(expandedDate === date ? null : date)
                    }
                    className={`text-xs font-semibold tabular-nums cursor-pointer select-none ${income - expenses >= 0 ? "text-emerald-600" : "text-rose-500"}`}
                  >
                    {income - expenses >= 0 ? "+" : ""}{formatCOP(income - expenses)}
                  </span>
                )}
              </div>
              {expandedDate === date && (expenses > 0 || income > 0) && (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Gastos: -{formatCOP(expenses)}
                  {income > 0 ? ` · Ingresos: +${formatCOP(income)}` : ""}
                </p>
              )}
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
