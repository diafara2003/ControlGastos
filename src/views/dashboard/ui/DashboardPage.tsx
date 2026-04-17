"use client";

import { useEffect, useState } from "react";
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
import { Spinner } from "@/src/shared/ui/spinner";

interface MonthlyData {
  month: string;
  expenses: number;
  income: number;
}

export function DashboardPage() {
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

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const now = new Date();
        const start = startOfMonth(now).toISOString();
        const end = endOfMonth(now).toISOString();

        const [txns, breakdown, monthly, comp, subs, budgetProgress] =
          await Promise.all([
            getTransactions({ startDate: start, endDate: end }),
            getCategoryBreakdown(start, end).catch(() => []),
            getMonthlyTotals(6).catch(() => []),
            Promise.resolve(supabase.rpc("get_monthly_comparison")).then((r) => r.data ?? []).catch(() => []),
            Promise.resolve(supabase.rpc("detect_subscriptions")).then((r) => r.data ?? []).catch(() => []),
            Promise.resolve(supabase.rpc("get_budget_progress")).then((r) => r.data ?? []).catch(() => []),
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
        }
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const monthName = getMonthName(new Date());

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 capitalize">
        {monthName}
      </h1>

      <SpendingChart
        totalExpenses={totals.expenses}
        totalIncome={totals.income}
      />

      <BudgetProgress budgets={budgets} />

      <CategoryBreakdown data={categoryData} />

      <FixedVsVariable categoryData={categoryData} />

      <MonthlyComparison data={comparison} />

      <MonthlyTrend data={monthlyData} />

      <SubscriptionsList subscriptions={subscriptions} />

      <RecentTransactions transactions={transactions.slice(0, 5)} />
    </div>
  );
}
