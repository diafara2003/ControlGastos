"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { TransactionCard } from "@/src/entities/transaction";
import type { Transaction } from "@/src/entities/transaction";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/shared/ui/dialog";
import { Button } from "@/src/shared/ui/button";

import { formatCOP } from "@/src/shared/lib/currency";
import { useCycleConfig } from "@/src/shared/context/cycle-config";

/** Get YYYY-MM-DD in Colombia timezone */
function toColombiaDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Bogota" }); // en-CA gives YYYY-MM-DD
}

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
  onDeleteMonth?: (year: number, month: number) => void;
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

  // Show banner on Sunday (first in desc order). On Saturday, only if Sunday has no transactions.
  if (day === 6 && (grouped[sunKey]?.length ?? 0) > 0) return null;

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

/** Get period key for a date string, using cycle config */
function toMonthKeyWithCycle(
  dateStr: string,
  periodKeyFn: (d: Date) => string
): string {
  const d = new Date(dateStr + "T12:00:00");
  return periodKeyFn(d);
}

function getMonthLabelWithCycle(
  dateStr: string,
  periodMonthNameFn: (d: Date) => string
): string {
  const d = new Date(dateStr + "T12:00:00");
  const name = periodMonthNameFn(d);
  const year = d.getFullYear();
  const label = `${name} ${year}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function TransactionList({
  transactions,
  loading,
  onTransactionClick,
  onDeleteMonth,
}: TransactionListProps) {
  const cycle = useCycleConfig();
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [deleteMonth, setDeleteMonth] = useState<{ year: number; month: number; label: string } | null>(null);

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
      {Object.entries(grouped).map(([date, txns], index, entries) => {
        const { expenses, income } = getDaySummary(txns);
        const d = new Date(date + "T12:00:00");
        const dayOfWeek = d.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const weekendSummary = getWeekendSummary(grouped, date);

        const currentMonth = toMonthKeyWithCycle(date, cycle.periodKey);
        const prevMonth = index > 0 ? toMonthKeyWithCycle(entries[index - 1][0], cycle.periodKey) : null;
        const showMonthHeader = currentMonth !== prevMonth;

        return (
          <div key={date}>
            {showMonthHeader && (
              <div className="flex items-center justify-between bg-gray-100 dark:bg-slate-800 rounded-lg px-4 py-2 mb-2">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  {getMonthLabelWithCycle(date, cycle.periodMonthName)}
                </span>
                {onDeleteMonth && (
                  <button
                    type="button"
                    aria-label={`Eliminar transacciones de ${getMonthLabelWithCycle(date, cycle.periodMonthName)}`}
                    onClick={() => setDeleteMonth({ year: d.getFullYear(), month: d.getMonth() + 1, label: getMonthLabelWithCycle(date, cycle.periodMonthName) })}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            {/* Weekend summary — before Sunday (first day in desc order) */}
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
                      Resumen fin de semana
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

      <Dialog open={!!deleteMonth} onOpenChange={(open) => { if (!open) setDeleteMonth(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Eliminar mes completo
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            ¿Eliminar <span className="font-semibold">todas</span> las transacciones de{" "}
            <span className="font-semibold">{deleteMonth?.label}</span>?
          </p>
          <p className="text-xs text-gray-400 mt-1">Esta acción no se puede deshacer.</p>
          <div className="flex gap-3 mt-5">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteMonth(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                if (deleteMonth && onDeleteMonth) {
                  onDeleteMonth(deleteMonth.year, deleteMonth.month);
                }
                setDeleteMonth(null);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
