export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function daysSince(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / 86_400_000)
}

export function formatDuration(startedAt: number, finishedAt?: number): string {
  const end = finishedAt ?? Date.now()
  const totalMinutes = Math.max(0, Math.round((end - startedAt) / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

const MS_PER_DAY = 86_400_000

/** Start of the Monday-anchored week containing `timestamp`, at local midnight. */
export function startOfWeek(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  const isoDayOffset = (date.getDay() + 6) % 7 // Mon=0 .. Sun=6
  date.setTime(date.getTime() - isoDayOffset * MS_PER_DAY)
  return date.getTime()
}

/** Start of the calendar month containing `timestamp`, at local midnight on the 1st. */
export function startOfMonth(timestamp: number): number {
  const date = new Date(timestamp)
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
}

export function formatWeekLabel(weekStart: number): string {
  return new Date(weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatMonthLabel(monthStart: number): string {
  return new Date(monthStart).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}
