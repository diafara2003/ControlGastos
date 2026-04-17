"use client";

import { Card, CardContent } from "@/src/shared/ui/card";
import { formatCOP } from "@/src/shared/lib/currency";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

interface SpendingChartProps {
  totalExpenses: number;
  totalIncome: number;
}

export function SpendingChart({ totalExpenses, totalIncome }: SpendingChartProps) {
  const balance = totalIncome - totalExpenses;
  const isPositive = balance >= 0;

  return (
    <div className="grid grid-cols-1 gap-3">
      {/* Balance card - hero treatment */}
      <Card className="border-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white overflow-hidden relative animate-pulse-glow">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1)_0%,transparent_60%)]" />
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-medium tracking-wide uppercase">
                Balance del mes
              </p>
              <p className="text-3xl font-bold mt-1.5 tracking-tight animate-count-up">
                {formatCOP(balance)}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  isPositive
                    ? "bg-white/20 text-emerald-50"
                    : "bg-red-400/30 text-red-100"
                }`}>
                  {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {isPositive ? "Positivo" : "En rojo"}
                </span>
              </div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <Wallet className="h-7 w-7 text-emerald-100" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income and expenses cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-emerald-100/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500 font-medium">Ingresos</p>
                <p className="text-sm font-bold text-emerald-600 truncate">
                  {formatCOP(totalIncome)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-100/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500 font-medium">Gastos</p>
                <p className="text-sm font-bold text-red-600 truncate">
                  {formatCOP(totalExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
