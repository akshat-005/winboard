import { useState } from 'react'
import { TIERS, TIER_ORDER, isLoggedToday, winsOnDate, dateStr } from '../lib/winLogic'
import ScanWins from './ScanWins'

export default function Today({
  habits,
  wins,
  pendingTasks,
  onLogHabit,
  onUnlogHabit,
  onAddOutcome,
  onAddClutch,
  onAddPendingTasks,
  onLogPendingTask,
  onDismissPendingTask,
}) {
  const today = dateStr()
  const [promoted, setPromoted] = useState(new Set())
  const [panel, setPanel] = useState(null) // null | 'outcome' | 'clutch'
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [tier, setTier] = useState('silver')

  const activeHabits = habits.filter((h) => h.active)
  const todaysWins = winsOnDate(wins, today).slice().sort((a, b) => new Date(b.ts) - new Date(a.ts))

  function togglePromote(habitId) {
    const next = new Set(promoted)
    if (next.has(habitId)) next.delete(habitId)
    else next.add(habitId)
    setPromoted(next)
  }

  function handleHabitTap(habit) {
    const logged = isLoggedToday(wins, habit.id, today)
    if (logged) {
      onUnlogHabit(habit.id, today)
      return
    }
    const effectiveTier = promoted.has(habit.id) ? 'gold' : habit.tier
    onLogHabit(habit, effectiveTier)
    if (promoted.has(habit.id)) togglePromote(habit.id)
  }

  function openPanel(type) {
    setPanel(type)
    setName('')
    setNote('')
    setTier(type === 'clutch' ? 'gold' : 'silver')
  }

  function submitPanel() {
    if (panel === 'outcome') {
      if (!name.trim()) return
      onAddOutcome({ name: name.trim(), tier, note: note.trim() || null })
    } else if (panel === 'clutch') {
      if (!note.trim()) return
      onAddClutch({ name: name.trim() || 'Clutch win', tier, note: note.trim() })
    }
    setPanel(null)
  }

  return (
    <div>
      <div className="section-title">Habits</div>
      {activeHabits.length === 0 && (
        <div className="empty-state">No habits yet — add one in the Habits tab to start your streak.</div>
      )}
      {activeHabits.map((habit) => {
        const logged = isLoggedToday(wins, habit.id, today)
        return (
          <div className="habit-row" key={habit.id}>
            <button
              className={`promote-toggle${promoted.has(habit.id) ? ' active' : ''}`}
              title="Mark today's attempt as Gold (unusually hard)"
              onClick={() => togglePromote(habit.id)}
              disabled={logged}
            >
              ★
            </button>
            <div className="habit-name">
              {habit.name}
              <div className="habit-meta">
                default <span className={`tier-pill tier-${habit.tier}`}>{TIERS[habit.tier].label}</span>
              </div>
            </div>
            <button className={`log-btn${logged ? ' logged' : ''}`} onClick={() => handleHabitTap(habit)}>
              {logged ? 'Logged ✓' : 'Log win'}
            </button>
          </div>
        )
      })}

      {pendingTasks.length > 0 && (
        <>
          <div className="section-title">Scanned tasks</div>
          {pendingTasks.map((task) => (
            <div className="habit-row" key={task.id}>
              <div className="habit-name">
                {task.name}
                {task.note && <span className="win-note">{task.note}</span>}
              </div>
              <span className={`tier-pill tier-${task.tier}`}>{TIERS[task.tier].label}</span>
              <button className="log-btn" onClick={() => onLogPendingTask(task)}>
                Log win
              </button>
              <button
                className="scan-candidate-remove"
                onClick={() => onDismissPendingTask(task.id)}
                title="Discard"
              >
                ×
              </button>
            </div>
          ))}
        </>
      )}

      <div className="action-row">
        <button className="action-btn" onClick={() => openPanel('outcome')}>
          + Outcome win
        </button>
        <button className="action-btn" onClick={() => openPanel('clutch')}>
          + Clutch win
        </button>
      </div>

      <ScanWins habits={activeHabits} onConfirm={onAddPendingTasks} />

      {panel && (
        <div className="inline-panel">
          {panel === 'outcome' && (
            <input
              className="text-input"
              placeholder="What did you win? (e.g. Won the match)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitPanel()}
            />
          )}
          {panel === 'clutch' && (
            <input
              className="text-input"
              placeholder="Short title (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitPanel()}
            />
          )}
          <textarea
            className="text-input"
            rows={3}
            placeholder={
              panel === 'clutch'
                ? 'What was the situation, and what did you do instead of folding?'
                : 'Note (optional)'
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="tier-select">
            {TIER_ORDER.map((t) => (
              <button
                key={t}
                className={tier === t ? 'selected' : ''}
                onClick={() => setTier(t)}
              >
                {TIERS[t].label}
              </button>
            ))}
          </div>
          <div className="action-row" style={{ marginTop: 0 }}>
            <button className="action-btn" onClick={() => setPanel(null)}>
              Cancel
            </button>
            <button className="primary-btn" onClick={submitPanel}>
              Log it
            </button>
          </div>
        </div>
      )}

      <div className="section-title">Today's wins</div>
      {todaysWins.length === 0 && <div className="empty-state">Nothing logged yet — go get one.</div>}
      {todaysWins.map((w) => (
        <div className="win-item" key={w.id}>
          <span className={`tier-pill tier-${w.tier}`}>{TIERS[w.tier].label}</span>
          <div className="win-name">
            {w.name}
            {w.note && <span className="win-note">{w.note}</span>}
          </div>
          <span className="win-time">
            {new Date(w.ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="win-points">+{w.points}</span>
        </div>
      ))}
    </div>
  )
}
