"use client";

import { useEffect, useState, useCallback } from "react";
import { MonthPulse } from "@/src/widgets/month-pulse";
import { DailyRhythm } from "@/src/widgets/daily-rhythm";
import { CategoryAlerts, type CategoryAlert } from "@/src/widgets/category-alerts";
import { getTransactions } from "@/src/entities/transaction";
import type { Transaction } from "@/src/entities/transaction";
import { startOfMonth, endOfMonth, getMonthName } from "@/src/shared/lib/date";
import { Spinner } from "@/src/shared/ui/spinner";
import { ChevronLeft, ChevronRight } from "lucide-react";

const HISTORY_MONTHS = 3;
const ALERT_THRESHOLD = 1.15; // 15% over historical average

export function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState({ income: 0, expenses: 0 });
  const [lastMonthSameDay, setLastMonthSameDay] = useState(0);
  const [alerts, setAlerts] = useState<CategoryAlert[]>([]);
  const [hasHistory, setHasHistory] = useState(false);
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

      const [txns, history] = await Promise.all([
        getTransactions({ startDate: start, endDate: end }),
        getTransactions({
          startDate: historyStart.toISOString(),
          endDate: historyEnd.toISOString(),
        }).catch(() => []),
      ]);

      setTransactions(txns);

      const income = txns
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = txns
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

      const lastMonthExpenses = history
        .filter(
          (t) =>
            t.type === "expense" &&
            new Date(t.transaction_date) >= prevMonthStart &&
            new Date(t.transaction_date) <= prevMonthSameDay
        )
        .reduce((sum, t) => sum + t.amount, 0);
      setLastMonthSameDay(lastMonthExpenses);

      // Category alerts
      const historicalExpenses = history.filter((t) => t.type === "expense");
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
  }, [selectedDate, isCurrentMonth]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("transactions-updated", handler);
    return () => window.removeEventListener("transactions-updated", handler);
  }, [load]);

  const monthName = getMonthName(selectedDate);
  const year = selectedDate.getFullYear();
  const showYear = year !== new Date().getFullYear();
  const hasData = transactions.length > 0;

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-center gap-6 pt-1">
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-gray-400">Cargando datos...</p>
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
        <div className="space-y-4 stagger-children">
          <MonthPulse
            totalExpenses={totals.expenses}
            totalIncome={totals.income}
            lastMonthExpensesSameDay={lastMonthSameDay}
            selectedDate={selectedDate}
          />

          <DailyRhythm
            totalExpenses={totals.expenses}
            totalIncome={totals.income}
            selectedDate={selectedDate}
          />

          {isCurrentMonth && (
            <CategoryAlerts alerts={alerts} hasHistory={hasHistory} />
          )}
        </div>
      )}
    </div>
  );
}
