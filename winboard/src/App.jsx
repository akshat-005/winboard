import { useEffect, useState } from 'react'
import { supabase, isConfigured } from './supabaseClient'
import Auth from './components/Auth'
import Today from './components/Today'
import Habits from './components/Habits'
import Stats from './components/Stats'
import FlipCounter from './components/FlipCounter'
import { TIERS, dateStr, pointsOnDate, winsOnDate, computeOverallStreak, justFoughtBack } from './lib/winLogic'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = not checked yet, null = signed out
  const [habits, setHabits] = useState([])
  const [wins, setWins] = useState([])
  const [tab, setTab] = useState('today')
  const [foughtBack, setFoughtBack] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) loadData()
    else {
      setHabits([])
      setWins([])
    }
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setDataLoading(true)
    const [habitsRes, winsRes] = await Promise.all([
      supabase.from('habits').select('*').order('created_at', { ascending: true }),
      supabase.from('wins').select('*').order('ts', { ascending: true }),
    ])
    if (!habitsRes.error) setHabits(habitsRes.data || [])
    if (!winsRes.error) setWins(winsRes.data || [])
    setDataLoading(false)
  }

  function flashFoughtBack(updatedWins) {
    if (justFoughtBack(updatedWins)) {
      setFoughtBack(true)
      setTimeout(() => setFoughtBack(false), 5000)
    }
  }

  async function insertWin(payload) {
    const userId = session.user.id
    const row = {
      user_id: userId,
      ts: new Date().toISOString(),
      ...payload,
    }
    const { data, error } = await supabase.from('wins').insert(row).select().single()
    if (error) {
      console.error(error)
      return
    }
    const updated = [...wins, data]
    setWins(updated)
    flashFoughtBack(updated)
  }

  async function onLogHabit(habit, tier) {
    await insertWin({
      type: 'habit',
      habit_id: habit.id,
      name: habit.name,
      tier,
      points: TIERS[tier].points,
      note: null,
    })
  }

  async function onUnlogHabit(habitId, today) {
    const win = winsOnDate(wins, today).find((w) => w.habit_id === habitId)
    if (!win) return
    const { error } = await supabase.from('wins').delete().eq('id', win.id)
    if (error) {
      console.error(error)
      return
    }
    setWins(wins.filter((w) => w.id !== win.id))
  }

  async function onAddOutcome({ name, tier, note }) {
    await insertWin({ type: 'outcome', habit_id: null, name, tier, points: TIERS[tier].points, note })
  }

  async function onAddClutch({ name, tier, note }) {
    await insertWin({ type: 'clutch', habit_id: null, name, tier, points: TIERS[tier].points, note })
  }

  async function onAddHabit({ name, tier }) {
    const userId = session.user.id
    const { data, error } = await supabase
      .from('habits')
      .insert({ user_id: userId, name, tier, active: true })
      .select()
      .single()
    if (error) {
      console.error(error)
      return
    }
    setHabits([...habits, data])
  }

  async function onUpdateHabitTier(habitId, tier) {
    const { error } = await supabase.from('habits').update({ tier }).eq('id', habitId)
    if (error) {
      console.error(error)
      return
    }
    setHabits(habits.map((h) => (h.id === habitId ? { ...h, tier } : h)))
  }

  async function onArchiveHabit(habitId, restore) {
    const active = !!restore
    const { error } = await supabase.from('habits').update({ active }).eq('id', habitId)
    if (error) {
      console.error(error)
      return
    }
    setHabits(habits.map((h) => (h.id === habitId ? { ...h, active } : h)))
  }

  async function onResetAll() {
    const userId = session.user.id
    await supabase.from('wins').delete().eq('user_id', userId)
    await supabase.from('habits').delete().eq('user_id', userId)
    setWins([])
    setHabits([])
  }

  if (!isConfigured) {
    return (
      <div className="loading-screen" style={{ flexDirection: 'column', gap: '20px', padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--brass)' }}>WINBOARD</h1>
        <div style={{ maxWidth: '400px', lineHeight: '1.6', background: 'var(--pine)', padding: '24px', borderRadius: '8px', border: '1px solid var(--line)' }}>
          <p style={{ margin: '0 0 16px 0', fontWeight: 'bold' }}>Supabase connection is not configured yet.</p>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>Please copy <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--pine-dark)', padding: '2px 6px', borderRadius: '3px' }}>.env.example</code> to <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--pine-dark)', padding: '2px 6px', borderRadius: '3px' }}>.env</code> in the project directory and fill in your Supabase credentials:</p>
          <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textAlign: 'left', background: 'var(--pine-dark)', padding: '12px', borderRadius: '4px', overflowX: 'auto', margin: '0 0 16px 0', border: '1px solid var(--line)' }}>
{`VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key`}
          </pre>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--chalk-dim)' }}>After creating the file, restart the development server.</p>
        </div>
      </div>
    )
  }

  if (session === undefined) {
    return <div className="loading-screen">Loading WINBOARD...</div>
  }

  if (!session) {
    return <Auth />
  }

  if (dataLoading) {
    return <div className="loading-screen">Pulling up your board...</div>
  }

  const today = dateStr()
  const todayPoints = pointsOnDate(wins, today)
  const todayCount = winsOnDate(wins, today).length
  const streak = computeOverallStreak(wins)

  return (
    <div className="app">
      <div className="topbar">
        <h1>WINBOARD</h1>
        <div>
          <span className="streak-pill">STREAK {streak}</span>
          <button className="signout" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>

      <div className="hero">
        <div className="tally-label">Points today</div>
        <FlipCounter value={todayPoints} />
        <div className="tally-sub">
          {todayCount} {todayCount === 1 ? 'win' : 'wins'} logged
        </div>
        {foughtBack && <div className="fought-back-banner">FOUGHT BACK — first win after a blank day</div>}
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'today' ? ' active' : ''}`} onClick={() => setTab('today')}>
          TODAY
        </button>
        <button className={`tab${tab === 'habits' ? ' active' : ''}`} onClick={() => setTab('habits')}>
          HABITS
        </button>
        <button className={`tab${tab === 'stats' ? ' active' : ''}`} onClick={() => setTab('stats')}>
          STATS
        </button>
      </div>

      <div className="tab-content">
        {tab === 'today' && (
          <Today
            habits={habits}
            wins={wins}
            onLogHabit={onLogHabit}
            onUnlogHabit={onUnlogHabit}
            onAddOutcome={onAddOutcome}
            onAddClutch={onAddClutch}
          />
        )}
        {tab === 'habits' && (
          <Habits
            habits={habits}
            onAddHabit={onAddHabit}
            onUpdateHabitTier={onUpdateHabitTier}
            onArchiveHabit={onArchiveHabit}
          />
        )}
        {tab === 'stats' && <Stats habits={habits} wins={wins} onResetAll={onResetAll} />}
      </div>
    </div>
  )
}
