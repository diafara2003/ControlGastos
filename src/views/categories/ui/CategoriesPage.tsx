"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/card";
import { Button } from "@/src/shared/ui/button";
import { CategoryIcon, getCategories } from "@/src/entities/category";
import type { Category } from "@/src/entities/category";
import { Spinner } from "@/src/shared/ui/spinner";
import { BudgetForm } from "@/src/features/manage-budgets";
import { BudgetProgress } from "@/src/widgets/budget-progress";
import { createClient } from "@/src/shared/api/supabase/client";
import { Plus, Target } from "lucide-react";

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBudgetForm, setShowBudgetForm] = useState(false);

  const loadData = async () => {
    try {
      const supabase = createClient();
      const [cats, budgetData] = await Promise.all([
        getCategories(),
        Promise.resolve(supabase.rpc("get_budget_progress"))
          .then((r) => r.data ?? [])
          .catch(() => []),
      ]);
      setCategories(cats);
      setBudgets(budgetData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Categorías</h1>

      {/* Budgets section */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Target className="h-4 w-4" />
          Presupuestos mensuales
        </h2>
        <Button size="sm" onClick={() => setShowBudgetForm(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nuevo
        </Button>
      </div>

      {budgets.length > 0 ? (
        <BudgetProgress budgets={budgets} />
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-gray-500">
            Sin presupuestos. Crea uno para controlar tus gastos.
          </CardContent>
        </Card>
      )}

      {/* Categories grid */}
      <Card>
        <CardHeader>
          <CardTitle>Tus categorías</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:shadow-sm transition-shadow"
              >
                <CategoryIcon icon={cat.icon} color={cat.color} size="md" />
                <span className="text-sm font-medium text-gray-800">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <BudgetForm
        categories={categories}
        open={showBudgetForm}
        onOpenChange={setShowBudgetForm}
        onSaved={loadData}
      />
    </div>
  );
}
