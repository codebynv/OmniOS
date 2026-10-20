import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { teamApi } from '../services/api'
import './Team.css'

const EMPTY_FORM = {
  name: '',
  email: '',
  department: 'Operations',
  password: '',
}

export default function Team() {
  const { user, owner } = useAuth()
  const currentUser = user || owner
  const isOwner = currentUser?.role === 'owner'

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Filter state
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal state
  const [modalMode, setModalMode] = useState(null) // 'create' | 'edit' | 'deactivate'
  const [selectedMember, setSelectedMember] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  // Fetch real team members from backend
  const fetchTeam = useCallback(async () => {
    setLoading(true)
    setApiError('')
    try {
      const res = await teamApi.getAll()
      if (res?.success) {
        setMembers(res.data || [])
      } else {
        setApiError(res?.error || 'Failed to load team members.')
      }
    } catch (err) {
      setApiError(err.message || 'Failed to connect to team management API.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  // Dismiss success message after 4s
  useEffect(() => {
    if (!successMessage) return undefined
    const timer = setTimeout(() => setSuccessMessage(''), 4000)
    return () => clearTimeout(timer)
  }, [successMessage])

  // Dynamic filter options derived from real database records
  const departments = useMemo(() => {
    const set = new Set()
    members.forEach((m) => {
      if (m.department) set.add(m.department)
    })
    return Array.from(set).sort()
  }, [members])

  const query = search.trim().toLowerCase()

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        !query ||
        m.name.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query)
      const matchesDept = deptFilter === 'all' || m.department === deptFilter
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter
      return matchesSearch && matchesDept && matchesStatus
    })
  }, [members, query, deptFilter, statusFilter])

  const hasFilters = query !== '' || deptFilter !== 'all' || statusFilter !== 'all'

  const resetFilters = () => {
    setSearch('')
    setDeptFilter('all')
    setStatusFilter('all')
  }

  const activeCount = members.filter((m) => m.status === 'active').length

  // Helper to compute avatar initials
  const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase() || 'TM'
  }

  // Modal openers
  const openCreateModal = () => {
    if (!isOwner) return
    setFormData(EMPTY_FORM)
    setFormErrors({})
    setModalError('')
    setModalMode('create')
  }

  const openEditModal = (member) => {
    if (!isOwner) return
    setSelectedMember(member)
    setFormData({
      name: member.name || '',
      email: member.email || '',
      department: member.department || 'Operations',
      password: '',
    })
    setFormErrors({})
    setModalError('')
    setModalMode('edit')
  }

  const openDeactivateModal = (member) => {
    if (!isOwner) return
    setSelectedMember(member)
    setModalError('')
    setModalMode('deactivate')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedMember(null)
    setFormData(EMPTY_FORM)
    setFormErrors({})
    setModalError('')
    setSubmitting(false)
  }

  // Form validation
  const validateForm = () => {
    const errors = {}
    if (!formData.name.trim()) {
      errors.name = 'Full name is required.'
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.'
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Enter a valid email address.'
    }

    if (modalMode === 'create') {
      if (!formData.password) {
        errors.password = 'Initial password is required.'
      } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters.'
      }
    } else if (modalMode === 'edit' && formData.password && formData.password.length < 8) {
      errors.password = 'New password must be at least 8 characters.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Submit create or edit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    setModalError('')

    try {
      if (modalMode === 'create') {
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          department: formData.department.trim(),
          password: formData.password,
        }
        const res = await teamApi.create(payload)
        if (res?.success) {
          setSuccessMessage(`Team member "${formData.name}" added successfully.`)
          closeModal()
          fetchTeam()
        } else {
          setModalError(res?.error || 'Failed to create team member.')
        }
      } else if (modalMode === 'edit') {
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          department: formData.department.trim(),
        }
        if (formData.password) {
          payload.password = formData.password
        }
        const res = await teamApi.update(selectedMember.id, payload)
        if (res?.success) {
          setSuccessMessage(`Team member "${formData.name}" updated successfully.`)
          closeModal()
          fetchTeam()
        } else {
          setModalError(res?.error || 'Failed to update team member.')
        }
      }
    } catch (err) {
      setModalError(err.message || 'Operation failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Confirm deactivation
  const handleConfirmDeactivate = async () => {
    if (!selectedMember) return
    setSubmitting(true)
    setModalError('')
    try {
      const res = await teamApi.deactivate(selectedMember.id)
      if (res?.success) {
        setSuccessMessage(`Account for "${selectedMember.name}" has been deactivated.`)
        closeModal()
        fetchTeam()
      } else {
        setModalError(res?.error || 'Failed to deactivate member account.')
      }
    } catch (err) {
      setModalError(err.message || 'Deactivation failed.')
    } finally {
      setSubmitting(false)
    }
  }

  // Reactivate
  const handleActivate = async (member) => {
    if (!isOwner) return
    try {
      const res = await teamApi.activate(member.id)
      if (res?.success) {
        setSuccessMessage(`Account for "${member.name}" has been reactivated.`)
        fetchTeam()
      } else {
        setApiError(res?.error || 'Failed to reactivate account.')
      }
    } catch (err) {
      setApiError(err.message || 'Reactivation failed.')
    }
  }

  return (
    <div className="page-view">
      {/* Overview Banner */}
      <div className="panel" style={{ padding: '18px 24px', marginBottom: '20px' }}>
        <div className="panel-header" style={{ marginBottom: 0 }}>
          <div>
            <h3 className="panel-title">Team Workspace Directory</h3>
            <p className="panel-subtitle">
              Internal roster for {currentUser?.business_name || currentUser?.company || 'Your Business'} &bull; Database-backed team member accounts
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="tag ok">● {activeCount} Active</span>
            <span className="tag lead">{members.length} Total Members</span>
            {isOwner && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreateModal}
                id="btn-add-team-member"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                + Add Member
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="team-toast-success" role="status">
          <span>✓ {successMessage}</span>
          <button type="button" className="btn-ghost" onClick={() => setSuccessMessage('')}>✕</button>
        </div>
      )}

      {/* Global Error Banner */}
      {apiError && (
        <div className="team-toast-error" role="alert">
          <span>⚠️ {apiError}</span>
          <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={fetchTeam}>
            Retry
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="panel" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div className="filter-group">
            <div className="search-input-box">
              <input
                id="team-search"
                type="search"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search team by name or email"
              />
            </div>

            <label className="filter-label" htmlFor="team-dept-filter">Department</label>
            <select
              id="team-dept-filter"
              className="select-filter"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <label className="filter-label" htmlFor="team-status-filter">Status</label>
            <select
              id="team-status-filter"
              className="select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              type="button"
              className="btn-ghost"
              id="team-reset-filters"
              onClick={resetFilters}
              disabled={!hasFilters}
            >
              Clear Filters
            </button>
          </div>

          <span className="filter-count">
            Showing {filteredMembers.length} of {members.length} members
          </span>
        </div>
      </div>

      {/* Main Content: Loading | Empty | Grid */}
      {loading ? (
        <div className="panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--slate)' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '3px solid #e2e8f0',
            borderTopColor: 'var(--ink)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px'
          }} />
          <p>Loading real team records from database...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : members.length === 0 ? (
        <div className="team-empty" role="status">
          <div className="team-empty-icon" aria-hidden="true">👥</div>
          <h3>No team members yet</h3>
          <p>Add staff accounts for {currentUser?.business_name || currentUser?.company || 'your business'} to delegate tasks and collaborate.</p>
          {isOwner && (
            <button type="button" className="btn btn-primary" onClick={openCreateModal} style={{ marginTop: '8px' }}>
              + Add First Team Member
            </button>
          )}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="team-empty" role="status">
          <div className="team-empty-icon" aria-hidden="true">🔍</div>
          <h3>No team members match these filters</h3>
          <p>Try a different search term or reset department and status filters.</p>
          <button type="button" className="btn-secondary" onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="team-grid">
          {filteredMembers.map((member) => (
            <article
              key={member.id}
              className={`team-card ${member.status === 'inactive' ? 'inactive-card' : ''}`}
            >
              <div className="team-card-head">
                <div className="team-avatar-lg">
                  {getInitials(member.name)}
                  <span
                    className={`team-status-dot ${member.status === 'active' ? 'online' : 'offline'}`}
                    title={member.status === 'active' ? 'Active Account' : 'Deactivated'}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 className="team-card-name" style={{ margin: 0 }}>{member.name}</h4>
                    <span className={`team-status-tag ${member.status}`}>
                      {member.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="team-card-role" style={{ margin: '2px 0 0' }}>Team Member</p>
                  <span className="tag lead" style={{ marginTop: '6px', fontSize: '0.68rem', display: 'inline-block' }}>
                    {member.department || 'General'}
                  </span>
                </div>
              </div>

              <div className="team-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate)' }}>Email:</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{member.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate)' }}>Joined:</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>
                    {member.created_at ? new Date(member.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </span>
                </div>
              </div>

              {isOwner && (
                <div className="team-actions-row">
                  <button
                    type="button"
                    className="btn-ghost team-action-btn"
                    onClick={() => openEditModal(member)}
                  >
                    ✏ Edit
                  </button>
                  {member.status === 'active' ? (
                    <button
                      type="button"
                      className="btn-ghost team-action-btn danger"
                      onClick={() => openDeactivateModal(member)}
                    >
                      ⊘ Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-ghost team-action-btn success"
                      onClick={() => handleActivate(member)}
                    >
                      ✓ Reactivate
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* ── Modal: Create / Edit Team Member ── */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="team-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="team-modal-card" role="dialog" aria-modal="true" aria-labelledby="team-modal-title">
            <div className="team-modal-header">
              <h3 id="team-modal-title">
                {modalMode === 'create' ? 'Add New Team Member' : `Edit: ${selectedMember?.name}`}
              </h3>
              <button type="button" className="modal-close-btn" onClick={closeModal} aria-label="Close modal">✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="team-modal-body">
                {modalError && (
                  <div className="team-toast-error" style={{ marginBottom: 0 }}>
                    <span>⚠️ {modalError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="member-name">
                    Full Name <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id="member-name"
                    type="text"
                    className={`form-input ${formErrors.name ? 'input-error' : ''}`}
                    placeholder="e.g. Ramesh Patel"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="member-email">
                    Email Address <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id="member-email"
                    type="email"
                    className={`form-input ${formErrors.email ? 'input-error' : ''}`}
                    placeholder="e.g. ramesh@company.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="member-department">Department</label>
                  <input
                    id="member-department"
                    type="text"
                    list="dept-suggestions"
                    className="form-input"
                    placeholder="e.g. Sales, Operations, Accounts"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                  <datalist id="dept-suggestions">
                    <option value="Operations" />
                    <option value="Sales" />
                    <option value="Accounts" />
                    <option value="Logistics" />
                    <option value="Warehouse" />
                    <option value="Support" />
                  </datalist>
                </div>

                <div className="form-group">
                  <label htmlFor="member-password">
                    {modalMode === 'create' ? (
                      <>Initial Password <span style={{ color: 'var(--danger)' }}>*</span></>
                    ) : (
                      <>Reset Password <span style={{ color: 'var(--slate)', fontSize: '0.78rem' }}>(leave blank to keep unchanged)</span></>
                    )}
                  </label>
                  <input
                    id="member-password"
                    type="password"
                    className={`form-input ${formErrors.password ? 'input-error' : ''}`}
                    placeholder={modalMode === 'create' ? 'Min 8 characters' : 'Enter new password or leave blank'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  {formErrors.password && <span className="field-error">{formErrors.password}</span>}
                </div>
              </div>

              <div className="team-modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : (modalMode === 'create' ? 'Create Member' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Confirm Deactivation ── */}
      {modalMode === 'deactivate' && selectedMember && (
        <div className="team-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="team-modal-card" style={{ maxWidth: '440px' }} role="dialog" aria-modal="true">
            <div className="team-modal-header">
              <h3 style={{ color: 'var(--danger)' }}>Deactivate Team Member</h3>
              <button type="button" className="modal-close-btn" onClick={closeModal}>✕</button>
            </div>

            <div className="team-modal-body" style={{ textAlign: 'center', padding: '24px 20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⊘</div>
              <h4 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: 'var(--ink)' }}>
                Deactivate {selectedMember.name}?
              </h4>
              <p style={{ fontSize: '0.86rem', color: 'var(--slate)', lineHeight: 1.5, margin: 0 }}>
                This user ({selectedMember.email}) will no longer be able to sign in to OmniOS. Historical activity, task assignments, and audit trails remain preserved.
              </p>
              {modalError && (
                <div className="team-toast-error" style={{ marginTop: '12px', marginBottom: 0 }}>
                  <span>⚠️ {modalError}</span>
                </div>
              )}
            </div>

            <div className="team-modal-footer" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn-secondary" onClick={closeModal} disabled={submitting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ background: 'var(--danger)', color: '#fff' }}
                onClick={handleConfirmDeactivate}
                disabled={submitting}
              >
                {submitting ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
