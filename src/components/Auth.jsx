import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError('')
    setInfo('')
    if (!email || !password) {
      setError('Enter both email and password.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        setInfo('Account created. Check your email if confirmation is required, then sign in.')
      }
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>WINBOARD</h1>
        <p className="auth-sub">
          {mode === 'signin' ? 'SIGN IN TO YOUR BOARD' : 'CREATE YOUR BOARD'}
        </p>
        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-error" style={{ color: '#9aa5ad' }}>{info}</div>}
        <input
          className="text-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <input
          className="text-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="primary-btn" onClick={submit} disabled={busy}>
          {busy ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
        <button
          className="auth-toggle"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError('')
            setInfo('')
          }}
        >
          {mode === 'signin' ? "No account yet? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
