export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatShortDate(date: string | Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

export function getMonthName(date: string | Date): string {
  return new Intl.DateTimeFormat("es-CO", { month: "long" }).format(
    new Date(date)
  );
}

export function startOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

// ---------------------------------------------------------------------------
// Custom period (cycle) utilities
// ---------------------------------------------------------------------------

const COT_TZ = "America/Bogota";

/**
 * Build a UTC Date from a Colombia-local year/month/day/hour.
 * Colombia is always UTC-5 (no DST), so we simply add 5 hours.
 */
function cotToUtc(year: number, month: number, day: number, hour: number): Date {
  return new Date(Date.UTC(year, month, day, hour + 5));
}

/**
 * Clamp a cycle day to the last day of a given month.
 * e.g. day=31 in a month with 30 days → 30.
 */
function clampDay(year: number, month: number, day: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, lastDay);
}

/**
 * Get the start boundary (UTC) of the period that contains `date`.
 * Default (day=1, hour=0) behaves like calendar month start.
 */
export function periodStart(
  date: Date = new Date(),
  cycleDay: number = 1,
  cycleHour: number = 0
): Date {
  // Convert date to Colombia local components
  const col = new Date(date.toLocaleString("en-US", { timeZone: COT_TZ }));
  let y = col.getFullYear();
  let m = col.getMonth();
  const d = col.getDate();
  const h = col.getHours();

  const clamped = clampDay(y, m, cycleDay);

  // Are we before this month's cycle boundary?
  if (d < clamped || (d === clamped && h < cycleHour)) {
    // Period started in previous month
    m -= 1;
    if (m < 0) { m = 11; y -= 1; }
  }

  const startDay = clampDay(y, m, cycleDay);
  return cotToUtc(y, m, startDay, cycleHour);
}

/**
 * Get the end boundary (UTC) of the period that contains `date`.
 * This is 1 second before the next period starts.
 */
export function periodEnd(
  date: Date = new Date(),
  cycleDay: number = 1,
  cycleHour: number = 0
): Date {
  const start = periodStart(date, cycleDay, cycleHour);
  // Next period start: advance one month from start
  const col = new Date(start.toLocaleString("en-US", { timeZone: COT_TZ }));
  let y = col.getFullYear();
  let m = col.getMonth() + 1;
  if (m > 11) { m = 0; y += 1; }
  const nextDay = clampDay(y, m, cycleDay);
  const nextStart = cotToUtc(y, m, nextDay, cycleHour);
  return new Date(nextStart.getTime() - 1000);
}

/**
 * Get the label month for the period containing `date`.
 * The label is the month where the period ENDS.
 * e.g. period Mar 28 → Apr 28 is labeled "Abril 2026".
 */
export function getPeriodLabel(
  date: Date = new Date(),
  cycleDay: number = 1,
  cycleHour: number = 0
): string {
  const end = periodEnd(date, cycleDay, cycleHour);
  return new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(end);
}

/**
 * Get just the month name for the period containing `date`.
 */
export function getPeriodMonthName(
  date: Date = new Date(),
  cycleDay: number = 1,
  cycleHour: number = 0
): string {
  const end = periodEnd(date, cycleDay, cycleHour);
  return new Intl.DateTimeFormat("es-CO", { month: "long" }).format(end);
}

/**
 * Get a YYYY-MM key for the period containing `date` (based on end month).
 */
export function getPeriodKey(
  date: Date = new Date(),
  cycleDay: number = 1,
  cycleHour: number = 0
): string {
  const end = periodEnd(date, cycleDay, cycleHour);
  const col = new Date(end.toLocaleString("en-US", { timeZone: COT_TZ }));
  return `${col.getFullYear()}-${String(col.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Total days in the current period.
 */
export function daysInPeriod(
  date: Date = new Date(),
  cycleDay: number = 1,
  cycleHour: number = 0
): number {
  const start = periodStart(date, cycleDay, cycleHour);
  const end = periodEnd(date, cycleDay, cycleHour);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Days elapsed in the current period.
 */
export function daysElapsedInPeriod(
  date: Date = new Date(),
  cycleDay: number = 1,
  cycleHour: number = 0
): number {
  const start = periodStart(date, cycleDay, cycleHour);
  const now = new Date();
  const end = periodEnd(date, cycleDay, cycleHour);
  const isCurrentPeriod = now >= start && now <= end;
  if (isCurrentPeriod) {
    return Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }
  return daysInPeriod(date, cycleDay, cycleHour);
}

/**
 * Navigate to the previous period from a reference date.
 */
export function previousPeriod(
  date: Date,
  cycleDay: number = 1,
  cycleHour: number = 0
): Date {
  const start = periodStart(date, cycleDay, cycleHour);
  // Go 1 day before the current period start
  return new Date(start.getTime() - 24 * 60 * 60 * 1000);
}

/**
 * Navigate to the next period from a reference date.
 */
export function nextPeriod(
  date: Date,
  cycleDay: number = 1,
  cycleHour: number = 0
): Date {
  const end = periodEnd(date, cycleDay, cycleHour);
  // Go 1 second after the current period end
  return new Date(end.getTime() + 1000);
}

/**
 * Check if date falls in the current (today's) period.
 */
export function isCurrentPeriod(
  date: Date,
  cycleDay: number = 1,
  cycleHour: number = 0
): boolean {
  const now = new Date();
  const dateStart = periodStart(date, cycleDay, cycleHour).getTime();
  const nowStart = periodStart(now, cycleDay, cycleHour).getTime();
  return dateStart === nowStart;
}
