"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { Progress } from "@/src/shared/ui/progress";
import { formatCOP } from "@/src/shared/lib/currency";
import { Target, AlertTriangle, XCircle } from "lucide-react";
import { LucideIcon } from "@/src/shared/ui/lucide-icon";

interface BudgetItem {
  budget_id: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  amount_limit: number;
  amount_spent: number;
  percentage: number;
}

interface BudgetProgressProps {
  budgets: BudgetItem[];
}

export function BudgetProgress({ budgets }: BudgetProgressProps) {
  if (budgets.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-500" />
          Presupuestos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.map((b) => {
          const isWarning = b.percentage >= 80 && b.percentage < 100;
          const isExceeded = b.percentage >= 100;
          return (
            <div key={b.budget_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LucideIcon name={b.category_icon} size={18} color={b.category_color} />
                  <span className="text-sm font-medium text-gray-800">
                    {b.category_name}
                  </span>
                </div>
                <span className="text-xs text-gray-400 tabular-nums">
                  {formatCOP(b.amount_spent)} / {formatCOP(b.amount_limit)}
                </span>
              </div>
              <Progress value={b.percentage} />
              {isWarning && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <p className="text-[11px] text-amber-600 font-medium">
                    Cerca del limite ({Math.round(b.percentage)}%)
                  </p>
                </div>
              )}
              {isExceeded && (
                <div className="flex items-center gap-1.5">
                  <XCircle className="h-3 w-3 text-red-500" />
                  <p className="text-[11px] text-red-600 font-medium">
                    Presupuesto excedido ({Math.round(b.percentage)}%)
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
