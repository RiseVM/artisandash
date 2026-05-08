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
 * Format the time-of-day part of an instant in America/New_York (e.g. "2:14 PM").
 */
export function formatTimeEST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a full timestamp (date + time) in America/New_York, e.g. "Jan 5, 2026,
 * 2:14 PM EST". Use this anywhere we previously called `.toLocaleString()` so
 * the wall-clock value is always EST regardless of the viewer's local TZ.
 */
export function formatTimestampEST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }) + ' EST';
}

/**
 * Convert an EST wall-clock moment (year/month/day/hour/minute as the user typed
 * it on a clock in New York) into the corresponding UTC `Date`. DST-safe: it
 * works out the EST offset *for that specific moment* by formatting a naïve UTC
 * stamp through `Intl.DateTimeFormat`, so it correctly handles both EST (UTC-5)
 * and EDT (UTC-4) without any hardcoded offsets.
 *
 * Edge case: clock-in times inside the spring-forward gap (2:00–3:00 AM the
 * second Sunday of March) don't actually exist on the wall clock and will land
 * on the post-shift instant; that's fine for our use (admins fixing real
 * clock-ins, not synthesizing impossible ones).
 *
 * @param year       e.g. 2026
 * @param monthIndex 0 = January, 11 = December (matches `Date.UTC` convention)
 * @param day        1–31
 * @param hour24     0–23
 * @param minute     0–59
 */
export function estWallClockToUtc(
  year: number,
  monthIndex: number,
  day: number,
  hour24: number,
  minute: number,
): Date {
  const naiveUtcMs = Date.UTC(year, monthIndex, day, hour24, minute, 0);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(naiveUtcMs));
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  let h = get('hour');
  if (h === 24) h = 0; // some runtimes report midnight as 24
  const seenAsEstMs = Date.UTC(get('year'), get('month') - 1, get('day'), h, get('minute'), get('second'));
  const offsetMs = naiveUtcMs - seenAsEstMs; // EST offset for that wall-clock moment
  return new Date(naiveUtcMs + offsetMs);
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
