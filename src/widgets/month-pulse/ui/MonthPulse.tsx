"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { formatCOP } from "@/src/shared/lib/currency";

interface MonthPulseProps {
  totalExpenses: number;
  totalIncome: number;
  lastMonthExpensesSameDay: number;
  selectedDate: Date;
}

export function MonthPulse({
  totalExpenses,
  totalIncome,
  lastMonthExpensesSameDay,
  selectedDate,
}: MonthPulseProps) {
  const now = new Date();
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth =
    now.getMonth() === month && now.getFullYear() === year;
  const dayElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  const daysLeft = Math.max(daysInMonth - dayElapsed, 0);

  const avgDaily = dayElapsed > 0 ? totalExpenses / dayElapsed : 0;
  const projected = isCurrentMonth ? avgDaily * daysInMonth : totalExpenses;
  const withinBudget = totalIncome > 0 ? projected <= totalIncome : true;

  const diff = totalExpenses - lastMonthExpensesSameDay;
  const diffPct =
    lastMonthExpensesSameDay > 0
      ? Math.round((diff / lastMonthExpensesSameDay) * 100)
      : null;

  const comparisonLabel =
    diffPct === null
      ? null
      : diffPct > 2
        ? { icon: TrendingUp, text: `${Math.abs(diffPct)}% más que el mes pasado`, tone: "bad" as const }
        : diffPct < -2
          ? { icon: TrendingDown, text: `${Math.abs(diffPct)}% menos que el mes pasado`, tone: "good" as const }
          : { icon: Minus, text: "Igual que el mes pasado", tone: "neutral" as const };

  const projectionTone = withinBudget ? "text-emerald-700" : "text-rose-500";
  const projectionBg = withinBudget ? "bg-emerald-50" : "bg-rose-50";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 tracking-wide">
            Gastado este mes
          </p>
          <p className="text-[28px] font-bold text-gray-900 mt-0.5 tabular-nums tracking-tight">
            {formatCOP(totalExpenses)}
          </p>
        </div>
        {isCurrentMonth && (
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
              Quedan
            </p>
            <p className="text-sm font-semibold text-gray-700 tabular-nums">
              {daysLeft} {daysLeft === 1 ? "día" : "días"}
            </p>
          </div>
        )}
      </div>

      {comparisonLabel && isCurrentMonth && (
        <div
          className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium ${
            comparisonLabel.tone === "bad"
              ? "text-rose-500"
              : comparisonLabel.tone === "good"
                ? "text-emerald-600"
                : "text-gray-500"
          }`}
        >
          <comparisonLabel.icon className="h-3.5 w-3.5" />
          <span>{comparisonLabel.text}</span>
        </div>
      )}

      {isCurrentMonth && totalExpenses > 0 && (
        <div className={`mt-4 rounded-xl ${projectionBg} px-4 py-3`}>
          <p className="text-[11px] font-medium text-gray-600">
            Si sigues a este ritmo, cerrarás el mes en
          </p>
          <p
            className={`text-xl font-bold mt-0.5 tabular-nums ${projectionTone}`}
          >
            {formatCOP(Math.round(projected))}
          </p>
          {totalIncome > 0 && (
            <p className="text-[11px] text-gray-500 mt-1">
              {withinBudget
                ? `Te sobrarán ${formatCOP(Math.round(totalIncome - projected))}`
                : `Te excederás ${formatCOP(Math.round(projected - totalIncome))} de tus ingresos`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
