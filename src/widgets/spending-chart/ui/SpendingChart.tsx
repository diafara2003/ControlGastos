"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { formatCOP } from "@/src/shared/lib/currency";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

interface SpendingChartProps {
  totalExpenses: number;
  totalIncome: number;
}

export function SpendingChart({ totalExpenses, totalIncome }: SpendingChartProps) {
  const balance = totalIncome - totalExpenses;

  return (
    <div className="grid grid-cols-1 gap-3">
      <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-medium">Balance del mes</p>
              <p className="text-2xl font-bold mt-1">{formatCOP(balance)}</p>
            </div>
            <Wallet className="h-8 w-8 text-emerald-200" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Ingresos</p>
                <p className="text-sm font-semibold text-green-600">
                  {formatCOP(totalIncome)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Gastos</p>
                <p className="text-sm font-semibold text-red-600">
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
