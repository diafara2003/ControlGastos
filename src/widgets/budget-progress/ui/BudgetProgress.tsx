"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { Progress } from "@/src/shared/ui/progress";
import { formatCOP } from "@/src/shared/lib/currency";
import { Target } from "lucide-react";

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
          <Target className="h-4 w-4" />
          Presupuestos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.map((b) => (
          <div key={b.budget_id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <span>{b.category_icon}</span>
                <span className="font-medium text-gray-800">
                  {b.category_name}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {formatCOP(b.amount_spent)} / {formatCOP(b.amount_limit)}
              </span>
            </div>
            <Progress value={b.percentage} />
            {b.percentage >= 80 && b.percentage < 100 && (
              <p className="text-[10px] text-amber-600 font-medium">
                Cerca del límite ({Math.round(b.percentage)}%)
              </p>
            )}
            {b.percentage >= 100 && (
              <p className="text-[10px] text-red-600 font-medium">
                Presupuesto excedido ({Math.round(b.percentage)}%)
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
