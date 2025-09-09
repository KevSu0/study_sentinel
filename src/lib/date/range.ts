import { format, addDays, isAfter } from 'date-fns'
import { getDayStart } from './boundaries'

export type DateRange = { startDate: string; endDate: string }

export function buildDailyRange(date: Date, opts?: { dayStartHour?: number }): DateRange {
  const start = getDayStart(date, opts)
  const end = addDays(start, 1)
  return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') }
}

export function buildRollingRange(days: number, fromDate: Date = new Date(), opts?: { dayStartHour?: number }): DateRange {
  const end = getDayStart(fromDate, opts)
  const start = addDays(end, -days)
  return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') }
}

export function clampToRange(dateIso: string, range: DateRange) {
  return !(dateIso < range.startDate || isAfter(new Date(dateIso), new Date(range.endDate)))
}
