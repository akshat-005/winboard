/**
 * Global leaderboard sub-view.
 *
 * Props (all data/callbacks come from App.jsx — no Supabase calls here):
 *   leaderboard      – array of { display_name, weekly_points, streak }
 *   myRank           – int | null (null = user opted out)
 *   myDisplayName    – string (to highlight own row)
 *   visibleOnGlobal  – boolean
 *   onToggleVisible  – () => void  (flips the profile flag)
 *   loading          – boolean
 */
export default function Leaderboard({
  leaderboard,
  myRank,
  myDisplayName,
  visibleOnGlobal,
  onToggleVisible,
  loading,
}) {
  if (loading) {
    return <div className="empty-state">Loading leaderboard…</div>
  }

  return (
    <div>
      {/* ── Rank banner ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          {myRank != null ? (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--brass)',
              }}
            >
              Your rank this week:{' '}
              <strong style={{ fontSize: 16 }}>#{myRank}</strong>
            </span>
          ) : (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--chalk-dim)' }}>
              You're hidden from the global board
            </span>
          )}
        </div>

        {/* Visibility toggle */}
        <button
          id="toggle-global-visibility"
          onClick={onToggleVisible}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            padding: '5px 12px',
            borderRadius: 3,
            border: visibleOnGlobal
              ? '1px solid var(--brass)'
              : '1px solid var(--line)',
            background: visibleOnGlobal
              ? 'rgba(201,162,39,0.12)'
              : 'var(--pine-dark)',
            color: visibleOnGlobal ? 'var(--brass)' : 'var(--chalk-dim)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {visibleOnGlobal ? '● Visible' : '○ Hidden'}
        </button>
      </div>

      {/* ── Board ── */}
      {leaderboard.length === 0 ? (
        <div className="empty-state">
          No one is on the board yet — log some wins and be the first!
        </div>
      ) : (
        leaderboard.map((row, i) => {
          const isMe = row.display_name === myDisplayName
          return (
            <div
              key={row.display_name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderBottom: '1px solid var(--line)',
                background: isMe ? 'rgba(201,162,39,0.07)' : 'transparent',
                borderRadius: isMe ? 4 : 0,
              }}
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
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: isMe ? 'var(--brass)' : 'var(--chalk)',
                  fontWeight: isMe ? 600 : 400,
                }}
              >
                {row.display_name}
                {isMe && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--brass)',
                      marginLeft: 6,
                      opacity: 0.7,
                    }}
                  >
                    you
                  </span>
                )}
              </span>

              {/* Streak badge */}
              <span className="streak-pill" style={{ fontSize: 11, padding: '2px 7px' }}>
                🔥 {row.streak}
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
                {row.weekly_points}
                <span style={{ fontSize: 9, color: 'var(--chalk-dim)', marginLeft: 2 }}>pts</span>
              </span>
            </div>
          )
        })
      )}

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
        RANKED BY ROLLING 7-DAY POINTS
      </p>
    </div>
  )
}
