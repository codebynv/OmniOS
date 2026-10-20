import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { notificationsApi } from '../services/api'
import { useAuth } from './AuthContext'

const NotificationsContext = createContext(null)

/**
 * Shared, database-driven notification state.
 * Mounted above <Routes> so the topbar bell badge and the full
 * Notifications page always agree on the unread count. Data is scoped by the
 * backend to the authenticated user's business and recipient id.
 */
export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requestRef = useRef(0)
  const notificationsRef = useRef([])
  const sessionRef = useRef(userId)

  const commitNotifications = useCallback((rows, serverUnreadCount) => {
    notificationsRef.current = rows
    setNotifications(rows)
    setUnreadCount(
      typeof serverUnreadCount === 'number'
        ? serverUnreadCount
        : rows.filter((n) => n.unread).length
    )
  }, [])

  const refreshNotifications = useCallback(async () => {
    if (!userId) {
      return
    }
    const requestId = ++requestRef.current
    setLoading(true)
    try {
      const res = await notificationsApi.getAll()
      if (requestId !== requestRef.current || sessionRef.current !== userId) {
        return
      }
      const rows = res && Array.isArray(res.data) ? res.data : []
      commitNotifications(rows, res ? res.unread_count : undefined)
      setError('')
    } catch (err) {
      if (requestId !== requestRef.current || sessionRef.current !== userId) {
        return
      }
      setError(err?.message || 'Unable to load notifications.')
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false)
      }
    }
  }, [userId, commitNotifications])

  useEffect(() => {
    sessionRef.current = userId
    requestRef.current += 1
    commitNotifications([], 0)
    setError('')
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    refreshNotifications()
  }, [userId, refreshNotifications, commitNotifications])

  const markAsRead = useCallback(
    async (id) => {
      if (!userId || id === undefined || id === null) {
        return
      }
      try {
        const res = await notificationsApi.markAsRead(id)
        if (sessionRef.current !== userId) {
          return
        }
        const updated = res && res.data ? res.data : null
        const rows = notificationsRef.current.map((n) =>
          n.id === id ? { ...n, ...(updated || {}), unread: false } : n
        )
        commitNotifications(rows, res ? res.unread_count : undefined)
        setError('')
      } catch (err) {
        if (sessionRef.current !== userId) {
          return
        }
        setError(err?.message || 'Unable to update notification.')
      }
    },
    [userId, commitNotifications]
  )

  const markAllAsRead = useCallback(async () => {
    if (!userId) {
      return
    }
    try {
      const res = await notificationsApi.markAllAsRead()
      if (sessionRef.current !== userId) {
        return
      }
      const rows = notificationsRef.current.map((n) => ({ ...n, unread: false }))
      commitNotifications(rows, res ? res.unread_count : 0)
      setError('')
    } catch (err) {
      if (sessionRef.current !== userId) {
        return
      }
      setError(err?.message || 'Unable to update notifications.')
    }
  }, [userId, commitNotifications])

  const toggleReadStatus = useCallback(
    async (id) => {
      if (!userId || id === undefined || id === null) {
        return
      }
      try {
        const res = await notificationsApi.toggleRead(id)
        if (sessionRef.current !== userId) {
          return
        }
        const updated = res && res.data ? res.data : null
        const rows = notificationsRef.current.map((n) =>
          n.id === id
            ? { ...n, ...(updated || {}), unread: updated ? !!updated.unread : !n.unread }
            : n
        )
        commitNotifications(rows, res ? res.unread_count : undefined)
        setError('')
      } catch (err) {
        if (sessionRef.current !== userId) {
          return
        }
        setError(err?.message || 'Unable to update notification.')
      }
    },
    [userId, commitNotifications]
  )

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      toggleReadStatus,
    }),
    [notifications, unreadCount, loading, error, refreshNotifications, markAsRead, markAllAsRead, toggleReadStatus]
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}
