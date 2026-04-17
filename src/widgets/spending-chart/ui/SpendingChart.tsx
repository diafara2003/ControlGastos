"use client";

import { Card, CardContent } from "@/src/shared/ui/card";
import { formatCOP } from "@/src/shared/lib/currency";
import { AlertTriangle } from "lucide-react";

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

  const dailyAvgSpent = dayElapsed > 0 ? totalExpenses / dayElapsed : 0;
  const dailyBudget = daysLeft > 0 ? balance / daysLeft : 0;

  const monthProgress = dayElapsed / daysInMonth;
  const spendingProgress = totalIncome > 0 ? totalExpenses / totalIncome : 0;
  const spendingTooFast =
    isCurrentMonth && spendingProgress > monthProgress + 0.1;

  // Progress bar color
  const barColor = spendingTooFast
    ? "from-orange-400 to-red-400"
    : spendingProgress > 0.6
      ? "from-yellow-400 to-orange-400"
      : "from-emerald-400 to-teal-400";

  return (
    <div className="space-y-3">
      {/* Hero balance — gradient section, no card border */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 px-6 pt-6 pb-5">
        {/* Soft decorative glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/[0.07] blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-indigo-400/10 blur-xl" />

        {/* Label */}
        <p className="relative text-sm font-medium text-white/65 tracking-wide">
          Saldo disponible
        </p>

        {/* Amount */}
        <p
          className={`relative text-4xl font-bold mt-1.5 tracking-tight tabular-nums ${
            isPositive ? "text-white" : "text-red-300"
          }`}
          style={{ letterSpacing: "-0.02em" }}
        >
          {formatCOP(balance)}
        </p>

        {/* Daily budget pill */}
        {isCurrentMonth && daysLeft > 0 && totalIncome > 0 && (
          <div className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/[0.12] px-3 py-1">
            <span className="text-[11px] text-white/70">Hoy puedes gastar</span>
            <span className="text-[11px] font-semibold text-white">
              {dailyBudget > 0 ? formatCOP(Math.round(dailyBudget)) : "$0"}
            </span>
          </div>
        )}

        {/* Progress bar */}
        {totalIncome > 0 && (
          <div className="relative mt-4">
            <div className="flex justify-between text-[10px] text-white/50 mb-1.5">
              <span>
                {Math.round(spendingProgress * 100)}% gastado
              </span>
              <span>
                {isCurrentMonth
                  ? `Día ${dayElapsed} de ${daysInMonth}`
                  : "Mes completo"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.12] overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
                style={{
                  width: `${Math.min(spendingProgress * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Income / Expenses row */}
        <div className="relative flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.1]">
          <div className="flex-1">
            <p className="text-[10px] text-white/50 uppercase tracking-wider">
              Ingresos
            </p>
            <p className="text-base font-semibold text-emerald-300 mt-0.5 tabular-nums">
              {formatCOP(totalIncome)}
            </p>
          </div>
          <div className="w-px h-8 bg-white/[0.1]" />
          <div className="flex-1">
            <p className="text-[10px] text-white/50 uppercase tracking-wider">
              Gastos
            </p>
            <p className="text-base font-semibold text-red-300 mt-0.5 tabular-nums">
              {formatCOP(totalExpenses)}
            </p>
            {isCurrentMonth && dayElapsed > 0 && (
              <p className="text-[9px] text-white/40 mt-0.5">
                ~{formatCOP(Math.round(dailyAvgSpent))}/día
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Spending pace warning */}
      {spendingTooFast && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
            <p className="text-xs text-orange-700">
              Llevas {Math.round(spendingProgress * 100)}% gastado y solo ha
              pasado el {Math.round(monthProgress * 100)}% del mes
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
