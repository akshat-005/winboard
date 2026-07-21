import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isConfigured } from './supabaseClient'
import Auth from './components/Auth'
import ProfileGate from './components/ProfileGate'
import Today from './components/Today'
import Habits from './components/Habits'
import Stats from './components/Stats'
import Social from './components/Social'
import FlipCounter from './components/FlipCounter'
import { TIERS, dateStr, pointsOnDate, winsOnDate, computeOverallStreak, justFoughtBack } from './lib/winLogic'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = not checked yet, null = signed out
  const [profile, setProfile] = useState(undefined) // undefined = loading, null = needs gate
  const [habits, setHabits] = useState([])
  const [wins, setWins] = useState([])
  const [tab, setTab] = useState('today')
  const [foughtBack, setFoughtBack] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  // ── Social state ──────────────────────────────────────────────
  const [leaderboard, setLeaderboard] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  const [friendsBoard, setFriendsBoard] = useState([])
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendActivity, setFriendActivity] = useState({}) // { [userId]: [...] }

  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounceRef = useRef(null)

  // ── Auth ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // ── Load everything when we have a session ─────────────────────
  useEffect(() => {
    if (session) {
      loadProfile()
      loadData()
    } else {
      setProfile(undefined)
      setHabits([])
      setWins([])
    }
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load social data when the SOCIAL tab is opened ────────────
  useEffect(() => {
    if (tab === 'social' && session && profile) {
      loadLeaderboard()
      loadFriendsData()
    }
  }, [tab, session, profile]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────
  // Profile
  // ─────────────────────────────────────────────────────────────
  async function loadProfile() {
    const userId = (await supabase.auth.getUser()).data?.user?.id
    if (!userId) return
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data ?? null) // null triggers the gate
  }

  async function onSaveProfile(displayName) {
    const userId = session.user.id
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: userId, display_name: displayName, visible_on_global: true })
      .select()
      .single()
    if (error) throw error
    setProfile(data)
  }

  // ─────────────────────────────────────────────────────────────
  // Core data (habits + wins)
  // ─────────────────────────────────────────────────────────────
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
    const row = { user_id: userId, ts: new Date().toISOString(), ...payload }
    const { data, error } = await supabase.from('wins').insert(row).select().single()
    if (error) { console.error(error); return }
    const updated = [...wins, data]
    setWins(updated)
    flashFoughtBack(updated)
  }

  async function onLogHabit(habit, tier) {
    await insertWin({ type: 'habit', habit_id: habit.id, name: habit.name, tier, points: TIERS[tier].points, note: null })
  }

  async function onUnlogHabit(habitId, today) {
    const win = winsOnDate(wins, today).find((w) => w.habit_id === habitId)
    if (!win) return
    const { error } = await supabase.from('wins').delete().eq('id', win.id)
    if (error) { console.error(error); return }
    setWins(wins.filter((w) => w.id !== win.id))
  }

  async function onAddOutcome({ name, tier, note }) {
    await insertWin({ type: 'outcome', habit_id: null, name, tier, points: TIERS[tier].points, note })
  }

  async function onAddClutch({ name, tier, note }) {
    await insertWin({ type: 'clutch', habit_id: null, name, tier, points: TIERS[tier].points, note })
  }

  async function onAddScannedWins(items) {
    const userId = session.user.id
    const ts = new Date().toISOString()
    const rows = items.map((item) => ({
      user_id: userId,
      ts,
      type: 'outcome',
      habit_id: null,
      name: item.name,
      tier: item.tier,
      points: TIERS[item.tier].points,
      note: item.note,
    }))
    const { data, error } = await supabase.from('wins').insert(rows).select()
    if (error) { console.error(error); return }
    const updated = [...wins, ...data]
    setWins(updated)
    flashFoughtBack(updated)
  }

  async function onAddHabit({ name, tier }) {
    const userId = session.user.id
    const { data, error } = await supabase
      .from('habits')
      .insert({ user_id: userId, name, tier, active: true })
      .select()
      .single()
    if (error) { console.error(error); return }
    setHabits([...habits, data])
  }

  async function onUpdateHabitTier(habitId, tier) {
    const { error } = await supabase.from('habits').update({ tier }).eq('id', habitId)
    if (error) { console.error(error); return }
    setHabits(habits.map((h) => (h.id === habitId ? { ...h, tier } : h)))
  }

  async function onArchiveHabit(habitId, restore) {
    const active = !!restore
    const { error } = await supabase.from('habits').update({ active }).eq('id', habitId)
    if (error) { console.error(error); return }
    setHabits(habits.map((h) => (h.id === habitId ? { ...h, active } : h)))
  }

  async function onResetAll() {
    const userId = session.user.id
    await supabase.from('wins').delete().eq('user_id', userId)
    await supabase.from('habits').delete().eq('user_id', userId)
    setWins([])
    setHabits([])
  }

  // ─────────────────────────────────────────────────────────────
  // Leaderboard
  // ─────────────────────────────────────────────────────────────
  async function loadLeaderboard() {
    setLeaderboardLoading(true)
    const [boardRes, rankRes] = await Promise.all([
      supabase.rpc('get_global_leaderboard'),
      supabase.rpc('get_my_global_rank'),
    ])
    if (!boardRes.error) setLeaderboard(boardRes.data || [])
    if (!rankRes.error) setMyRank(rankRes.data)
    setLeaderboardLoading(false)
  }

  async function onToggleVisible() {
    if (!profile) return
    const next = !profile.visible_on_global
    const { error } = await supabase
      .from('profiles')
      .update({ visible_on_global: next })
      .eq('id', session.user.id)
    if (error) { console.error(error); return }
    setProfile({ ...profile, visible_on_global: next })
    // Refresh rank / board to reflect the change
    loadLeaderboard()
  }

  // ─────────────────────────────────────────────────────────────
  // Friends
  // ─────────────────────────────────────────────────────────────
  async function loadFriendsData() {
    setFriendsLoading(true)
    const userId = session.user.id

    // Friends leaderboard
    const boardRes = await supabase.rpc('get_friends_leaderboard')
    if (!boardRes.error) setFriendsBoard(boardRes.data || [])

    // Pending requests
    const reqRes = await supabase
      .from('friend_requests')
      .select('id, from_user, to_user, status')
      .or(`from_user.eq.${userId},to_user.eq.${userId}`)
      .eq('status', 'pending')

    if (!reqRes.error && reqRes.data) {
      const reqs = reqRes.data

      // Collect unique "other" user IDs to resolve display names
      const otherIds = [...new Set(
        reqs.map((r) => (r.from_user === userId ? r.to_user : r.from_user))
      )]

      let nameMap = {}
      if (otherIds.length > 0) {
        const profilesRes = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', otherIds)
        if (!profilesRes.error) {
          profilesRes.data.forEach((p) => { nameMap[p.id] = p.display_name })
        }
      }

      const inc = reqs
        .filter((r) => r.to_user === userId)
        .map((r) => ({ id: r.id, from_user: r.from_user, display_name: nameMap[r.from_user] || '?' }))

      const out = reqs
        .filter((r) => r.from_user === userId)
        .map((r) => ({ id: r.id, to_user: r.to_user, display_name: nameMap[r.to_user] || '?' }))

      setIncoming(inc)
      setOutgoing(out)
    }

    setFriendsLoading(false)
  }

  const onSearch = useCallback(
    (query) => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = setTimeout(async () => {
        setSearchLoading(true)
        const userId = session.user.id

        // IDs already involved in a request (either direction)
        const reqRes = await supabase
          .from('friend_requests')
          .select('from_user, to_user')
          .or(`from_user.eq.${userId},to_user.eq.${userId}`)
        const excludeIds = new Set([userId])
        if (!reqRes.error) {
          reqRes.data.forEach((r) => {
            excludeIds.add(r.from_user)
            excludeIds.add(r.to_user)
          })
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name')
          .ilike('display_name', `%${query}%`)
          .limit(10)

        if (!error && data) {
          setSearchResults(data.filter((p) => !excludeIds.has(p.id)))
        }
        setSearchLoading(false)
      }, 300)
    },
    [session]
  )

  async function onAddFriend(toUserId) {
    const { error } = await supabase
      .from('friend_requests')
      .insert({ from_user: session.user.id, to_user: toUserId, status: 'pending' })
    if (error) { console.error(error); return }
    setSearchResults([])
    loadFriendsData()
  }

  async function onAccept(requestId) {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId)
    if (error) { console.error(error); return }
    loadFriendsData()
  }

  async function onDecline(requestId) {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'declined' })
      .eq('id', requestId)
    if (error) { console.error(error); return }
    setIncoming((prev) => prev.filter((r) => r.id !== requestId))
  }

  async function onCancelRequest(requestId) {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId)
    if (error) { console.error(error); return }
    setOutgoing((prev) => prev.filter((r) => r.id !== requestId))
  }

  async function onLoadActivity(friendUserId) {
    const { data, error } = await supabase.rpc('get_friend_recent_wins', {
      p_friend_id: friendUserId,
    })
    if (!error) {
      setFriendActivity((prev) => ({ ...prev, [friendUserId]: data || [] }))
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Render guards
  // ─────────────────────────────────────────────────────────────
  if (!isConfigured) {
    return (
      <div className="loading-screen" style={{ flexDirection: 'column', gap: '20px', padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--brass)' }}>WINBOARD</h1>
        <div style={{ maxWidth: '400px', lineHeight: '1.6', background: 'var(--pine)', padding: '24px', borderRadius: '8px', border: '1px solid var(--line)' }}>
          <p style={{ margin: '0 0 16px 0', fontWeight: 'bold' }}>Supabase connection is not configured yet.</p>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>
            Please copy <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--pine-dark)', padding: '2px 6px', borderRadius: '3px' }}>.env.example</code> to{' '}
            <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--pine-dark)', padding: '2px 6px', borderRadius: '3px' }}>.env</code> in the project directory and fill in your Supabase credentials:
          </p>
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

  // Profile check — show gate while loading (undefined) or if no row (null)
  if (profile === undefined) {
    return <div className="loading-screen">Loading your profile…</div>
  }

  if (profile === null) {
    return <ProfileGate onSave={onSaveProfile} />
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
        <button className={`tab${tab === 'social' ? ' active' : ''}`} onClick={() => setTab('social')}>
          SOCIAL
          {incoming.length > 0 && (
            <span
              style={{
                display: 'inline-block',
                marginLeft: 5,
                background: 'var(--brass)',
                color: 'var(--pine-dark)',
                borderRadius: '50%',
                fontSize: 8,
                fontWeight: 700,
                width: 14,
                height: 14,
                lineHeight: '14px',
                textAlign: 'center',
                verticalAlign: 'middle',
              }}
            >
              {incoming.length}
            </span>
          )}
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
            onAddScannedWins={onAddScannedWins}
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
        {tab === 'social' && (
          <Social
            // Leaderboard
            leaderboard={leaderboard}
            myRank={myRank}
            myDisplayName={profile?.display_name}
            visibleOnGlobal={profile?.visible_on_global}
            onToggleVisible={onToggleVisible}
            leaderboardLoading={leaderboardLoading}
            // Friends
            friendsBoard={friendsBoard}
            incoming={incoming}
            outgoing={outgoing}
            friendActivity={friendActivity}
            searchResults={searchResults}
            searchLoading={searchLoading}
            friendsLoading={friendsLoading}
            onSearch={onSearch}
            onAddFriend={onAddFriend}
            onAccept={onAccept}
            onDecline={onDecline}
            onCancelRequest={onCancelRequest}
            onLoadActivity={onLoadActivity}
          />
        )}
      </div>
    </div>
  )
}
