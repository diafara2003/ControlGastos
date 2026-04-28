"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { createClient } from "@/src/shared/api/supabase/client";
import {
  periodStart as _periodStart,
  periodEnd as _periodEnd,
  getPeriodMonthName,
  getPeriodKey,
  daysInPeriod,
  daysElapsedInPeriod,
  previousPeriod as _previousPeriod,
  nextPeriod as _nextPeriod,
  isCurrentPeriod as _isCurrentPeriod,
} from "@/src/shared/lib/date";

interface CycleConfig {
  cycleDay: number;
  cycleHour: number;
  loaded: boolean;
  periodStart: (date?: Date) => Date;
  periodEnd: (date?: Date) => Date;
  periodMonthName: (date?: Date) => string;
  periodKey: (date?: Date) => string;
  daysInPeriod: (date?: Date) => number;
  daysElapsed: (date?: Date) => number;
  previousPeriod: (date: Date) => Date;
  nextPeriod: (date: Date) => Date;
  isCurrentPeriod: (date: Date) => boolean;
  reload: () => Promise<void>;
}

const CycleConfigContext = createContext<CycleConfig>({
  cycleDay: 1,
  cycleHour: 0,
  loaded: false,
  periodStart: (d) => _periodStart(d),
  periodEnd: (d) => _periodEnd(d),
  periodMonthName: (d) => getPeriodMonthName(d),
  periodKey: (d) => getPeriodKey(d),
  daysInPeriod: (d) => daysInPeriod(d),
  daysElapsed: (d) => daysElapsedInPeriod(d),
  previousPeriod: (d) => _previousPeriod(d),
  nextPeriod: (d) => _nextPeriod(d),
  isCurrentPeriod: (d) => _isCurrentPeriod(d),
  reload: async () => {},
});

export function CycleConfigProvider({ children }: { children: ReactNode }) {
  const [cycleDay, setCycleDay] = useState(1);
  const [cycleHour, setCycleHour] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const loadConfig = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("cycle_start_day, cycle_start_hour")
      .eq("id", user.id)
      .single();

    if (data) {
      setCycleDay(data.cycle_start_day ?? 1);
      setCycleHour(data.cycle_start_hour ?? 0);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    const handler = () => loadConfig();
    window.addEventListener("cycle-config-updated", handler);
    return () => window.removeEventListener("cycle-config-updated", handler);
  }, [loadConfig]);

  const value: CycleConfig = useMemo(() => ({
    cycleDay,
    cycleHour,
    loaded,
    periodStart: (d) => _periodStart(d, cycleDay, cycleHour),
    periodEnd: (d) => _periodEnd(d, cycleDay, cycleHour),
    periodMonthName: (d) => getPeriodMonthName(d, cycleDay, cycleHour),
    periodKey: (d) => getPeriodKey(d, cycleDay, cycleHour),
    daysInPeriod: (d) => daysInPeriod(d, cycleDay, cycleHour),
    daysElapsed: (d) => daysElapsedInPeriod(d, cycleDay, cycleHour),
    previousPeriod: (d) => _previousPeriod(d, cycleDay, cycleHour),
    nextPeriod: (d) => _nextPeriod(d, cycleDay, cycleHour),
    isCurrentPeriod: (d) => _isCurrentPeriod(d, cycleDay, cycleHour),
    reload: loadConfig,
  }), [cycleDay, cycleHour, loaded, loadConfig]);

  return (
    <CycleConfigContext.Provider value={value}>
      {children}
    </CycleConfigContext.Provider>
  );
}

export function useCycleConfig() {
  return useContext(CycleConfigContext);
}
