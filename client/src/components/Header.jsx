import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import GlobalSearch from './GlobalSearch'
import './Header.css'

const PAGE_TITLES = {
  '/dashboard':     'Dashboard',
  '/customers':     'Customers Directory',
  '/tasks':         'Task Kanban Board',
  '/orders':        'Orders & Fulfillment',
  '/team':          'Team Workspace',
  '/sales':         'Sales & Revenue',
  '/analytics':     'Analytics & BI',
  '/notifications': 'Notifications',
  '/settings':      'System Settings',
}

/**
 * Top bar — matches frontend/index.html topbar.
 * Displays page title, working global search, a notification bell with an
 * unread-count dropdown, and the owner profile with working logout.
 */
export default function Header({ onToggleSidebar }) {
  const { user, owner, logout } = useAuth()
  const currentUser = user || owner
  const { notifications, unreadCount, markAllAsRead, markAsRead, refreshNotifications } = useNotifications()
  const location = useLocation()
  const navigate = useNavigate()

  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  const title = PAGE_TITLES[location.pathname] || 'OmniOS'

  // Derive initials from user name
  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?'


  const recent = notifications.slice(0, 4)

  // Dismiss the dropdown on outside click / Escape
  useEffect(() => {
    const onPointerDown = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setNotifOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  // Close when the user navigates away
  const closeNotif = () => setNotifOpen(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Open navigation sidebar"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="topbar-right">
        {/* Global quick-find across sections and demo records */}
        <GlobalSearch />

        {/* Notifications bell — opens an unread-aware dropdown */}
        <div className="notif-menu" ref={notifRef}>
          <button
            className="icon-btn"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : 'Notifications'
            }
            aria-haspopup="true"
            aria-expanded={notifOpen}
            title="Notifications"
            type="button"
            onClick={() => {
              setNotifOpen((open) => {
                if (!open && refreshNotifications) {
                  refreshNotifications()
                }
                return !open
              })
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="dot-badge count">{unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-panel" role="dialog" aria-label="Recent notifications">
              <div className="notif-panel-head">
                <strong>Notifications</strong>
                {unreadCount > 0 ? (
                  <span className="tag wait">{unreadCount} unread</span>
                ) : (
                  <span className="tag ok">All caught up</span>
                )}
              </div>

              {recent.length === 0 ? (
                <p className="notif-panel-empty">You have no notifications.</p>
              ) : (
                <ul className="notif-panel-list">
                  {recent.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        className={`notif-panel-item${n.unread ? ' unread' : ''}`}
                        onClick={() => markAsRead(n.id)}
                        title={n.unread ? 'Click to mark as read' : 'Already read'}
                      >
                        <span className="notif-panel-icon" aria-hidden="true">{n.icon}</span>
                        <span className="notif-panel-text">
                          <span className="notif-panel-title">{n.title}</span>
                          <span className="notif-panel-desc">{n.desc || n.message}</span>
                          <span className="notif-panel-time">{n.time}</span>
                        </span>
                        {n.unread && <span className="notif-panel-dot" aria-label="Unread" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="notif-panel-foot">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  Mark all as read
                </button>
                <Link to="/notifications" className="btn btn-primary btn-sm" onClick={closeNotif}>
                  View all
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User profile + logout */}
        <div className="user-profile" role="group" aria-label="Signed-in user">
          <div className="user-avatar" aria-hidden="true">{initials}</div>
          <div className="user-meta">
            <span className="user-name">{currentUser?.name ?? 'User'}</span>
            <span className="user-role">{currentUser?.role === 'team_member' ? 'Team Member' : 'Owner'}</span>
          </div>
          <button
            className="logout-btn"
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
