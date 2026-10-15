import { useState } from 'react'
import { useNotifications } from '../context/NotificationsContext'

/**
 * System & Pipeline Notifications Workspace.
 * Matches frontend/index.html notifications view.
 * Read/unread state is shared with the topbar bell (NotificationsContext) and
 * is session-local demo data only.
 */
export default function Notifications() {
  const { notifications, unreadCount, markAllAsRead, toggleReadStatus } = useNotifications()
  const [filter, setFilter] = useState('all')

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return n.unread
    return true
  })

  return (
    <div className="page-view">
      {/* Header Panel */}
      <div className="panel" style={{ padding: '18px 24px', marginBottom: '20px' }}>
        <div className="panel-header" style={{ marginBottom: 0 }}>
          <div>
            <h3 className="panel-title">System &amp; Pipeline Notifications</h3>
            <p className="panel-subtitle">
              Automated operational triggers across client pipeline, delivery tasks, and invoice collections
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {unreadCount > 0 && (
              <span className="tag wait">{unreadCount} Unread Alerts</span>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark All as Read
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="panel" style={{ padding: '12px 20px', marginBottom: '18px' }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div className="filter-group">
            <button
              type="button"
              className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setFilter('all')}
            >
              All Notifications ({notifications.length})
            </button>
            <button
              type="button"
              className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setFilter('unread')}
            >
              Unread Only ({unreadCount})
            </button>
          </div>

          <span className="filter-count">Click any notification to toggle read/unread — the topbar bell badge stays in sync</span>
        </div>
      </div>

      {/* Notification List */}
      <div className="notif-list">
        {filteredNotifs.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--slate)' }}>
            No notifications match your selected filter.
          </div>
        ) : (
          filteredNotifs.map((n) => (
            <div
              key={n.id}
              className={`notif-item${n.unread ? ' unread' : ''}`}
              onClick={() => toggleReadStatus(n.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleReadStatus(n.id)
                }
              }}
              title={n.unread ? 'Click to mark as read' : 'Click to mark as unread'}
            >
              <div className="notif-icon">{n.icon}</div>
              <div className="notif-body">
                <div className="notif-title">
                  <span>{n.title}</span>
                  {n.unread && (
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: 'var(--signal)',
                        display: 'inline-block',
                      }}
                      aria-label="Unread alert"
                    />
                  )}
                </div>
                <p className="notif-desc">{n.desc}</p>
                <div className="notif-time">{n.time}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
