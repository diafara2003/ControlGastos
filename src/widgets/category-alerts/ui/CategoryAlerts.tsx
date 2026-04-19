"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatCOP } from "@/src/shared/lib/currency";

export interface CategoryAlert {
  name: string;
  icon: string;
  color: string;
  projected: number;
  historicalAvg: number;
}

interface CategoryAlertsProps {
  alerts: CategoryAlert[];
  hasHistory: boolean;
}

export function CategoryAlerts({ alerts, hasHistory }: CategoryAlertsProps) {
  if (!hasHistory) return null;

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        <p className="text-sm text-emerald-800 font-medium">
          Todo bajo control — ninguna categoría se sale de lo normal
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <p className="text-xs font-medium text-gray-600 tracking-wide">
          Categorías por encima de lo habitual
        </p>
      </div>
      <div className="space-y-2.5">
        {alerts.map((a) => {
          const pct = Math.round(
            ((a.projected - a.historicalAvg) / a.historicalAvg) * 100
          );
          return (
            <div
              key={a.name}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 text-sm"
                  style={{ backgroundColor: `${a.color}20`, color: a.color }}
                >
                  {a.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {a.name}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    normal {formatCOP(Math.round(a.historicalAvg))}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900 tabular-nums">
                  {formatCOP(Math.round(a.projected))}
                </p>
                <p className="text-[11px] font-medium text-rose-500 tabular-nums">
                  +{pct}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
