"use client";

import { useEffect, useState, useCallback } from "react";
import { MonthPulse } from "@/src/widgets/month-pulse";
import { CategoryAlerts, type CategoryAlert } from "@/src/widgets/category-alerts";
import { SavingsGoal } from "@/src/widgets/savings-goal";
import { getTransactions } from "@/src/entities/transaction";
import { createClient } from "@/src/shared/api/supabase/client";
import type { Transaction } from "@/src/entities/transaction";
import { startOfMonth, endOfMonth, getMonthName } from "@/src/shared/lib/date";

import { AccountFilterToggle } from "@/src/shared/ui/account-filter-toggle";
import { useAccountFilter, filterByAccount } from "@/src/shared/context/account-filter";
import { WithdrawalAlert } from "@/src/features/withdrawal-details/ui/WithdrawalAlert";
import { ChevronLeft, ChevronRight } from "lucide-react";

const HISTORY_MONTHS = 3;
const ALERT_THRESHOLD = 1.15; // 15% over historical average

export function DashboardPage() {
  const { selectedAccount, accounts } = useAccountFilter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState({ income: 0, expenses: 0 });
  const [lastMonthSameDay, setLastMonthSameDay] = useState(0);
  const [alerts, setAlerts] = useState<CategoryAlert[]>([]);
  const [hasHistory, setHasHistory] = useState(false);
  const [savingsGoal, setSavingsGoal] = useState<number | null>(null);
  const [totalBudgets, setTotalBudgets] = useState(0);
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

      // Previous N months window for historical baseline
      const historyStart = new Date(selectedDate);
      historyStart.setMonth(historyStart.getMonth() - HISTORY_MONTHS);
      historyStart.setDate(1);
      historyStart.setHours(0, 0, 0, 0);

      const historyEnd = new Date(selectedDate);
      historyEnd.setDate(0); // last day of previous month
      historyEnd.setHours(23, 59, 59, 999);

      const supabase = createClient();
      const [txns, history, profileRes, budgetsRes] = await Promise.all([
        getTransactions({ startDate: start, endDate: end }),
        getTransactions({
          startDate: historyStart.toISOString(),
          endDate: historyEnd.toISOString(),
        }).catch(() => []),
        supabase.auth.getUser().then(({ data: { user } }) =>
          user
            ? supabase
                .from("profiles")
                .select("savings_goal")
                .eq("id", user.id)
                .single()
            : null
        ),
        Promise.resolve(supabase.rpc("get_budget_progress")).catch(() => null),
      ]);

      setSavingsGoal(profileRes?.data?.savings_goal ?? null);
      const budgetItems = (budgetsRes?.data ?? []) as { amount_limit: number }[];
      setTotalBudgets(budgetItems.reduce((s, b) => s + b.amount_limit, 0));

      setTransactions(txns);

      // Filter by account selection
      const filtered = filterByAccount(txns, selectedAccount, accounts);
      const filteredHistory = filterByAccount(history, selectedAccount, accounts);
      const income = filtered
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = filtered
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
      setTotals({ income, expenses });

      // Compare vs last month up to the same day
      const now = new Date();
      const currentDay = isCurrentMonth ? now.getDate() : new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();

      const prevMonth = new Date(selectedDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevMonthStart = startOfMonth(prevMonth);
      const prevMonthSameDay = new Date(
        prevMonth.getFullYear(),
        prevMonth.getMonth(),
        Math.min(
          currentDay,
          new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()
        ),
        23,
        59,
        59
      );

      const lastMonthExpenses = filteredHistory
        .filter(
          (t) =>
            t.type === "expense" &&
            new Date(t.transaction_date) >= prevMonthStart &&
            new Date(t.transaction_date) <= prevMonthSameDay
        )
        .reduce((sum, t) => sum + t.amount, 0);
      setLastMonthSameDay(lastMonthExpenses);

      // Category alerts
      const historicalExpenses = filteredHistory.filter((t) => t.type === "expense");
      setHasHistory(historicalExpenses.length > 0);

      // Historical avg per category across HISTORY_MONTHS
      const historicalByCategory = new Map<
        string,
        { total: number; name: string; icon: string; color: string }
      >();
      for (const t of historicalExpenses) {
        if (!t.category) continue;
        const entry = historicalByCategory.get(t.category.id) ?? {
          total: 0,
          name: t.category.name,
          icon: t.category.icon,
          color: t.category.color,
        };
        entry.total += t.amount;
        historicalByCategory.set(t.category.id, entry);
      }

      // Current by category (projected to end of month)
      const daysInMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0
      ).getDate();
      const dayElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
      const projectionFactor = dayElapsed > 0 ? daysInMonth / dayElapsed : 1;

      const currentByCategory = new Map<string, number>();
      for (const t of txns) {
        if (t.type !== "expense" || !t.category_id) continue;
        currentByCategory.set(
          t.category_id,
          (currentByCategory.get(t.category_id) ?? 0) + t.amount
        );
      }

      const computedAlerts: CategoryAlert[] = [];
      for (const [catId, spent] of currentByCategory.entries()) {
        const hist = historicalByCategory.get(catId);
        if (!hist) continue;
        const avg = hist.total / HISTORY_MONTHS;
        if (avg <= 0) continue;
        const projected = spent * projectionFactor;
        if (projected > avg * ALERT_THRESHOLD) {
          computedAlerts.push({
            name: hist.name,
            icon: hist.icon,
            color: hist.color,
            projected,
            historicalAvg: avg,
          });
        }
      }
      computedAlerts.sort(
        (a, b) =>
          b.projected - b.historicalAvg - (a.projected - a.historicalAvg)
      );
      setAlerts(computedAlerts.slice(0, 4));
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, isCurrentMonth, selectedAccount, accounts]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("transactions-updated", handler);
    window.addEventListener("bank-accounts-updated", handler);
    return () => {
      window.removeEventListener("transactions-updated", handler);
      window.removeEventListener("bank-accounts-updated", handler);
    };
  }, [load]);

  const monthName = getMonthName(selectedDate);
  const year = selectedDate.getFullYear();
  const showYear = year !== new Date().getFullYear();
  const hasData = transactions.length > 0;

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 -mx-4 px-4 md:-mx-8 md:px-8 py-2 border-b border-gray-100 space-y-2">
        <AccountFilterToggle />
        <div className="flex items-center justify-center gap-6">
        <button
          onClick={goToPreviousMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors active:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 capitalize tracking-tight min-w-[140px] text-center">
          {monthName}
          {showYear ? ` ${year}` : ""}
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
      </div>

      <div className="space-y-5 mt-4">
      {loading ? (
        <div className="animate-pulse space-y-4">
          {/* MonthPulse skeleton */}
          <div className="rounded-2xl border border-gray-200 p-5 space-y-3">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-8 w-48 bg-gray-200 rounded" />
            <div className="h-3 w-36 bg-gray-100 rounded" />
            <div className="h-16 w-full bg-gray-100 rounded-xl mt-3" />
          </div>
          {/* SavingsGoal skeleton */}
          <div className="rounded-2xl border border-gray-200 p-5 space-y-3">
            <div className="h-3 w-28 bg-gray-200 rounded" />
            <div className="h-6 w-36 bg-gray-200 rounded" />
            <div className="h-2 w-full bg-gray-100 rounded-full" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 bg-gray-100 rounded-xl" />
              <div className="h-16 bg-gray-100 rounded-xl" />
            </div>
          </div>
          {/* CategoryAlerts skeleton */}
          <div className="rounded-2xl border border-gray-200 p-5 space-y-3">
            <div className="h-3 w-40 bg-gray-200 rounded" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gray-200 rounded-lg" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </div>
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-center px-6">
          <p className="text-sm text-gray-500">
            No hay movimientos este mes todavía
          </p>
          <p className="text-xs text-gray-400">
            Sincroniza tu correo para empezar a ver tus finanzas
          </p>
        </div>
      ) : (
        <div className="space-y-4 stagger-children md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
          {/* MonthPulse spans full width on desktop */}
          <div className="md:col-span-2">
            <MonthPulse
              totalExpenses={totals.expenses}
              totalIncome={totals.income}
              lastMonthExpensesSameDay={lastMonthSameDay}
              selectedDate={selectedDate}
              savingsGoal={savingsGoal}
            />
          </div>

          <SavingsGoal
            totalIncome={totals.income}
            totalExpenses={totals.expenses}
            totalBudgets={totalBudgets}
            savingsGoal={savingsGoal}
            selectedDate={selectedDate}
            onGoalUpdated={setSavingsGoal}
          />

          {isCurrentMonth && (
            <CategoryAlerts alerts={alerts} hasHistory={hasHistory} />
          )}
        </div>
      )}
      </div>
      <WithdrawalAlert />
    </div>
  );
}
