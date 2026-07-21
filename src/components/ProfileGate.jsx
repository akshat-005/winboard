import { useState } from 'react'

/**
 * Shown once, right after sign-in, when the user has no profile row yet.
 * On submit it calls onSave(displayName) — the actual Supabase insert lives
 * in App.jsx so the data-fetching pattern stays consistent.
 */
export default function ProfileGate({ onSave }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a display name.')
      return
    }
    if (trimmed.length > 32) {
      setError('Max 32 characters.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await onSave(trimmed)
    } catch (e) {
      // Postgres unique-violation code is 23505
      if (e?.code === '23505' || e?.message?.toLowerCase().includes('unique')) {
        setError("That name's taken, try another.")
      } else {
        setError(e?.message || 'Something went wrong.')
      }
      setBusy(false)
    }
    // if onSave resolves without throwing, App will re-render and unmount us
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>WINBOARD</h1>
        <p className="auth-sub">CHOOSE YOUR DISPLAY NAME</p>
        <p
          style={{
            fontSize: 13,
            color: 'var(--chalk-dim)',
            marginBottom: 16,
            lineHeight: 1.5,
            textAlign: 'center',
          }}
        >
          This is how you appear on leaderboards and to friends. You can only set it once — make it
          count.
        </p>
        {error && <div className="auth-error">{error}</div>}
        <input
          id="profile-gate-name"
          className="text-input"
          type="text"
          placeholder="e.g. ironmike"
          maxLength={32}
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="primary-btn" onClick={submit} disabled={busy}>
          {busy ? 'Saving...' : 'Lock it in'}
        </button>
      </div>
    </div>
  )
}
