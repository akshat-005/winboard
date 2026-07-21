import { lastNDays, computeOverallStreak, computeHabitStreak } from '../lib/winLogic'

export default function Stats({ habits, wins, onResetAll }) {
  const days = lastNDays(wins, 14)
  const maxPoints = Math.max(1, ...days.map((d) => d.points))
  const overallStreak = computeOverallStreak(wins)
  const clutchWins = wins
    .filter((w) => w.type === 'clutch')
    .slice()
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))

  function handleReset() {
    const ok = window.confirm(
      'This deletes all your habits and logged wins permanently. This cannot be undone. Continue?'
    )
    if (ok) onResetAll()
  }

  return (
    <div>
      <div className="section-title">Last 14 days</div>
      <div className="bar-chart">
        {days.map((d) => (
          <div className="bar-col" key={d.date}>
            <div className="bar" style={{ height: `${(d.points / maxPoints) * 100}%` }} title={`${d.points} pts`} />
            <div className="bar-label">{d.label[0]}</div>
          </div>
        ))}
      </div>

      <div className="section-title">Streaks</div>
      <div className="streak-row">
        <span>Overall win streak</span>
        <span className="streak-value">{overallStreak} {overallStreak === 1 ? 'day' : 'days'}</span>
      </div>
      {habits.filter((h) => h.active).map((h) => (
        <div className="streak-row" key={h.id}>
          <span>{h.name}</span>
          <span className="streak-value">{computeHabitStreak(wins, h.id)} {computeHabitStreak(wins, h.id) === 1 ? 'day' : 'days'}</span>
        </div>
      ))}

      <div className="section-title">Clutch log</div>
      {clutchWins.length === 0 && (
        <div className="empty-state">No clutch wins logged yet — the next time odds are against you, log it here.</div>
      )}
      {clutchWins.map((w) => (
        <div className="clutch-entry" key={w.id}>
          <div className="clutch-date">
            {new Date(w.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}
            {w.name}
          </div>
          <div style={{ marginTop: 4, fontSize: 14 }}>{w.note}</div>
        </div>
      ))}

      <button className="danger-btn" onClick={handleReset}>
        Reset all data
      </button>
    </div>
  )
}
