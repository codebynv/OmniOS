import { useState, useEffect, useCallback } from 'react'
import { customersApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { formatIndianMobile, isValidIndianMobile } from '../utils/validation'
import './Customers.css'

/**
 * Customers CRUD Page — Full Interactive Directory.
 * Demonstrates:
 * - Unit I-B: HTML Tables for structured data display
 * - Unit I-D: HTML Forms with controlled inputs and validation
 * - Unit II-A: PHP REST API integration with prepared statements
 * - Unit IV-B: Props drilling to child components
 * - Unit IV-C: useState for UI state management
 * - Unit IV-D: Event handling (create, edit, delete, search)
 * - Unit IV-G: Controlled form components in React
 */

const EMPTY_FORM = { name: '', email: '', company: '', phone: '' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total_records: 0, total_pages: 1, search: '' })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal state
  const [modalMode, setModalMode] = useState(null) // 'create' | 'edit' | 'delete'
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const fetchCustomers = useCallback(async (page = 1, searchTerm = '') => {
    setLoading(true)
    setError('')
    try {
      const data = await customersApi.getAll(page, 10, searchTerm)
      if (data?.success) {
        setCustomers(data.data || [])
        setPagination(data.pagination || { page: 1, limit: 10, total_records: 0, total_pages: 1, search: searchTerm })
      } else {
        setError('Failed to load customer records.')
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to the backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers(1, '')
  }, [fetchCustomers])

  useEffect(() => {
    if (!modalMode) return undefined
    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || submitting) return
      setModalMode(null)
      setSelectedCustomer(null)
      setFormData(EMPTY_FORM)
      setFormErrors({})
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalMode, submitting])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchCustomers(1, search.trim())
  }

  const handleClearSearch = () => {
    setSearch('')
    fetchCustomers(1, '')
  }

  const handlePageChange = (newPage) => {
    fetchCustomers(newPage, pagination.search || search)
  }

  // ── Modal helpers ──────────────────────────────────────────────
  const openCreate = () => {
    setFormData(EMPTY_FORM)
    setFormErrors({})
    setModalMode('create')
  }

  const openEdit = (customer) => {
    setSelectedCustomer(customer)
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      company: customer.company || '',
      phone: customer.phone || '',
    })
    setFormErrors({})
    setModalMode('edit')
  }

  const openDelete = (customer) => {
    setSelectedCustomer(customer)
    setModalMode('delete')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedCustomer(null)
    setFormData(EMPTY_FORM)
    setFormErrors({})
  }

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 3500)
  }

  // ── Form validation ────────────────────────────────────────────
  const validateForm = () => {
    const errors = {}
    if (!formData.name.trim()) errors.name = 'Customer name is required.'
    else if (formData.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.'

    if (!formData.email.trim()) {
      errors.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Enter a valid email address.'
    }

    if (formData.company && formData.company.length > 100) errors.company = 'Company name too long (max 100 chars).'

    if (!formData.phone.trim()) {
      errors.phone = 'Mobile number is required.'
    } else if (!isValidIndianMobile(formData.phone)) {
      errors.phone = 'Enter a valid 10-digit Indian mobile number.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const applyApiErrors = (err) => {
    const data = err?.data
    const list = Array.isArray(data?.errors) && data.errors.length
      ? data.errors
      : [data?.error || err?.message || 'Request failed.']

    const next = {}
    for (const raw of list) {
      const msg = String(raw)
      const lower = msg.toLowerCase()
      if (lower.includes('phone') || lower.includes('mobile')) next.phone = msg
      else if (lower.includes('email')) next.email = msg
      else if (lower.includes('company')) next.company = msg
      else if (lower.includes('name')) next.name = msg
      else next._api = msg
    }
    if (!next._api && Object.keys(next).length > 0) {
      next._api = 'Please correct the highlighted fields and try again.'
    }
    setFormErrors(next)
  }

  const buildPayload = () => ({
    name: formData.name.trim(),
    email: formData.email.trim(),
    company: formData.company.trim(),
    phone: formatIndianMobile(formData.phone),
  })

  // ── CRUD handlers ──────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setSubmitting(true)
    try {
      const res = await customersApi.create(buildPayload())
      if (res?.success) {
        closeModal()
        showSuccess('Customer added successfully.')
        fetchCustomers(1, search)
      } else {
        applyApiErrors({ data: res })
      }
    } catch (err) {
      applyApiErrors(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setSubmitting(true)
    try {
      const res = await customersApi.update(selectedCustomer.id, buildPayload())
      if (res?.success) {
        closeModal()
        showSuccess('Customer updated successfully.')
        fetchCustomers(pagination.page, pagination.search || search)
      } else {
        applyApiErrors({ data: res })
      }
    } catch (err) {
      applyApiErrors(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      const res = await customersApi.delete(selectedCustomer.id)
      if (res?.success) {
        closeModal()
        showSuccess('Customer deleted successfully.')
        const newPage = customers.length === 1 && pagination.page > 1
          ? pagination.page - 1
          : pagination.page
        fetchCustomers(newPage, pagination.search || search)
      } else {
        applyApiErrors({ data: res })
      }
    } catch (err) {
      applyApiErrors(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="customers-page">
      <div className="page-view customers-content">
        {/* Page Header */}
        <div className="customers-header-bar">
          <div>
            <h2>Customer Directory</h2>
            <p className="customers-intro">
              Manage enterprise client accounts, communication details, and status.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary add-customer-btn"
            onClick={openCreate}
            id="btn-add-customer"
          >
            <svg
              className="btn-plus-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Customer</span>
          </button>
        </div>

        {/* Success Toast */}
        {successMessage && (
          <div className="alert-success" role="status">
            ✓ {successMessage}
          </div>
        )}

        {/* Search Bar */}
        <form className="search-bar" onSubmit={handleSearch} role="search">
          <div className="search-input-box">
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="customer-search"
              type="search"
              className="search-input"
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search customers"
            />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
          {(pagination.search || search) && (
            <button type="button" className="btn btn-ghost" onClick={handleClearSearch}>
              Clear
            </button>
          )}
        </form>

        <div className="customers-results">
          {/* Loading State — first load only */}
          {loading && customers.length === 0 && (
            <div className="table-loading" aria-live="polite">
              <div className="spinner" aria-hidden="true" />
              <span>Loading customer records...</span>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="alert-error" role="alert">
              ⚠ {error}
              <button type="button" className="btn-ghost" style={{ marginLeft: '12px' }} onClick={() => fetchCustomers(pagination.page, search)}>
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && customers.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>No customers found</h3>
              <p>
                {pagination.search
                  ? `No results for "${pagination.search}". Try a different search.`
                  : 'Add your first customer to get started.'}
              </p>
              {!pagination.search && (
                <button type="button" className="btn btn-primary add-customer-btn" onClick={openCreate}>
                  <svg
                    className="btn-plus-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Add First Customer</span>
                </button>
              )}
            </div>
          )}

          {/* Data Table — stays mounted while paginating or re-searching */}
          {!error && customers.length > 0 && (
            <>
              <div
                className={`data-table-container${loading ? ' is-refreshing' : ''}`}
                aria-busy={loading}
              >
                <table className="data-table customers-table" aria-label="Customer directory">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Company</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th className="actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, idx) => (
                      <tr key={c.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                          {(pagination.page - 1) * pagination.limit + idx + 1}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{c.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{c.email}</td>
                        <td>{c.company || <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                        <td>{c.phone || <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                        <td><StatusBadge status="active" /></td>
                        <td className="actions-col">
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn-ghost action-btn"
                              onClick={() => openEdit(c)}
                              aria-label={`Edit ${c.name}`}
                            >
                              ✏ Edit
                            </button>
                            <button
                              type="button"
                              className="btn-ghost action-btn danger"
                              onClick={() => openDelete(c)}
                              aria-label={`Delete ${c.name}`}
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="pagination-bar">
                <span className="pagination-info">
                  Showing {customers.length} of {pagination.total_records} customer{pagination.total_records !== 1 ? 's' : ''}
                  {pagination.search && ` matching "${pagination.search}"`}
                </span>
                <div className="pagination-controls">
                  {loading && (
                    <span className="refresh-indicator" role="status">
                      <span className="spin spin-xs" aria-hidden="true" />
                      Refreshing
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1 || loading}
                  >
                    &larr; Prev
                  </button>
                  <span className="page-badge">
                    Page {pagination.page} of {pagination.total_pages}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.total_pages || loading}
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modal Overlay ── */}
      {modalMode && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="customer-modal-title" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="modal-card">

            {/* CREATE / EDIT Modal */}
            {(modalMode === 'create' || modalMode === 'edit') && (
              <>
                <div className="modal-header">
                  <h3 id="customer-modal-title">{modalMode === 'create' ? 'Add New Customer' : 'Edit Customer'}</h3>
                  <button type="button" className="modal-close-btn" onClick={closeModal} aria-label="Close modal">×</button>
                </div>

                {formErrors._api && (
                  <div className="alert-error" style={{ margin: '0 0 16px' }} role="alert">
                    ⚠ {formErrors._api}
                  </div>
                )}

                <form onSubmit={modalMode === 'create' ? handleCreate : handleUpdate} noValidate>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="modal-name">Full Name <span className="required">*</span></label>
                      <input
                        id="modal-name"
                        type="text"
                        className={`form-input ${formErrors.name ? 'input-error' : ''}`}
                        value={formData.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        placeholder="e.g. Rajesh Sharma"
                        disabled={submitting}
                        required
                        aria-invalid={Boolean(formErrors.name)}
                        aria-describedby={formErrors.name ? 'modal-name-error' : undefined}
                      />
                      {formErrors.name && <span className="field-error" id="modal-name-error" role="alert">{formErrors.name}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="modal-email">Email Address <span className="required">*</span></label>
                      <input
                        id="modal-email"
                        type="email"
                        className={`form-input ${formErrors.email ? 'input-error' : ''}`}
                        value={formData.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        placeholder="e.g. rajesh@company.com"
                        disabled={submitting}
                        required
                        aria-invalid={Boolean(formErrors.email)}
                        aria-describedby={formErrors.email ? 'modal-email-error' : undefined}
                      />
                      {formErrors.email && <span className="field-error" id="modal-email-error" role="alert">{formErrors.email}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="modal-company">Company Name</label>
                      <input
                        id="modal-company"
                        type="text"
                        className={`form-input ${formErrors.company ? 'input-error' : ''}`}
                        value={formData.company}
                        onChange={(e) => handleFieldChange('company', e.target.value)}
                        placeholder="e.g. Sharma Traders & Supplies"
                        disabled={submitting}
                        aria-invalid={Boolean(formErrors.company)}
                        aria-describedby={formErrors.company ? 'modal-company-error' : undefined}
                      />
                      {formErrors.company && <span className="field-error" id="modal-company-error" role="alert">{formErrors.company}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="modal-phone">Mobile Number <span className="required">*</span></label>
                      <input
                        id="modal-phone"
                        type="tel"
                        className={`form-input ${formErrors.phone ? 'input-error' : ''}`}
                        value={formData.phone}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        placeholder="e.g. 98200 11223"
                        maxLength={20}
                        disabled={submitting}
                        required
                        aria-invalid={Boolean(formErrors.phone)}
                        aria-describedby={formErrors.phone ? 'modal-phone-error' : 'modal-phone-hint'}
                      />
                      <span className="field-note" id="modal-phone-hint">
                        10-digit Indian mobile. Spaces, hyphens and a +91 prefix are accepted.
                      </span>
                      {formErrors.phone && <span className="field-error" id="modal-phone-error" role="alert">{formErrors.phone}</span>}
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={closeModal} disabled={submitting}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={submitting} id={`btn-${modalMode}-customer-submit`}>
                      {submitting
                        ? (modalMode === 'create' ? 'Adding...' : 'Saving...')
                        : (modalMode === 'create' ? 'Add Customer' : 'Save Changes')}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* DELETE Confirmation Modal */}
            {modalMode === 'delete' && selectedCustomer && (
              <>
                <div className="modal-header">
                  <h3 id="customer-modal-title">Delete Customer</h3>
                  <button type="button" className="modal-close-btn" onClick={closeModal} aria-label="Close modal">×</button>
                </div>
                <div className="delete-confirm-body">
                  <div className="delete-icon">🗑</div>
                  <p>
                    Are you sure you want to permanently delete <strong>{selectedCustomer.name}</strong>
                    {selectedCustomer.company && ` (${selectedCustomer.company})`}?
                  </p>
                  <p className="delete-warning">This action cannot be undone.</p>
                </div>
                {formErrors._api && (
                  <div className="alert-error" style={{ margin: '0 0 16px' }} role="alert">
                    ⚠ {formErrors._api}
                  </div>
                )}
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={closeModal} disabled={submitting}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={handleDelete}
                    disabled={submitting}
                    id="btn-confirm-delete-customer"
                  >
                    {submitting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
