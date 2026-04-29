import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateEST(date: Date | string, options?: { includeTime?: boolean }): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (options?.includeTime) {
    return d.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) + ' EST';
  }
  return d.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatShortDateEST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric'
  });
}

export function formatReminderDateEST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Return the date the given instant *falls on* in America/New_York, formatted
 * as `YYYY-MM-DD`. This is what timesheet filtering uses so the bucket matches
 * what the user sees on screen — a 9pm EST Monday clock-in is bucketed as
 * Monday, not as Tuesday UTC.
 *
 * Uses `en-CA` locale because it natively formats as `YYYY-MM-DD`, avoiding
 * the need to parse `Intl.DateTimeFormat` parts.
 */
export function toEstDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/**
 * Compute the Mon–Sun week range that contains `reference` (default: now)
 * *as seen in America/New_York*, returned as `YYYY-MM-DD` strings.
 *
 * The week math is done on a fictional UTC date that mirrors the EST
 * weekday/day-of-month — that keeps it immune to DST jumps, since adding
 * `n * 86_400_000` ms in UTC always advances exactly `n` calendar days.
 */
export function getEstWeekRange(reference?: Date): { start: string; end: string } {
  const ref = reference ?? new Date();

  // Read the EST weekday/year/month/day for the reference instant.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ref);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = get('weekday'); // Mon | Tue | ...
  const year = parseInt(get('year'), 10);
  const month = parseInt(get('month'), 10);
  const day = parseInt(get('day'), 10);

  // Mon=0, Tue=1, ..., Sun=6 — Monday-based offset
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const offsetFromMonday = map[weekday] ?? 0;

  // Anchor on UTC so day arithmetic is unaffected by DST or the runtime's local zone.
  const anchorMs = Date.UTC(year, month - 1, day);
  const mondayMs = anchorMs - offsetFromMonday * 86_400_000;
  const sundayMs = mondayMs + 6 * 86_400_000;

  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { start: fmt(mondayMs), end: fmt(sundayMs) };
}
