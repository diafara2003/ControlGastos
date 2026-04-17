"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { formatCOP } from "@/src/shared/lib/currency";
import { PieChartIcon } from "lucide-react";
import { LucideIcon } from "@/src/shared/ui/lucide-icon";

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
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-gray-400" />
            Gastos por categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 mb-3">
              <PieChartIcon className="h-7 w-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">Sin datos para mostrar</p>
            <p className="text-xs text-gray-300 mt-1">Los gastos del mes apareceran aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-emerald-500" />
          Gastos por categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-5">
          {/* Donut chart with center label */}
          <div className="relative h-44 w-44 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={68}
                  dataKey="value"
                  stroke="none"
                  paddingAngle={2}
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCOP(Number(value))}
                  contentStyle={{
                    borderRadius: "12px",
                    fontSize: "12px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    padding: "8px 12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] text-gray-400 font-medium">Total</p>
              <p className="text-sm font-bold text-gray-900">{formatCOP(total)}</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2.5 overflow-hidden">
            {data.slice(0, 5).map((item) => {
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.name} className="group">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: item.color, boxShadow: `0 0 0 2px white, 0 0 0 3px ${item.color}40` }}
                      />
                      <LucideIcon name={item.icon} size={12} color={item.color} />
                      <span className="truncate text-gray-600 text-xs">{item.name}</span>
                    </div>
                    <span className="flex-shrink-0 font-semibold text-gray-800 ml-2 text-xs">
                      {pct}%
                    </span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="mt-1 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
