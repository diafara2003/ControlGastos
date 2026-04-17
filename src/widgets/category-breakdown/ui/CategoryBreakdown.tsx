"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { formatCOP } from "@/src/shared/lib/currency";
import { PieChart, ChevronDown, ChevronUp } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <PieChart className="h-4 w-4 text-gray-400" />
            Gastos por categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 mb-3">
              <PieChart className="h-6 w-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">Sin datos para mostrar</p>
            <p className="text-xs text-gray-300 mt-1">Los gastos del mes apareceran aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleData = expanded ? data : data.slice(0, 5);
  const hasMore = data.length > 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <PieChart className="h-4 w-4 text-violet-500" />
          Gastos por categoria
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleData.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          const barWidth = (item.value / maxValue) * 100;

          return (
            <div key={item.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <LucideIcon name={item.icon} size={14} color={item.color} />
                  </div>
                  <span className="text-sm text-gray-700 truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-xs text-gray-400 tabular-nums">{pct}%</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {formatCOP(item.value)}
                  </span>
                </div>
              </div>
              {/* Horizontal bar */}
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: item.color,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          );
        })}

        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium text-violet-600 pt-1 transition-colors active:text-violet-700"
          >
            {expanded ? (
              <>
                Ver menos
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Ver mas ({data.length - 5})
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
