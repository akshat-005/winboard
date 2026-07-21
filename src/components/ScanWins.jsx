import { useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { TIERS, TIER_ORDER } from '../lib/winLogic'

function resolveRouting(item, habits) {
  if (item.habitMatch) {
    const matched = habits.find((h) => h.name.toLowerCase() === item.habitMatch.toLowerCase())
    if (matched) return { type: 'habit', habitId: matched.id, badge: `→ Habit: ${matched.name}` }
  }
  if (item.explicitType === 'habit') {
    return { type: 'habit', habitId: null, badge: '→ New habit' }
  }
  if (item.explicitType === 'clutch') {
    return { type: 'clutch', habitId: null, badge: '→ Clutch' }
  }
  return { type: 'outcome', habitId: null, badge: null }
}

export default function ScanWins({ habits, onConfirm }) {
  const fileInputRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | scanning | reviewing | error
  const [error, setError] = useState('')
  const [candidates, setCandidates] = useState([])

  function triggerPick() {
    fileInputRef.current?.click()
  }

  function reset() {
    setStatus('idle')
    setError('')
    setCandidates([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('scanning')
    setError('')
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const imageBase64 = dataUrl.split(',')[1]

      const { data, error: fnError } = await supabase.functions.invoke('clever-worker', {
        body: { imageBase64, mimeType: file.type, habitNames: habits.map((h) => h.name) },
      })
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)

      const items = data?.items || []
      if (items.length === 0) {
        setError('No tasks found in that photo — try a clearer shot.')
        setStatus('error')
        return
      }

      setCandidates(
        items.map((item) => {
          const routing = resolveRouting(item, habits)
          return {
            id: crypto.randomUUID(),
            name: item.name || 'Untitled',
            tier: TIER_ORDER.includes(item.tier) ? item.tier : 'silver',
            note: item.note || '',
            checked: true,
            ...routing,
          }
        })
      )
      setStatus('reviewing')
    } catch (err) {
      setError(err.message || 'Something went wrong scanning that photo.')
      setStatus('error')
    }
  }

  function updateCandidate(id, patch) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function removeCandidate(id) {
    setCandidates((prev) => prev.filter((c) => c.id !== id))
  }

  function confirm() {
    const checked = candidates.filter((c) => c.checked && c.name.trim())
    if (checked.length === 0) return
    onConfirm(
      checked.map(({ name, tier, note, type, habitId }) => ({
        name: name.trim(),
        tier,
        note: note.trim() || null,
        type,
        habitId,
      }))
    )
    reset()
  }

  const checkedCount = candidates.filter((c) => c.checked).length

  return (
    <>
      <div className="action-row" style={{ marginTop: 8 }}>
        <button className="action-btn" onClick={triggerPick} disabled={status === 'scanning'}>
          {status === 'scanning' ? 'Scanning…' : '+ Scan photo'}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {status === 'error' && (
        <div className="inline-panel">
          <div className="empty-state" style={{ padding: 0, marginBottom: 10 }}>
            {error}
          </div>
          <button className="action-btn" onClick={reset}>
            Try again
          </button>
        </div>
      )}

      {status === 'reviewing' && (
        <div className="inline-panel">
          {candidates.map((c) => (
            <div className="scan-candidate" key={c.id}>
              <input
                type="checkbox"
                className="scan-candidate-checkbox"
                checked={c.checked}
                onChange={(e) => updateCandidate(c.id, { checked: e.target.checked })}
              />
              <div className="scan-candidate-fields">
                <input
                  className="text-input"
                  value={c.name}
                  onChange={(e) => updateCandidate(c.id, { name: e.target.value })}
                />
                {c.badge && (
                  <div className="win-note" style={{ marginTop: -4, marginBottom: 8 }}>
                    {c.badge}
                  </div>
                )}
                <div className="tier-select">
                  {TIER_ORDER.map((t) => (
                    <button
                      key={t}
                      className={c.tier === t ? 'selected' : ''}
                      onClick={() => updateCandidate(c.id, { tier: t })}
                    >
                      {TIERS[t].label}
                    </button>
                  ))}
                </div>
                <input
                  className="text-input"
                  style={{ marginBottom: 0 }}
                  placeholder="Note (optional)"
                  value={c.note}
                  onChange={(e) => updateCandidate(c.id, { note: e.target.value })}
                />
              </div>
              <button className="scan-candidate-remove" onClick={() => removeCandidate(c.id)} title="Remove">
                ×
              </button>
            </div>
          ))}
          <div className="action-row" style={{ marginTop: 12 }}>
            <button className="action-btn" onClick={reset}>
              Cancel
            </button>
            <button className="primary-btn" onClick={confirm} disabled={checkedCount === 0}>
              Confirm & add {checkedCount} {checkedCount === 1 ? 'task' : 'tasks'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
