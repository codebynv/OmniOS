import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

/**
 * Login Component (Owner & Team Member modes).
 * A segmented switch selects the intended role for the UI copy; both modes
 * submit to the same real session-based authentication API.
 * Demonstrates:
 * - Unit I-D: Controlled form components and validation
 * - Unit I-F: User event handling (submit, click, input changes)
 * - Unit IV-B: useState and useEffect hooks
 * - Unit IV-G: Forms and controlled components in React
 * - Unit IV-H: React Router navigation and redirection
 */
export default function Login() {
  const { user, owner, login, loading: authLoading } = useAuth()
  const currentUser = user || owner
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [mode, setMode] = useState('owner')

  // Authenticated users land on dashboard (owner) or tasks (team_member)
  useEffect(() => {
    if (currentUser && !authLoading) {
      if (currentUser.role === 'team_member') {
        navigate('/tasks', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [currentUser, authLoading, navigate])

  const validateForm = () => {
    const errors = {}
    if (!email.trim()) {
      errors.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.'
    }

    if (!password) {
      errors.password = 'Password is required.'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    const result = await login(email.trim(), password)
    setSubmitting(false)

    if (result.success) {
      const role = result.user?.role || result.owner?.role
      if (role === 'team_member') {
        navigate('/tasks', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } else {
      setErrorMessage(result.error || 'Invalid email or password. Please verify your credentials.')
    }
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setErrorMessage('')
    setFieldErrors({})
  }

  const fillDemoAccount = (demoEmail) => {
    setEmail(demoEmail)
    setPassword('')
    setErrorMessage('')
    setFieldErrors({})
  }

  return (
    <div className="login-page">
      <header className="login-topbar">
        <Link to="/" className="login-brand" style={{ textDecoration: 'none' }}>
          <div className="mark">O</div>
          <span>OmniOS</span>
        </Link>
        <Link to="/" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
          ← Back to Explainer
        </Link>
      </header>

      <main className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h2>{mode === 'owner' ? 'Company Owner Login' : 'Team Member Login'}</h2>
            <p>
              {mode === 'owner'
                ? 'Access your OmniOS enterprise operations workspace'
                : 'Access your assigned tasks and team workspace'}
            </p>
          </div>

          {/* Segmented switch — Owner vs Team Member. Both use the same auth API. */}
          <div className="login-mode-switch" role="tablist" aria-label="Select login type">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'owner'}
              className={`login-mode-tab${mode === 'owner' ? ' active' : ''}`}
              onClick={() => switchMode('owner')}
            >
              Owner Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'team_member'}
              className={`login-mode-tab${mode === 'team_member' ? ' active' : ''}`}
              onClick={() => switchMode('team_member')}
            >
              Team Member Login
            </button>
          </div>

          {errorMessage && (
            <div className="login-error-banner" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email">{mode === 'owner' ? 'Owner Email Address' : 'Team Member Email Address'}</label>
              <div className="form-input-wrapper">
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder={mode === 'owner' ? 'e.g. nirav.vala@omnios.local' : 'Enter your team email address'}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' })
                  }}
                  autoComplete="email"
                  disabled={submitting}
                  required
                />
              </div>
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <div className="form-input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder={mode === 'owner' ? 'Enter your owner password' : 'Enter your team member password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' })
                  }}
                  autoComplete="current-password"
                  disabled={submitting}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px', padding: '12px' }}
              disabled={submitting}
            >
              {submitting ? 'Authenticating...' : (mode === 'owner' ? 'Sign In as Owner' : 'Sign In as Team Member')}
            </button>
          </form>

          {/* Quick-Select Demo Owner Accounts for Viva / College Presentation */}
          {mode === 'owner' ? (
          <div className="demo-accounts-card">
            <div className="demo-title">
              <span>Presentation Demo Accounts</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>Click to Fill Email</span>
            </div>
            <div className="demo-btn-group">
              <button
                type="button"
                className="demo-pill-btn"
                onClick={() => fillDemoAccount('nirav.vala@omnios.local')}
              >
                <div>
                  <strong>Nirav Vala</strong>
                  <span>Sharma Office Supplies</span>
                </div>
                <code style={{ fontSize: '0.72rem', background: '#fff', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                  nirav.vala@omnios.local
                </code>
              </button>

              <button
                type="button"
                className="demo-pill-btn"
                onClick={() => fillDemoAccount('rajesh@sharmatraders.in')}
              >
                <div>
                  <strong>Rajesh Sharma</strong>
                  <span>Sharma Office Supplies</span>
                </div>
                <code style={{ fontSize: '0.72rem', background: '#fff', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                  rajesh@sharmatraders.in
                </code>
              </button>
            </div>
          </div>
          ) : (
          <>
            <div className="demo-accounts-card">
              <div className="demo-title">
                <span>Team Member Demo Accounts</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>Click to Fill Email</span>
              </div>
              <div className="demo-btn-group">
                <button
                  type="button"
                  className="demo-pill-btn"
                  onClick={() => fillDemoAccount('harsh.patel@omnios.local')}
                >
                  <div>
                    <strong>Harsh Patel</strong>
                    <span>Billing Department</span>
                  </div>
                  <code style={{ fontSize: '0.72rem', background: '#fff', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    harsh.patel@omnios.local
                  </code>
                </button>

                <button
                  type="button"
                  className="demo-pill-btn"
                  onClick={() => fillDemoAccount('yash.shah@omnios.local')}
                >
                  <div>
                    <strong>Yash Shah</strong>
                    <span>Sales Department</span>
                  </div>
                  <code style={{ fontSize: '0.72rem', background: '#fff', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    yash.shah@omnios.local
                  </code>
                </button>
              </div>
            </div>
            <p className="login-mode-hint">
              Sign in with the email and password your Business Owner created for you.
            </p>
          </>
          )}
        </div>
      </main>
    </div>
  )
}
