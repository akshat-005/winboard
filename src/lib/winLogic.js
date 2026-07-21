// Tier definitions: every win belongs to one of these.
export const TIERS = {
  bronze: { label: 'BRZ', points: 1, name: 'Bronze' },
  silver: { label: 'SLV', points: 2, name: 'Silver' },
  gold: { label: 'GLD', points: 3, name: 'Gold' },
}

export const TIER_ORDER = ['bronze', 'silver', 'gold']

// Local YYYY-MM-DD string (not UTC) so "today" matches the user's clock.
export function dateStr(d = new Date()) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(dateString, n) {
  const d = new Date(dateString + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return dateStr(d)
}

export function winsOnDate(wins, dateString) {
  return wins.filter((w) => dateStr(new Date(w.ts)) === dateString)
}

export function pointsOnDate(wins, dateString) {
  return winsOnDate(wins, dateString).reduce((sum, w) => sum + w.points, 0)
}

// Overall streak: consecutive days with at least one win, counting back from today.
// If today has no win yet, the streak shown is "still alive" based on yesterday backward.
export function computeOverallStreak(wins, today = dateStr()) {
  const daysWithWins = new Set(wins.map((w) => dateStr(new Date(w.ts))))
  let streak = 0
  let cursor = today
  if (!daysWithWins.has(cursor)) {
    cursor = addDays(cursor, -1)
  }
  while (daysWithWins.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function computeHabitStreak(wins, habitId, today = dateStr()) {
  const habitWins = wins.filter((w) => w.habit_id === habitId)
  return computeOverallStreak(habitWins, today)
}

// "Fought back": yesterday had zero wins, and today just got its first one.
export function justFoughtBack(wins, today = dateStr()) {
  const yesterday = addDays(today, -1)
  const todayCount = winsOnDate(wins, today).length
  const yesterdayCount = winsOnDate(wins, yesterday).length
  return yesterdayCount === 0 && todayCount === 1
}

// Last N days of points, oldest first, for the bar chart.
export function lastNDays(wins, n = 14, today = dateStr()) {
  const out = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = addDays(today, -i)
    const dateObj = new Date(d + 'T00:00:00')
    out.push({
      date: d,
      label: dateObj.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3),
      points: pointsOnDate(wins, d),
      count: winsOnDate(wins, d).length,
    })
  }
  return out
}

export function isLoggedToday(wins, habitId, today = dateStr()) {
  return winsOnDate(wins, today).some((w) => w.habit_id === habitId)
}
