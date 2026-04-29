"use client";

import { useEffect, useState, useCallback } from "react";
import { MonthPulse } from "@/src/widgets/month-pulse";
import { CategoryAlerts, type CategoryAlert } from "@/src/widgets/category-alerts";
import { SavingsGoal } from "@/src/widgets/savings-goal";
import { getTransactions } from "@/src/entities/transaction";
import { createClient } from "@/src/shared/api/supabase/client";
import type { Transaction } from "@/src/entities/transaction";
import { useCycleConfig } from "@/src/shared/context/cycle-config";

import { AccountFilterToggle } from "@/src/shared/ui/account-filter-toggle";
import { useAccountFilter, filterByAccount } from "@/src/shared/context/account-filter";
import { WithdrawalAlert } from "@/src/features/withdrawal-details/ui/WithdrawalAlert";
import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import { EmptyState } from "@/src/shared/ui/empty-state";

const HISTORY_MONTHS = 3;
const ALERT_THRESHOLD = 1.15; // 15% over historical average

export function DashboardPage() {
  const { selectedAccount, accounts } = useAccountFilter();
  const cycle = useCycleConfig();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState({ income: 0, expenses: 0 });
  const [lastMonthSameDay, setLastMonthSameDay] = useState(0);
  const [alerts, setAlerts] = useState<CategoryAlert[]>([]);
  const [hasHistory, setHasHistory] = useState(false);
  const [savingsGoal, setSavingsGoal] = useState<number | null>(null);
  const [totalBudgets, setTotalBudgets] = useState(0);
  const [loading, setLoading] = useState(true);

  const isCurrent = cycle.isCurrentPeriod(selectedDate);

  const goToPreviousMonth = () => {
    setSelectedDate((prev) => cycle.previousPeriod(prev));
  };

  const goToNextMonth = () => {
    if (isCurrent) return;
    setSelectedDate((prev) => cycle.nextPeriod(prev));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const start = cycle.periodStart(selectedDate).toISOString();
      const end = cycle.periodEnd(selectedDate).toISOString();

      // Previous N months window for historical baseline
      let histRef = selectedDate;
      for (let i = 0; i < HISTORY_MONTHS; i++) {
        histRef = cycle.previousPeriod(histRef);
      }
      const historyStartISO = cycle.periodStart(histRef).toISOString();
      const prevPeriodDate = cycle.previousPeriod(selectedDate);
      const historyEndISO = cycle.periodEnd(prevPeriodDate).toISOString();

      const supabase = createClient();
      const [txns, history, profileRes, budgetsRes] = await Promise.all([
        getTransactions({ startDate: start, endDate: end }),
        getTransactions({
          startDate: historyStartISO,
          endDate: historyEndISO,
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
        .filter((t) => t.type === "income" && !t.exclude_from_totals)
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = filtered
        .filter((t) => t.type === "expense" && !t.exclude_from_totals)
        .reduce((sum, t) => sum + t.amount, 0);
      setTotals({ income, expenses });

      // Compare vs last month up to the same elapsed days
      const periodDays = cycle.daysInPeriod(selectedDate);
      const elapsed = cycle.daysElapsed(selectedDate);
      const currentDay = isCurrent ? elapsed : periodDays;

      const prevPeriodStart = cycle.periodStart(prevPeriodDate);
      const prevPeriodSameDay = new Date(
        prevPeriodStart.getTime() + currentDay * 24 * 60 * 60 * 1000
      );

      const lastMonthExpenses = filteredHistory
        .filter(
          (t) =>
            t.type === "expense" &&
            !t.exclude_from_totals &&
            new Date(t.transaction_date) >= prevPeriodStart &&
            new Date(t.transaction_date) <= prevPeriodSameDay
        )
        .reduce((sum, t) => sum + t.amount, 0);
      setLastMonthSameDay(lastMonthExpenses);

      // Category alerts
      const historicalExpenses = filteredHistory.filter((t) => t.type === "expense" && !t.exclude_from_totals);
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

      // Current by category (projected to end of period)
      const projectionFactor = elapsed > 0 ? periodDays / elapsed : 1;

      const currentByCategory = new Map<string, number>();
      for (const t of txns) {
        if (t.type !== "expense" || !t.category_id || t.exclude_from_totals) continue;
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
  }, [selectedDate, isCurrent, selectedAccount, accounts, cycle]);

  useEffect(() => {
    if (cycle.loaded) load();
  }, [load, cycle.loaded]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("transactions-updated", handler);
    window.addEventListener("bank-accounts-updated", handler);
    return () => {
      window.removeEventListener("transactions-updated", handler);
      window.removeEventListener("bank-accounts-updated", handler);
    };
  }, [load]);

  const monthName = cycle.periodMonthName(selectedDate);
  const pEnd = cycle.periodEnd(selectedDate);
  const year = pEnd.getFullYear();
  const showYear = year !== new Date().getFullYear();
  const hasData = transactions.length > 0;

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 -mx-4 px-4 md:-mx-8 md:px-8 py-2 border-b border-gray-100 dark:border-slate-700 space-y-2">
        <AccountFilterToggle />
        <div className="flex items-center justify-center gap-6">
        <button
          onClick={goToPreviousMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors active:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 capitalize tracking-tight min-w-[140px] text-center">
          {monthName}
          {showYear ? ` ${year}` : ""}
        </h1>
        <button
          onClick={goToNextMonth}
          disabled={isCurrent}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors active:bg-gray-100 ${
            isCurrent ? "opacity-0 pointer-events-none" : ""
          }`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        </div>
      </div>

      {/* Period ending soon alert */}
      {isCurrent && (cycle.cycleDay !== 1 || cycle.cycleHour !== 0) && (() => {
        const totalDays = cycle.daysInPeriod(selectedDate);
        const elapsed = cycle.daysElapsed(selectedDate);
        const left = Math.max(totalDays - elapsed, 0);
        if (left > 3 || left === 0) return null;
        const balance = totals.income - totals.expenses;
        return (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3">
            <CalendarClock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Tu periodo cierra en {left} {left === 1 ? "dia" : "dias"}
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                Balance actual: <span className={`font-semibold ${balance >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                  {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(balance)}
                </span>
              </p>
            </div>
          </div>
        );
      })()}

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
        <EmptyState
          message="No hay movimientos este mes todavía"
          description="Sincroniza tu correo para empezar a ver tus finanzas"
        />
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
              periodDays={cycle.daysInPeriod(selectedDate)}
              periodElapsed={cycle.daysElapsed(selectedDate)}
              isCurrentPeriod={isCurrent}
            />
          </div>

          <SavingsGoal
            totalIncome={totals.income}
            totalExpenses={totals.expenses}
            totalBudgets={totalBudgets}
            savingsGoal={savingsGoal}
            selectedDate={selectedDate}
            onGoalUpdated={setSavingsGoal}
            periodKey={cycle.periodKey(selectedDate)}
            periodDays={cycle.daysInPeriod(selectedDate)}
            periodElapsed={cycle.daysElapsed(selectedDate)}
            isCurrentPeriod={isCurrent}
          />

          {isCurrent && (
            <CategoryAlerts alerts={alerts} hasHistory={hasHistory} />
          )}
        </div>
      )}
      </div>
      <WithdrawalAlert />
    </div>
  );
}
