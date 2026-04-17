"use client";

import { formatCOP } from "@/src/shared/lib/currency";

interface SpendingChartProps {
  totalExpenses: number;
  totalIncome: number;
  selectedDate?: Date;
}

export function SpendingChart({
  totalExpenses,
  totalIncome,
  selectedDate,
}: SpendingChartProps) {
  const balance = totalIncome - totalExpenses;
  const isPositive = balance >= 0;

  const now = new Date();
  const date = selectedDate ?? now;
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth =
    now.getMonth() === month && now.getFullYear() === year;
  const dayElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  const daysLeft = isCurrentMonth ? daysInMonth - dayElapsed : 0;
  const dailyBudget = daysLeft > 0 ? balance / daysLeft : 0;
  const spendingProgress = totalIncome > 0 ? totalExpenses / totalIncome : 0;

  return (
    <div className="space-y-4">
      {/* Balance card — emerald theme */}
      <div className="rounded-2xl bg-emerald-600 px-5 pt-5 pb-4">
        <p className="text-xs font-medium text-emerald-100/70 tracking-wide">
          Saldo disponible
        </p>
        <p
          className={`text-[32px] font-bold mt-0.5 tracking-tight tabular-nums ${
            isPositive ? "text-white" : "text-red-300"
          }`}
          style={{ letterSpacing: "-0.02em" }}
        >
          {formatCOP(balance)}
        </p>

        {isCurrentMonth && daysLeft > 0 && totalIncome > 0 && (
          <p className="text-xs text-emerald-100 mt-1.5">
            Puedes gastar{" "}
            <span className="font-semibold text-white">
              {dailyBudget > 0 ? formatCOP(Math.round(dailyBudget)) : "$0"}
            </span>{" "}
            por día
          </p>
        )}

        {totalIncome > 0 && (
          <div className="mt-4">
            <div className="h-1 rounded-full bg-emerald-500/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${Math.min(spendingProgress * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-emerald-200/60">
              <span>{Math.round(spendingProgress * 100)}% gastado</span>
              <span>
                {isCurrentMonth
                  ? `Día ${dayElapsed} de ${daysInMonth}`
                  : "Mes completo"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Income / Expenses */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
            Ingresos
          </p>
          <p className="text-lg font-bold text-emerald-600 mt-0.5 tabular-nums">
            {formatCOP(totalIncome)}
          </p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
            Gastos
          </p>
          <p className="text-lg font-bold text-red-600 mt-0.5 tabular-nums">
            {formatCOP(totalExpenses)}
          </p>
        </div>
      </div>
    </div>
  );
}
