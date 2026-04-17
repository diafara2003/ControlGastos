"use client";

import { Card, CardContent } from "@/src/shared/ui/card";
import { formatCOP } from "@/src/shared/lib/currency";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Wifi,
} from "lucide-react";

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
  const projectedExpenses = dailyAvgSpent * daysInMonth;
  const projectedBalance = totalIncome - projectedExpenses;

  const monthProgress = dayElapsed / daysInMonth;
  const spendingProgress = totalIncome > 0 ? totalExpenses / totalIncome : 0;
  const spendingTooFast =
    isCurrentMonth && spendingProgress > monthProgress + 0.1;

  return (
    <div className="space-y-3">
      {/* Bank card style */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-5 shadow-xl shadow-slate-900/20">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-white/[0.04] to-transparent rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-emerald-500/[0.06] to-transparent rounded-full translate-y-12 -translate-x-8" />

        {/* Top row: chip + contactless */}
        <div className="flex items-center justify-between mb-6">
          {/* Chip */}
          <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 shadow-sm shadow-amber-500/20 flex items-center justify-center">
            <div className="w-6 h-4 rounded-sm border border-amber-600/30 bg-gradient-to-br from-amber-200 to-amber-400" />
          </div>
          <Wifi className="h-5 w-5 text-slate-500 rotate-90" />
        </div>

        {/* Balance */}
        <div className="mb-1">
          <p className="text-[11px] text-slate-400 font-medium tracking-widest uppercase">
            Disponible
          </p>
          <p className={`text-3xl font-bold tracking-tight mt-1 ${isPositive ? "text-white" : "text-red-400"}`}>
            {formatCOP(balance)}
          </p>
        </div>

        {/* Progress bar */}
        {isCurrentMonth && totalIncome > 0 && (
          <div className="mt-4 mb-3">
            <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
              <span>Gastado {Math.round(spendingProgress * 100)}%</span>
              <span>Día {dayElapsed} de {daysInMonth}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-700/80 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  spendingTooFast
                    ? "bg-gradient-to-r from-orange-400 to-red-400"
                    : "bg-gradient-to-r from-emerald-400 to-teal-400"
                }`}
                style={{ width: `${Math.min(spendingProgress * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Bottom row: income / expenses */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Ingresos</p>
            <p className="text-sm font-semibold text-emerald-400 mt-0.5">
              {formatCOP(totalIncome)}
            </p>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Gastos</p>
            <p className="text-sm font-semibold text-red-400 mt-0.5">
              {formatCOP(totalExpenses)}
            </p>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              {isCurrentMonth ? "Por día" : "Ahorro"}
            </p>
            <p className={`text-sm font-semibold mt-0.5 ${
              (isCurrentMonth ? dailyBudget : balance) >= 0
                ? "text-blue-400"
                : "text-orange-400"
            }`}>
              {isCurrentMonth
                ? dailyBudget > 0
                  ? formatCOP(Math.round(dailyBudget))
                  : "$0"
                : `${totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0}%`}
            </p>
          </div>
        </div>
      </div>

      {/* Spending pace warning */}
      {spendingTooFast && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
            <p className="text-xs text-orange-700">
              <span className="font-semibold">Cuidado:</span> Llevas{" "}
              {Math.round(spendingProgress * 100)}% gastado y solo ha pasado el{" "}
              {Math.round(monthProgress * 100)}% del mes
            </p>
          </CardContent>
        </Card>
      )}

      {/* Projection card (current month only) */}
      {isCurrentMonth && totalIncome > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className={projectedBalance >= 0 ? "border-emerald-100/60" : "border-orange-100/60"}>
            <CardContent className="p-3.5">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  projectedBalance >= 0 ? "bg-emerald-50" : "bg-orange-50"
                }`}>
                  <TrendingUp className={`h-4 w-4 ${
                    projectedBalance >= 0 ? "text-emerald-600" : "text-orange-500"
                  }`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium">Proyección mes</p>
                  <p className={`text-sm font-bold truncate ${
                    projectedBalance >= 0 ? "text-emerald-600" : "text-orange-600"
                  }`}>
                    {formatCOP(Math.round(projectedBalance))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100/60">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium">Gasto diario prom.</p>
                  <p className="text-sm font-bold text-red-600 truncate">
                    {formatCOP(Math.round(dailyAvgSpent))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
