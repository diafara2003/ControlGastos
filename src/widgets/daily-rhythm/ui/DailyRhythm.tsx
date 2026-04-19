"use client";

import { formatCOP } from "@/src/shared/lib/currency";

interface DailyRhythmProps {
  totalExpenses: number;
  totalIncome: number;
  selectedDate: Date;
}

export function DailyRhythm({
  totalExpenses,
  totalIncome,
  selectedDate,
}: DailyRhythmProps) {
  const now = new Date();
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth =
    now.getMonth() === month && now.getFullYear() === year;

  if (!isCurrentMonth) return null;

  const dayElapsed = now.getDate();
  const daysLeft = Math.max(daysInMonth - dayElapsed, 0);
  const avgDaily = dayElapsed > 0 ? totalExpenses / dayElapsed : 0;
  const remaining = Math.max(totalIncome - totalExpenses, 0);
  const suggested = daysLeft > 0 ? remaining / daysLeft : 0;

  if (totalIncome <= 0 || daysLeft === 0) return null;

  const diff = avgDaily - suggested;
  const diffPct = suggested > 0 ? Math.round((diff / suggested) * 100) : 0;
  const overspending = diff > 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 tracking-wide mb-3">
        Ritmo diario
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
            Puedes gastar
          </p>
          <p className="text-lg font-bold text-emerald-600 mt-0.5 tabular-nums">
            {formatCOP(Math.round(suggested))}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">por día restante</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
            Vas gastando
          </p>
          <p
            className={`text-lg font-bold mt-0.5 tabular-nums ${
              overspending ? "text-rose-500" : "text-gray-900"
            }`}
          >
            {formatCOP(Math.round(avgDaily))}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">promedio real</p>
        </div>
      </div>
      {Math.abs(diffPct) >= 5 && (
        <p
          className={`mt-3 text-xs font-medium ${
            overspending ? "text-rose-500" : "text-emerald-600"
          }`}
        >
          {overspending
            ? `Gastas ${diffPct}% más de lo ideal — toca frenar`
            : `Vas ${Math.abs(diffPct)}% por debajo del ideal — vas bien`}
        </p>
      )}
    </div>
  );
}
