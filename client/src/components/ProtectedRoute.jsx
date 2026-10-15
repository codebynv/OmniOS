import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Route protection wrapper.
 * Blocks unauthenticated direct URL access and redirects visitors to /login.
 */
export default function ProtectedRoute({ children }) {
  const { owner, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#475569',
        fontFamily: 'var(--font-family)',
        gap: '12px'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#d97706',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span>Verifying owner session...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!owner) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
