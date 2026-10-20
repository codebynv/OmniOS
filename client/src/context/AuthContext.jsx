import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Verify active session on initial page load / refresh
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authApi.checkSession()
      const currentUser = data?.authenticated ? (data?.user || data?.owner || null) : null
      if (currentUser) {
        setUser(currentUser)
        setError(null)
      } else {
        setUser(null)
      }
    } catch {
      // 401 unauthenticated is expected if not logged in
      setUser(null)
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
      const currentUser = data?.success ? (data?.user || data?.owner || null) : null
      if (currentUser) {
        setUser(currentUser)
        return { success: true, user: currentUser, owner: currentUser }
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
      setUser(null)
      setError(null)
    }
  }

  const isOwner = user?.role === 'owner'
  const isTeamMember = user?.role === 'team_member'
  // Backwards-compatible alias for existing components expecting owner
  const owner = user

  return (
    <AuthContext.Provider
      value={{
        user,
        owner,
        isOwner,
        isTeamMember,
        loading,
        error,
        login,
        logout,
        checkAuth,
      }}
    >
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
