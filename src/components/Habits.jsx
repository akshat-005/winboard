import { useState } from 'react'
import { TIERS, TIER_ORDER } from '../lib/winLogic'

export default function Habits({ habits, onAddHabit, onUpdateHabitTier, onArchiveHabit }) {
  const [name, setName] = useState('')
  const [tier, setTier] = useState('silver')

  function submit() {
    if (!name.trim()) return
    onAddHabit({ name: name.trim(), tier })
    setName('')
    setTier('silver')
  }

  const active = habits.filter((h) => h.active)
  const archived = habits.filter((h) => !h.active)

  return (
    <div>
      <div className="section-title">Add a habit</div>
      <input
        className="text-input"
        placeholder="e.g. Study 30 min"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <div className="tier-select">
        {TIER_ORDER.map((t) => (
          <button key={t} className={tier === t ? 'selected' : ''} onClick={() => setTier(t)}>
            {TIERS[t].label}
          </button>
        ))}
      </div>
      <button className="primary-btn" onClick={submit}>
        Add habit
      </button>

      <div className="section-title">Active habits</div>
      {active.length === 0 && <div className="empty-state">No habits yet — add your first one above.</div>}
      {active.map((h) => (
        <div className="habit-row" key={h.id}>
          <div className="habit-name">{h.name}</div>
          <div className="tier-select" style={{ marginBottom: 0, width: 140 }}>
            {TIER_ORDER.map((t) => (
              <button
                key={t}
                className={h.tier === t ? 'selected' : ''}
                onClick={() => onUpdateHabitTier(h.id, t)}
              >
                {TIERS[t].label}
              </button>
            ))}
          </div>
          <button className="action-btn" style={{ flex: 'none', padding: '7px 12px' }} onClick={() => onArchiveHabit(h.id)}>
            Archive
          </button>
        </div>
      ))}

      {archived.length > 0 && (
        <>
          <div className="section-title">Archived</div>
          {archived.map((h) => (
            <div className="habit-row" key={h.id}>
              <div className="habit-name" style={{ color: 'var(--chalk-dim)' }}>
                {h.name}
              </div>
              <button className="action-btn" style={{ flex: 'none', padding: '7px 12px' }} onClick={() => onArchiveHabit(h.id, true)}>
                Restore
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
