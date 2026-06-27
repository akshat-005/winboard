import { useState } from 'react'
import Leaderboard from './Leaderboard'
import Friends from './Friends'

/**
 * Social tab shell — owns the Leaderboard / Friends sub-nav.
 * All data props and callbacks are threaded through from App.jsx.
 */
export default function Social({
  // Leaderboard
  leaderboard,
  myRank,
  myDisplayName,
  visibleOnGlobal,
  onToggleVisible,
  leaderboardLoading,
  // Friends
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
  const [subView, setSubView] = useState('leaderboard') // 'leaderboard' | 'friends'

  return (
    <div>
      {/* Sub-nav — reuses .tier-select visual style */}
      <div className="tier-select" style={{ marginBottom: 18 }}>
        <button
          id="social-sub-leaderboard"
          className={subView === 'leaderboard' ? 'selected' : ''}
          onClick={() => setSubView('leaderboard')}
        >
          Leaderboard
        </button>
        <button
          id="social-sub-friends"
          className={subView === 'friends' ? 'selected' : ''}
          onClick={() => setSubView('friends')}
        >
          Friends
          {/* incoming badge */}
          {incoming.length > 0 && (
            <span
              style={{
                display: 'inline-block',
                marginLeft: 6,
                background: 'var(--brass)',
                color: 'var(--pine-dark)',
                borderRadius: '50%',
                fontSize: 9,
                fontWeight: 700,
                width: 16,
                height: 16,
                lineHeight: '16px',
                textAlign: 'center',
              }}
            >
              {incoming.length}
            </span>
          )}
        </button>
      </div>

      {subView === 'leaderboard' && (
        <Leaderboard
          leaderboard={leaderboard}
          myRank={myRank}
          myDisplayName={myDisplayName}
          visibleOnGlobal={visibleOnGlobal}
          onToggleVisible={onToggleVisible}
          loading={leaderboardLoading}
        />
      )}

      {subView === 'friends' && (
        <Friends
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
  )
}
