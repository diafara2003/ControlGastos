"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { formatCOP } from "@/src/shared/lib/currency";
import { BarChart3, TrendingUp } from "lucide-react";

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
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-500" />
            Tendencia mensual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 mb-3">
              <TrendingUp className="h-7 w-7 text-gray-300" />
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
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-500" />
          Tendencia mensual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                width={40}
              />
              <Tooltip
                formatter={(value) => formatCOP(Number(value))}
                contentStyle={{
                  borderRadius: "12px",
                  fontSize: "12px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  padding: "8px 12px",
                }}
                cursor={{ fill: "rgba(16, 185, 129, 0.05)", radius: 8 }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              />
              <Bar
                dataKey="income"
                name="Ingresos"
                fill="#34d399"
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Bar
                dataKey="expenses"
                name="Gastos"
                fill="#f87171"
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
