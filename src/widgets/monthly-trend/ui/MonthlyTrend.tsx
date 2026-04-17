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
          <CardTitle>Tendencia mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-gray-500 py-8">
            Sin datos suficientes
          </p>
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
        <CardTitle>Tendencia mensual</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                width={40}
              />
              <Tooltip
                formatter={(value) => formatCOP(Number(value))}
                contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px" }}
              />
              <Bar
                dataKey="income"
                name="Ingresos"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
              <Bar
                dataKey="expenses"
                name="Gastos"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
