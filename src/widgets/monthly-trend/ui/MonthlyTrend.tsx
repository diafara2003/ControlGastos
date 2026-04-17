"use client";

import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { formatCOP } from "@/src/shared/lib/currency";
import { TrendingUp } from "lucide-react";

interface MonthlyData {
  month: string;
  expenses: number;
  income: number;
}

interface MonthlyTrendProps {
  data: MonthlyData[];
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(parseInt(year), parseInt(m) - 1);
  return date.toLocaleDateString("es-CO", { month: "short" });
}

export function MonthlyTrend({ data }: MonthlyTrendProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            Tendencia mensual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 mb-3">
              <TrendingUp className="h-6 w-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">Sin datos suficientes</p>
            <p className="text-xs text-gray-300 mt-1">Necesitamos al menos 2 meses de datos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    name: formatMonth(d.month),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-violet-500" />
          Tendencia mensual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} barGap={4}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#d1d5db" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                width={35}
              />
              <Tooltip
                formatter={(value) => formatCOP(Number(value))}
                contentStyle={{
                  borderRadius: "12px",
                  fontSize: "12px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  padding: "8px 12px",
                }}
                cursor={{ fill: "rgba(139, 92, 246, 0.04)", radius: 8 }}
              />
              <Bar
                dataKey="expenses"
                name="expenses"
                fill="#c4b5fd"
                radius={[8, 8, 8, 8]}
                maxBarSize={32}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Line
                dataKey="income"
                name="income"
                type="monotone"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ r: 3, fill: "#34d399", strokeWidth: 0 }}
                activeDot={{ r: 4, fill: "#34d399", strokeWidth: 0 }}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-violet-300" />
            <span className="text-[11px] text-gray-400">Gastos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-gray-400">Ingresos</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
