import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { profileApi } from '../services/api'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/i

const DEFAULT_RULES = {
  digest: true,
  overdueAlerts: true,
  autoFollowup: true,
  compactDensity: false,
}

const RULE_ROWS = [
  {
    key: 'digest',
    title: 'Daily Executive Digest — Prototype',
    desc: 'Planned operational rule • Morning pipeline summary notification',
  },
  {
    key: 'overdueAlerts',
    title: 'Overdue Task Alerts',
    desc: 'Send a high-priority notification when a delivery or invoice due date passes',
  },
  {
    key: 'autoFollowup',
    title: 'Auto-create Follow-up Tasks — Prototype',
    desc: 'Automatically generate an outreach task when a new client inquiry is registered',
  },
  {
    key: 'compactDensity',
    title: 'Compact Table Density',
    desc: 'Display condensed row spacing on high-resolution widescreen monitors',
  },
]

/**
 * System Settings & User Profile.
 * Supports both Owner and Team Member roles.
 * Owners can edit organization settings; Team Members can only edit their own profile.
 * Both roles can change their password with current-password verification.
 */
export default function Settings() {
  const { user, owner } = useAuth()
  const currentUser = user || owner
  const isOwner = currentUser?.role === 'owner'
  const isTeamMember = currentUser?.role === 'team_member'

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    companyName: '',
    city: '',
    gstin: '',
    currency: 'INR',
    department: '',
  })
  const [savedForm, setSavedForm] = useState({})
  const [rules, setRules] = useState(DEFAULT_RULES)
  const [savedRules, setSavedRules] = useState(DEFAULT_RULES)
  const [fieldErrors, setFieldErrors] = useState({})
  const [banner, setBanner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [changingPassword, setChangingPassword] = useState(false)
  const bannerTimer = useRef(null)

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true)
      try {
        const res = await profileApi.getProfile()
        if (res.success && res.data) {
          const data = res.data
          setForm({
            fullName: data.name || '',
            email: data.email || '',
            companyName: data.company || '',
            city: '',
            gstin: '',
            currency: 'INR',
            department: data.department || '',
          })
          setSavedForm({
            fullName: data.name || '',
            email: data.email || '',
            companyName: data.company || '',
            city: '',
            gstin: '',
            currency: 'INR',
            department: data.department || '',
          })
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  useEffect(() => () => window.clearTimeout(bannerTimer.current), [])

  const dirty =
    JSON.stringify(form) !== JSON.stringify(savedForm) ||
    JSON.stringify(rules) !== JSON.stringify(savedRules)

  const showBanner = (type, message) => {
    window.clearTimeout(bannerTimer.current)
    setBanner({ type, message })
    bannerTimer.current = window.setTimeout(() => setBanner(null), 4500)
  }

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const setPasswordField = (key, value) => {
    setPasswordForm((prev) => ({ ...prev, [key]: value }))
    if (passwordErrors[key]) setPasswordErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const errors = {}
    if (!form.fullName.trim()) {
      errors.fullName = 'Full name is required.'
    } else if (form.fullName.trim().length < 2) {
      errors.fullName = 'Please enter your full name (at least 2 characters).'
    }

    if (!form.email.trim()) {
      errors.email = 'Email address is required.'
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address.'
    }

    if (isOwner) {
      if (!form.companyName.trim()) {
        errors.companyName = 'Company workspace name is required.'
      }

      if (form.gstin.trim() && !GSTIN_PATTERN.test(form.gstin.trim())) {
        errors.gstin = 'GSTIN must be 15 characters, e.g. 24AAHFS1234A1Z5.'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validatePassword = () => {
    const errors = {}
    if (!passwordForm.current_password) {
      errors.current_password = 'Current password is required.'
    }
    if (!passwordForm.new_password) {
      errors.new_password = 'New password is required.'
    } else if (passwordForm.new_password.length < 8) {
      errors.new_password = 'New password must be at least 8 characters.'
    }
    if (!passwordForm.confirm_password) {
      errors.confirm_password = 'Please confirm your new password.'
    } else if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = 'New password and confirmation do not match.'
    }
    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (!dirty) {
      showBanner('ok', 'No changes to save — your preferences already match the form.')
      return
    }

    if (!validate()) {
      showBanner('fail', 'Please correct the highlighted fields before saving.')
      return
    }

    try {
      const payload = {
        name: form.fullName.trim(),
        email: form.email.trim(),
      }
      if (isTeamMember || form.department) {
        payload.department = form.department.trim()
      }
      if (isOwner) {
        // Owner can also update company name if we add that to the API
        // For now, company is managed separately
      }

      const res = await profileApi.updateProfile(payload)
      if (res.success) {
        setSavedForm({ ...form })
        setFieldErrors({})
        showBanner('ok', 'Profile updated successfully.')
      } else {
        showBanner('fail', res.error || 'Failed to update profile.')
      }
    } catch (err) {
      showBanner('fail', err.message || 'Failed to update profile.')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (!validatePassword()) {
      return
    }

    setChangingPassword(true)
    try {
      const res = await profileApi.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      })
      if (res.success) {
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
        setPasswordErrors({})
        showBanner('ok', 'Password changed successfully. You will be logged out shortly.')
        // Force re-authentication on next request
        setTimeout(() => window.location.href = '/login', 2000)
      } else {
        setPasswordErrors({ current_password: res.error || 'Failed to change password.' })
      }
    } catch (err) {
      setPasswordErrors({ current_password: err.message || 'Failed to change password.' })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleReset = () => {
    setForm({ ...savedForm })
    setRules({ ...savedRules })
    setFieldErrors({})
    setBanner(null)
  }

  if (loading) {
    return (
      <div className="page-view" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{
          width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: 'var(--ink)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div className="page-view">
      <div className="settings-grid">
        {/* Left: Profile & Organization */}
        <div className="panel">
          <h3 className="panel-title" style={{ marginBottom: '16px' }}>
            {isOwner ? 'Organization & Profile Setup' : 'My Profile'}
          </h3>

          {banner && (
            <div className={`alert-strip ${banner.type === 'ok' ? 'ok' : 'fail'}`} role="alert">
              {banner.type === 'ok' ? '✓ ' : '! '}
              {banner.message}
            </div>
          )}

          <form onSubmit={handleSave} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-name">
                Full Name <span className="req">*</span>
              </label>
              <input
                id="settings-name"
                className="form-input-field"
                type="text"
                value={form.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
                aria-invalid={Boolean(fieldErrors.fullName)}
              />
              {fieldErrors.fullName && <span className="field-error">{fieldErrors.fullName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-email">
                Email Address <span className="req">*</span>
              </label>
              <input
                id="settings-email"
                className="form-input-field"
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>

            {isOwner && (
              <div className="form-group">
                <label className="form-label" htmlFor="settings-company">
                  Company Workspace Name <span className="req">*</span>
                </label>
                <input
                  id="settings-company"
                  className="form-input-field"
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setField('companyName', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.companyName)}
                />
                {fieldErrors.companyName && (
                  <span className="field-error">{fieldErrors.companyName}</span>
                )}
              </div>
            )}

            <div className="form-2col">
              {isOwner && (
                <div className="form-group">
                  <label className="form-label" htmlFor="settings-city">City / Region</label>
                  <input
                    id="settings-city"
                    className="form-input-field"
                    type="text"
                    value={form.city}
                    onChange={(e) => setField('city', e.target.value)}
                  />
                </div>
              )}
              {isOwner && (
                <div className="form-group">
                  <label className="form-label" htmlFor="settings-gstin">GSTIN Identification</label>
                  <input
                    id="settings-gstin"
                    className="form-input-field"
                    type="text"
                    value={form.gstin}
                    onChange={(e) => setField('gstin', e.target.value.toUpperCase())}
                    aria-invalid={Boolean(fieldErrors.gstin)}
                  />
                  {fieldErrors.gstin && <span className="field-error">{fieldErrors.gstin}</span>}
                </div>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="settings-department">
                  Department
                </label>
                <input
                  id="settings-department"
                  className="form-input-field"
                  type="text"
                  value={form.department}
                  onChange={(e) => setField('department', e.target.value)}
                />
              </div>
            </div>

            {isOwner && (
              <div className="form-group">
                <label className="form-label" htmlFor="settings-currency">
                  Base Operating Currency
                </label>
                <select
                  id="settings-currency"
                  className="form-input-field select-filter"
                  value={form.currency}
                  onChange={(e) => setField('currency', e.target.value)}
                >
                  <option value="INR">INR (₹) — Indian Rupee</option>
                  <option value="USD" disabled>
                    USD ($) — disabled: multi-currency support not implemented
                  </option>
                  <option value="EUR" disabled>
                    EUR (€) — disabled: multi-currency support not implemented
                  </option>
                </select>
                <p className="field-note">
                  USD and EUR are disabled because multi-currency support has not been implemented
                  yet — not because this account is Indian. Every figure in the workspace is
                  currently rendered in INR.
                </p>
              </div>
            )}

            <div className="settings-actions">
              <button type="submit" className="btn btn-primary">
                Save Profile
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleReset}
                disabled={!dirty}
              >
                Discard Changes
              </button>
              <span className={`settings-dirty${dirty ? ' active' : ''}`} role="status">
                {dirty ? 'Unsaved changes' : 'All changes saved'}
              </span>
            </div>
          </form>

          {/* Security Section */}
          <div style={{ marginTop: '24px', padding: '14px', background: 'var(--paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-light)', fontSize: '0.8rem', color: 'var(--slate)', lineHeight: 1.5 }}>
            <strong>Security Architecture:</strong> Account passwords are stored as bcrypt hashes in the MySQL <code>users</code> table. The React frontend never stores, processes, or exposes plaintext passwords or hash strings.
          </div>
        </div>

        {/* Right: Password Change & Automation Rules */}
        <div className="panel">
          <h3 className="panel-title" style={{ marginBottom: '16px' }}>
            Change Password
          </h3>

          <form onSubmit={handleChangePassword} noValidate style={{ marginBottom: '24px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="current-password">
                Current Password <span className="req">*</span>
              </label>
              <input
                id="current-password"
                className="form-input-field"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordField('current_password', e.target.value)}
                aria-invalid={Boolean(passwordErrors.current_password)}
                autoComplete="current-password"
              />
              {passwordErrors.current_password && <span className="field-error">{passwordErrors.current_password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-password">
                New Password <span className="req">*</span>
              </label>
              <input
                id="new-password"
                className="form-input-field"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordField('new_password', e.target.value)}
                aria-invalid={Boolean(passwordErrors.new_password)}
                autoComplete="new-password"
                minLength="8"
              />
              {passwordErrors.new_password && <span className="field-error">{passwordErrors.new_password}</span>}
              <p className="field-note" style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--slate)' }}>
                Minimum 8 characters
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">
                Confirm New Password <span className="req">*</span>
              </label>
              <input
                id="confirm-password"
                className="form-input-field"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordField('confirm_password', e.target.value)}
                aria-invalid={Boolean(passwordErrors.confirm_password)}
                autoComplete="new-password"
              />
              {passwordErrors.confirm_password && <span className="field-error">{passwordErrors.confirm_password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              style={{ marginTop: '8px' }}
              disabled={changingPassword}
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </form>

          <div style={{ borderTop: '1px solid var(--line-light)', paddingTop: '24px' }}>
            <h3 className="panel-title" style={{ marginBottom: '16px' }}>
              {isOwner ? 'Automation & Notification Rules' : 'Notification Preferences'}
            </h3>

            {isOwner && RULE_ROWS.map((row) => (
              <div className="toggle-row" key={row.key}>
                <div className="toggle-text">
                  <h4>{row.title}</h4>
                  <p>{row.desc}</p>
                </div>
                <div className="toggle-control">
                  <span className={`toggle-state${rules[row.key] ? ' on' : ''}`} aria-hidden="true">
                    {rules[row.key] ? 'On' : 'Off'}
                  </span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={rules[row.key]}
                      onChange={(e) =>
                        setRules((prev) => ({ ...prev, [row.key]: e.target.checked }))
                      }
                      aria-label={`Toggle ${row.title}`}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            ))}

            {!isOwner && (
              <div style={{ fontSize: '0.85rem', color: 'var(--slate)', lineHeight: 1.6 }}>
                <p><strong>Notification Preferences:</strong> Team Members receive notifications for task assignments, status changes, and order events relevant to their work.</p>
                <p>Notification settings are managed by your Business Owner.</p>
              </div>
            )}

            <div style={{ marginTop: '20px', padding: '14px', background: 'var(--paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-light)', fontSize: '0.8rem', color: 'var(--slate)', lineHeight: 1.5 }}>
              <strong>Persistence:</strong> {isOwner ? 'automation rules are session-local demo settings and are not written to the database in this prototype.' : 'your profile changes are saved to the MySQL database.'}
              <br />
              <strong>Active Session:</strong> signed in as <b>{currentUser?.name || 'User'}</b> (
              {currentUser?.email || '—'}). Session authenticated via secure HTTP cookie.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}