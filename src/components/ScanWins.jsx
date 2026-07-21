import { useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { TIERS, TIER_ORDER } from '../lib/winLogic'

export default function ScanWins({ onConfirm }) {
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

      const { data, error: fnError } = await supabase.functions.invoke('scan-todos', {
        body: { imageBase64, mimeType: file.type },
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
        items.map((item) => ({
          id: crypto.randomUUID(),
          name: item.name || 'Untitled',
          tier: TIER_ORDER.includes(item.tier) ? item.tier : 'silver',
          note: item.note || '',
          checked: true,
        }))
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
    onConfirm(checked.map(({ name, tier, note }) => ({ name: name.trim(), tier, note: note.trim() || null })))
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
              Confirm & add {checkedCount} {checkedCount === 1 ? 'win' : 'wins'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
