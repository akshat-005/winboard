import { useState } from 'react'
import { TIERS } from '../lib/winLogic'

/**
 * Friends sub-view.
 *
 * All Supabase calls are delegated to App.jsx through these props:
 *   friendsBoard        – [{ user_id, display_name, weekly_points, streak }]
 *   incoming            – [{ id, from_user, display_name }]   (pending to me)
 *   outgoing            – [{ id, to_user,   display_name }]   (pending from me)
 *   friendActivity      – { [user_id]: [{ type, name, tier, points, ts }] }
 *   searchResults       – [{ id, display_name }]
 *   searchLoading       – boolean
 *   friendsLoading      – boolean
 *   onSearch            – (query) => void
 *   onAddFriend         – (toUserId) => void
 *   onAccept            – (requestId) => void
 *   onDecline           – (requestId) => void
 *   onCancelRequest     – (requestId) => void
 *   onLoadActivity      – (friendUserId) => void
 */
export default function Friends({
  friendsBoard,
  incoming,
  outgoing,
  friendActivity,
  searchResults,
  searchLoading,
  friendsLoading,
  onSearch,
  onAddFriend,
  onAccept,
  onDecline,
  onCancelRequest,
  onLoadActivity,
}) {
  const [query, setQuery] = useState('')
  const [expandedFriend, setExpandedFriend] = useState(null)

  function handleQueryChange(e) {
    const q = e.target.value
    setQuery(q)
    if (q.trim().length >= 2) {
      onSearch(q.trim())
    }
  }

  function toggleFriendActivity(userId) {
    if (expandedFriend === userId) {
      setExpandedFriend(null)
    } else {
      setExpandedFriend(userId)
      if (!friendActivity[userId]) {
        onLoadActivity(userId)
      }
    }
  }

  return (
    <div>
      {/* ── Search ── */}
      <div className="section-title">Find friends</div>
      <input
        id="friend-search-input"
        className="text-input"
        type="text"
        placeholder="Search by display name…"
        value={query}
        onChange={handleQueryChange}
      />
      {searchLoading && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--chalk-dim)', marginBottom: 8 }}>
          Searching…
        </div>
      )}
      {!searchLoading && query.trim().length >= 2 && searchResults.length === 0 && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--chalk-dim)', marginBottom: 8 }}>
          No results.
        </div>
      )}
      {searchResults.map((r) => (
        <div
          key={r.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 0',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <span style={{ flex: 1, fontSize: 14 }}>{r.display_name}</span>
          <button
            id={`add-friend-${r.id}`}
            className="log-btn"
            onClick={() => {
              onAddFriend(r.id)
              setQuery('')
            }}
          >
            Add friend
          </button>
        </div>
      ))}

      {/* ── Incoming requests ── */}
      {incoming.length > 0 && (
        <>
          <div className="section-title">Incoming requests</div>
          {incoming.map((req) => (
            <div
              key={req.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <span style={{ flex: 1, fontSize: 14 }}>{req.display_name}</span>
              <button
                id={`accept-${req.id}`}
                className="log-btn logged"
                style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={() => onAccept(req.id)}
              >
                Accept
              </button>
              <button
                id={`decline-${req.id}`}
                className="action-btn"
                style={{ flex: 'none', padding: '6px 12px', fontSize: 12 }}
                onClick={() => onDecline(req.id)}
              >
                Decline
              </button>
            </div>
          ))}
        </>
      )}

      {/* ── Outgoing requests ── */}
      {outgoing.length > 0 && (
        <>
          <div className="section-title">Sent requests</div>
          {outgoing.map((req) => (
            <div
              key={req.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <span style={{ flex: 1, fontSize: 14, color: 'var(--chalk-dim)' }}>
                {req.display_name}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--chalk-dim)',
                  marginRight: 4,
                }}
              >
                Requested
              </span>
              <button
                id={`cancel-${req.id}`}
                className="action-btn"
                style={{ flex: 'none', padding: '5px 10px', fontSize: 11 }}
                onClick={() => onCancelRequest(req.id)}
              >
                Cancel
              </button>
            </div>
          ))}
        </>
      )}

      {/* ── Friends leaderboard ── */}
      <div className="section-title">Friends board</div>
      {friendsLoading && <div className="empty-state">Loading…</div>}
      {!friendsLoading && friendsBoard.length === 0 && (
        <div className="empty-state">
          Add friends to see how you stack up against each other this week.
        </div>
      )}
      {friendsBoard.map((friend, i) => {
        const isExpanded = expandedFriend === friend.user_id
        const activity = friendActivity[friend.user_id]

        return (
          <div key={friend.user_id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                borderBottom: isExpanded ? 'none' : '1px solid var(--line)',
                cursor: 'pointer',
              }}
              onClick={() => toggleFriendActivity(friend.user_id)}
            >
              {/* Rank */}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: i < 3 ? 'var(--brass)' : 'var(--chalk-dim)',
                  minWidth: 24,
                  textAlign: 'right',
                }}
              >
                #{i + 1}
              </span>

              {/* Name */}
              <span style={{ flex: 1, fontSize: 14 }}>{friend.display_name}</span>

              {/* Streak */}
              <span className="streak-pill" style={{ fontSize: 11, padding: '2px 7px' }}>
                🔥 {friend.streak}
              </span>

              {/* Points */}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--brass)',
                  minWidth: 36,
                  textAlign: 'right',
                }}
              >
                {friend.weekly_points}
                <span style={{ fontSize: 9, color: 'var(--chalk-dim)', marginLeft: 2 }}>pts</span>
              </span>

              {/* Expand chevron */}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--chalk-dim)',
                  marginLeft: 2,
                }}
              >
                {isExpanded ? '▲' : '▼'}
              </span>
            </div>

            {/* Recent activity panel */}
            {isExpanded && (
              <div
                className="inline-panel"
                style={{ marginTop: 0, borderTop: 'none', borderRadius: '0 0 6px 6px' }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '1px',
                    color: 'var(--chalk-dim)',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Recent wins
                </div>

                {!activity && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--chalk-dim)' }}>
                    Loading…
                  </div>
                )}

                {activity && activity.length === 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--chalk-dim)' }}>
                    No wins logged yet.
                  </div>
                )}

                {activity &&
                  activity.map((w, idx) => (
                    <div
                      key={idx}
                      className="win-item"
                      style={{ paddingTop: 8, paddingBottom: 8 }}
                    >
                      <span className={`tier-pill tier-${w.tier}`}>
                        {TIERS[w.tier]?.label ?? w.tier.toUpperCase().slice(0, 3)}
                      </span>
                      <div className="win-name" style={{ fontSize: 13 }}>
                        {w.name}
                        {/* Note is intentionally never shown here */}
                      </div>
                      <span className="win-time">
                        {new Date(w.ts).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="win-points">+{w.points}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )
      })}

      {!friendsLoading && friendsBoard.length > 0 && (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--chalk-dim)',
            textAlign: 'center',
            marginTop: 16,
            letterSpacing: '0.5px',
          }}
        >
          RANKED BY ROLLING 7-DAY POINTS · TAP A FRIEND TO SEE RECENT WINS
        </p>
      )}
    </div>
  )
}
