import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { COMPANY } from '../data/demoData'

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

const buildForm = (owner) => ({
  fullName: owner?.name || 'Nirav Vala',
  email: owner?.email || 'nirav.vala@omnios.local',
  companyName: COMPANY.name,
  city: COMPANY.city,
  gstin: COMPANY.gstin,
  currency: 'INR',
})

/**
 * System Settings & Organization Preferences.
 * Matches frontend/index.html settings layout.
 * Form inputs are validated before saving, and the save confirmation states
 * honestly that this prototype keeps preferences in session memory only.
 */
export default function Settings() {
  const { owner } = useAuth()

  const [form, setForm] = useState(() => buildForm(owner))
  const [savedForm, setSavedForm] = useState(() => buildForm(owner))
  const [rules, setRules] = useState(DEFAULT_RULES)
  const [savedRules, setSavedRules] = useState(DEFAULT_RULES)
  const [fieldErrors, setFieldErrors] = useState({})
  const [banner, setBanner] = useState(null)
  const bannerTimer = useRef(null)

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

  const validate = () => {
    const errors = {}
    if (!form.fullName.trim()) {
      errors.fullName = 'Owner full name is required.'
    } else if (form.fullName.trim().length < 3) {
      errors.fullName = 'Please enter the full name (at least 3 characters).'
    }

    if (!form.email.trim()) {
      errors.email = 'Owner account email is required.'
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address.'
    }

    if (!form.companyName.trim()) {
      errors.companyName = 'Company workspace name is required.'
    }

    if (form.gstin.trim() && !GSTIN_PATTERN.test(form.gstin.trim())) {
      errors.gstin = 'GSTIN must be 15 characters, e.g. 24AAHFS1234A1Z5.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = (e) => {
    e.preventDefault()

    if (!dirty) {
      showBanner('ok', 'No changes to save — your preferences already match the form.')
      return
    }

    if (!validate()) {
      showBanner('fail', 'Please correct the highlighted fields before saving.')
      return
    }

    setSavedForm({ ...form })
    setSavedRules({ ...rules })
    setFieldErrors({})
    showBanner(
      'ok',
      'Preferences applied for this browsing session. This prototype build stores settings in memory only — nothing was written to the MySQL database.'
    )
  }

  const handleReset = () => {
    setForm({ ...savedForm })
    setRules({ ...savedRules })
    setFieldErrors({})
    setBanner(null)
  }

  return (
    <div className="page-view">
      <div className="settings-grid">
        {/* Left: Organization & Profile */}
        <div className="panel">
          <h3 className="panel-title" style={{ marginBottom: '16px' }}>
            Organization &amp; Profile Setup
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
                Signed-in Owner Full Name <span className="req">*</span>
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
                Owner Account Email <span className="req">*</span>
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

            <div className="form-2col">
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
            </div>

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

            <div className="settings-actions">
              <button type="submit" className="btn btn-primary">
                Save Preferences
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

          <div style={{ marginTop: '24px', padding: '14px', background: 'var(--paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-light)', fontSize: '0.8rem', color: 'var(--slate)', lineHeight: 1.5 }}>
            <strong>Security Architecture:</strong> Account passwords are stored as bcrypt hashes in the MySQL <code>owners</code> table. The React frontend never stores, processes, or exposes plaintext passwords or hash strings.
          </div>
        </div>

        {/* Right: Automation & Notification Toggles */}
        <div className="panel">
          <h3 className="panel-title" style={{ marginBottom: '16px' }}>
            Automation &amp; Notification Rules
          </h3>

          {RULE_ROWS.map((row) => (
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

          <div style={{ marginTop: '20px', padding: '14px', background: 'var(--paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-light)', fontSize: '0.8rem', color: 'var(--slate)', lineHeight: 1.5 }}>
            <strong>Persistence:</strong> these automation rules are session-local demo settings and
            are not written to the database in this prototype.
            <br />
            <strong>Active Owner Session:</strong> signed in as <b>{owner?.name || 'Owner'}</b> (
            {owner?.email || 'nirav.vala@omnios.local'}). Session authenticated via secure HTTP cookie.
          </div>
        </div>
      </div>
    </div>
  )
}
