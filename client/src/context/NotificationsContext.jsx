import { createContext, useContext, useMemo, useState } from 'react'
import { INITIAL_NOTIFICATIONS } from '../data/demoData'

const NotificationsContext = createContext(null)

/**
 * Shared, session-local notification state.
 * Mounted above <Routes> so the topbar bell badge and the full
 * Notifications page always agree on the unread count.
 * Demo-only: state lives in memory and resets on page reload.
 */
export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  )

  const markAsRead = (id) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    )

  const markAllAsRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))

  const toggleReadStatus = (id) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
    )

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    toggleReadStatus,
  }

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}
