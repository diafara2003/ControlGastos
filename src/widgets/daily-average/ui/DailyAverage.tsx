"use client";

import { CalendarDays } from "lucide-react";
import { formatCOP } from "@/src/shared/lib/currency";

interface DailyAverageProps {
  totalExpenses: number;
  selectedDate: Date;
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function daysElapsed(date: Date): number {
  const now = new Date();
  const isCurrent =
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  return isCurrent ? now.getDate() : daysInMonth(date);
}

export function DailyAverage({ totalExpenses, selectedDate }: DailyAverageProps) {
  const elapsed = daysElapsed(selectedDate);
  const total = daysInMonth(selectedDate);
  const avgDaily = elapsed > 0 ? totalExpenses / elapsed : 0;
  const now = new Date();
  const isCurrentMonth =
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear();
  const projectedTotal = avgDaily * total;

  if (totalExpenses === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays className="h-4 w-4 text-gray-400" />
        <p className="text-xs font-medium text-gray-500">Gasto diario promedio</p>
      </div>
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xl font-bold text-gray-900 tabular-nums">
            {formatCOP(avgDaily)}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Día {elapsed} de {total}
          </p>
        </div>
        {isCurrentMonth && (
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-500 tabular-nums">
              {formatCOP(projectedTotal)}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Proyectado al mes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
