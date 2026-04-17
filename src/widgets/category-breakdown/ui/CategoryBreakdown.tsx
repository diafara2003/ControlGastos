"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { formatCOP } from "@/src/shared/lib/currency";

interface CategoryData {
  name: string;
  value: number;
  color: string;
  icon: string;
}

interface CategoryBreakdownProps {
  data: CategoryData[];
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-gray-500 py-8">
            Sin datos para mostrar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por categoría</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="h-40 w-40 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCOP(Number(value))}
                  contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 overflow-hidden">
            {data.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate text-gray-700">{item.icon} {item.name}</span>
                </div>
                <span className="flex-shrink-0 font-medium text-gray-900 ml-2">
                  {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
