"use client";

import { useEffect, useState, useCallback } from "react";
import { SpendingChart } from "@/src/widgets/spending-chart";
import { CategoryBreakdown } from "@/src/widgets/category-breakdown";
import { RecentTransactions } from "@/src/widgets/recent-transactions";
import { MonthlyTrend } from "@/src/widgets/monthly-trend";
import { getTransactions, getMonthlyTotals } from "@/src/entities/transaction";
import { getCategoryBreakdown } from "@/src/entities/category";
import type { Transaction } from "@/src/entities/transaction";
import { startOfMonth, endOfMonth, getMonthName } from "@/src/shared/lib/date";
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
      const start = startOfMonth(selectedDate).toISOString();
      const end = endOfMonth(selectedDate).toISOString();

      const [txns, breakdown, monthly] = await Promise.all([
        getTransactions({ startDate: start, endDate: end }),
        getCategoryBreakdown(start, end).catch(() => []),
        getMonthlyTotals(selectedDate, 6).catch(() => []),
      ]);

      setTransactions(txns);
      setMonthlyData(monthly ?? []);

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

  // Auto-refresh when new transactions are synced
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("transactions-updated", handler);
    return () => window.removeEventListener("transactions-updated", handler);
  }, [load]);

  const monthName = getMonthName(selectedDate);
  const year = selectedDate.getFullYear();
  const showYear = year !== new Date().getFullYear();

  return (
    <div className="space-y-5 pb-4">
      {/* Month navigation - minimal centered */}
      <div className="flex items-center justify-center gap-6 pt-1">
        <button
          onClick={goToPreviousMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors active:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 capitalize tracking-tight min-w-[140px] text-center">
          {monthName}{showYear ? ` ${year}` : ""}
        </h1>
        <button
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors active:bg-gray-100 ${
            isCurrentMonth ? "opacity-0 pointer-events-none" : ""
          }`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-gray-400">Cargando datos...</p>
        </div>
      ) : (
        <div className="space-y-5 stagger-children">
          {/* Hero balance */}
          <SpendingChart
            totalExpenses={totals.expenses}
            totalIncome={totals.income}
            selectedDate={selectedDate}
          />

          {/* Recent transactions */}
          <RecentTransactions transactions={transactions.slice(0, 4)} />

          {/* Category breakdown */}
          <CategoryBreakdown data={categoryData} />

          {/* Monthly trend */}
          <MonthlyTrend data={monthlyData} />
        </div>
      )}
    </div>
  );
}
