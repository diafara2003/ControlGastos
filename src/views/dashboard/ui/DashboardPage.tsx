"use client";

import { useEffect, useState, useCallback } from "react";
import { SpendingChart } from "@/src/widgets/spending-chart";
import { CategoryBreakdown } from "@/src/widgets/category-breakdown";
import { RecentTransactions } from "@/src/widgets/recent-transactions";
import { MonthlyTrend } from "@/src/widgets/monthly-trend";
import { MonthlyComparison } from "@/src/widgets/monthly-comparison";
import { FixedVsVariable } from "@/src/widgets/fixed-vs-variable";
import { SubscriptionsList } from "@/src/widgets/subscriptions";
import { BudgetProgress } from "@/src/widgets/budget-progress";
import { getTransactions, getMonthlyTotals } from "@/src/entities/transaction";
import { getCategoryBreakdown } from "@/src/entities/category";
import type { Transaction } from "@/src/entities/transaction";
import { startOfMonth, endOfMonth, getMonthName } from "@/src/shared/lib/date";
import { createClient } from "@/src/shared/api/supabase/client";
import { Button } from "@/src/shared/ui/button";
import { Spinner } from "@/src/shared/ui/spinner";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthlyData {
  month: string;
  expenses: number;
  income: number;
}

export function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryData, setCategoryData] = useState<
    { name: string; value: number; color: string; icon: string }[]
  >([]);
  const [totals, setTotals] = useState({ income: 0, expenses: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [comparison, setComparison] = useState<
    {
      category_name: string;
      category_icon: string;
      current_month_total: number;
      previous_month_total: number;
      change_percent: number | null;
    }[]
  >([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isCurrentMonth =
    selectedDate.getMonth() === new Date().getMonth() &&
    selectedDate.getFullYear() === new Date().getFullYear();

  const goToPreviousMonth = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const start = startOfMonth(selectedDate).toISOString();
      const end = endOfMonth(selectedDate).toISOString();

      const [txns, breakdown, monthly, comp, subs, budgetProgress] =
        await Promise.all([
          getTransactions({ startDate: start, endDate: end }),
          getCategoryBreakdown(start, end).catch(() => []),
          getMonthlyTotals(selectedDate, 6).catch(() => []),
          Promise.resolve(supabase.rpc("get_monthly_comparison"))
            .then((r) => r.data ?? [])
            .catch(() => []),
          Promise.resolve(supabase.rpc("detect_subscriptions"))
            .then((r) => r.data ?? [])
            .catch(() => []),
          Promise.resolve(supabase.rpc("get_budget_progress"))
            .then((r) => r.data ?? [])
            .catch(() => []),
        ]);

      setTransactions(txns);
      setMonthlyData(monthly ?? []);
      setComparison(comp);
      setSubscriptions(subs);
      setBudgets(budgetProgress);

      const income = txns
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = txns
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
      setTotals({ income, expenses });

      if (Array.isArray(breakdown)) {
        setCategoryData(
          breakdown.map(
            (b: {
              name: string;
              total: number;
              color: string;
              icon: string;
            }) => ({
              name: b.name,
              value: b.total,
              color: b.color,
              icon: b.icon,
            })
          )
        );
      } else {
        setCategoryData([]);
      }
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    load();
  }, [load]);

  const monthName = getMonthName(selectedDate);
  const year = selectedDate.getFullYear();
  const showYear = year !== new Date().getFullYear();

  return (
    <div className="space-y-5 pb-2">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousMonth}
          className="h-10 w-10 rounded-xl"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900 capitalize tracking-tight">
          {monthName}{showYear ? ` ${year}` : ""}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className={`h-10 w-10 rounded-xl ${isCurrentMonth ? "opacity-30" : ""}`}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-gray-400">Cargando datos...</p>
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          <SpendingChart
            totalExpenses={totals.expenses}
            totalIncome={totals.income}
          />

          <BudgetProgress budgets={budgets} />

          <CategoryBreakdown data={categoryData} />

          <FixedVsVariable categoryData={categoryData} />

          {isCurrentMonth && <MonthlyComparison data={comparison} />}

          <MonthlyTrend data={monthlyData} />

          {isCurrentMonth && <SubscriptionsList subscriptions={subscriptions} />}

          <RecentTransactions transactions={transactions.slice(0, 5)} />
        </div>
      )}
    </div>
  );
}
