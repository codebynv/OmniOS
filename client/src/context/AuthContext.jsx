import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [owner, setOwner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Verify active session on initial page load / refresh
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authApi.checkSession()
      if (data?.authenticated && data?.owner) {
        setOwner(data.owner)
        setError(null)
      } else {
        setOwner(null)
      }
    } catch {
      // 401 unauthenticated is expected if not logged in
      setOwner(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email, password) => {
    setError(null)
    try {
      const data = await authApi.login({ email, password })
      if (data?.success && data?.owner) {
        setOwner(data.owner)
        return { success: true, owner: data.owner }
      }
      throw new Error(data?.error || 'Authentication failed.')
    } catch (err) {
      const msg = err.message || 'Invalid email or password.'
      setError(msg)
      return { success: false, error: msg }
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore network errors on logout
    } finally {
      setOwner(null)
      setError(null)
    }
  }

  return (
    <AuthContext.Provider value={{ owner, loading, error, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
