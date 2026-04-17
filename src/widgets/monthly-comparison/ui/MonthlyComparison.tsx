"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { formatCOP } from "@/src/shared/lib/currency";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LucideIcon } from "@/src/shared/ui/lucide-icon";

interface ComparisonItem {
  category_name: string;
  category_icon: string;
  current_month_total: number;
  previous_month_total: number;
  change_percent: number | null;
}

interface MonthlyComparisonProps {
  data: ComparisonItem[];
}

export function MonthlyComparison({ data }: MonthlyComparisonProps) {
  const significantChanges = data.filter(
    (d) => d.change_percent !== null && Math.abs(d.change_percent) >= 10
  );

  if (significantChanges.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vs. mes anterior</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {significantChanges.slice(0, 5).map((item) => {
          const isUp = (item.change_percent ?? 0) > 0;
          const isDown = (item.change_percent ?? 0) < 0;

          return (
            <div
              key={item.category_name}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <LucideIcon name={item.category_icon} size={16} className="text-gray-500" />
                <span className="text-sm text-gray-700 truncate">
                  {item.category_name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs text-gray-500">
                  {formatCOP(item.current_month_total)}
                </span>
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    isUp
                      ? "text-red-600"
                      : isDown
                        ? "text-green-600"
                        : "text-gray-500"
                  }`}
                >
                  {isUp ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : isDown ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {item.change_percent !== null
                    ? `${Math.abs(item.change_percent)}%`
                    : "nuevo"}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
