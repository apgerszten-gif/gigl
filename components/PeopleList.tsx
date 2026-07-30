import { DEFAULT_THEME as T } from '@/lib/theme'
import { Avatar } from '@/components/Avatar'
import { FollowButton } from '@/components/FollowButton'

interface Person {
  id:           string
  username:     string
  display_name: string
}

// Shared shell for /u/[username]/followers and /following - same
// back-button header as the public profile page, same list-row pattern
// used for search results in TagFriendsModal.
export function PeopleListPage({
  title, backHref, people, emptyText,
}: {
  title:     string
  backHref:  string
  people:    Person[]
  emptyText: string
}) {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.sans, color: '#4A3528', maxWidth: 430, margin: '0 auto' }}>
      <div style={{
        padding: '18px 24px', position: 'sticky', top: 0, zIndex: 10,
        background: T.bgRgba,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(74,53,40,0.12)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <a href={backHref} style={{ display: 'flex', textDecoration: 'none' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </a>
        <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>{title}</div>
      </div>

      <div style={{ padding: '16px 24px 40px' }}>
        {people.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 13, color: T.faint }}>{emptyText}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {people.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: T.card, border: T.cardBorder, borderRadius: 5, padding: '10px 12px',
              }}>
                <a href={`/u/${p.username}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, textDecoration: 'none',
                }}>
                  <Avatar name={p.display_name || p.username} size={38} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: T.serif, fontSize: 14, fontWeight: 700, color: '#4A3528',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{p.display_name}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>@{p.username}</div>
                  </div>
                </a>
                <FollowButton targetUserId={p.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
