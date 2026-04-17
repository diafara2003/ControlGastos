"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { formatCOP } from "@/src/shared/lib/currency";
import { Lock, Shuffle } from "lucide-react";
import { Progress } from "@/src/shared/ui/progress";

// Categories considered "fixed" expenses
const FIXED_CATEGORIES = [
  "Suscripciones",
  "Servicios públicos",
];

interface CategoryExpense {
  name: string;
  icon: string;
  value: number;
}

interface FixedVsVariableProps {
  categoryData: CategoryExpense[];
}

export function FixedVsVariable({ categoryData }: FixedVsVariableProps) {
  const fixed = categoryData.filter((c) =>
    FIXED_CATEGORIES.includes(c.name)
  );
  const variable = categoryData.filter(
    (c) => !FIXED_CATEGORIES.includes(c.name) && c.name !== "Ingresos"
  );

  const fixedTotal = fixed.reduce((s, c) => s + c.value, 0);
  const variableTotal = variable.reduce((s, c) => s + c.value, 0);
  const total = fixedTotal + variableTotal;

  if (total === 0) return null;

  const fixedPct = Math.round((fixedTotal / total) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fijos vs Variables</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress
          value={fixedPct}
          className="h-3"
          indicatorClassName="bg-indigo-500"
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-indigo-50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Lock className="h-3.5 w-3.5 text-indigo-600" />
              <span className="text-xs font-medium text-indigo-700">
                Fijos ({fixedPct}%)
              </span>
            </div>
            <p className="text-lg font-bold text-indigo-900">
              {formatCOP(fixedTotal)}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {fixed.map((c) => (
                <p key={c.name} className="text-[10px] text-indigo-600">
                  {c.icon} {c.name}: {formatCOP(c.value)}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-orange-50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Shuffle className="h-3.5 w-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">
                Variables ({100 - fixedPct}%)
              </span>
            </div>
            <p className="text-lg font-bold text-orange-900">
              {formatCOP(variableTotal)}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {variable.slice(0, 3).map((c) => (
                <p key={c.name} className="text-[10px] text-orange-600">
                  {c.icon} {c.name}: {formatCOP(c.value)}
                </p>
              ))}
              {variable.length > 3 && (
                <p className="text-[10px] text-orange-400">
                  +{variable.length - 3} más
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
