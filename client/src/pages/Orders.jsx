import { useState, useEffect, useCallback, useMemo } from 'react'
import { inr } from '../data/demoData'
import { ordersApi, customersApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import './Orders.css'

/**
 * Commercial Orders & Fulfillment Workspace.
 * Database-backed with Indian Rupee formatting, status filters,
 * real-time mutations, and business boundary isolation.
 */
export default function Orders() {
  const { user, owner } = useAuth()
  const { refreshNotifications } = useNotifications()
  const currentUser = user || owner
  const isOwner = currentUser?.role === 'owner'

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [feedback, setFeedback] = useState(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Create Order Modal state (Team Member only)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [newOrder, setNewOrder] = useState({
    customer_id: '',
    order_number: '',
    item_summary: '',
    total_amount: '',
    payment_method: 'Pending',
    status: 'Pending',
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    notes: '',
  })

  const [formErrors, setFormErrors] = useState({})

  // Fetch orders from MySQL backend
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setApiError('')
      const res = await ordersApi.getAll(statusFilter, search)
      if (res && res.data) {
        setOrders(res.data)
      } else {
        setOrders([])
      }
    } catch (err) {
      setApiError(err.message || 'Failed to load commercial orders from database.')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Open Create Order modal and load real customers (Team Member only)
  const handleOpenCreateModal = useCallback(async () => {
    if (isOwner) return
    setShowCreateModal(true)
    setFormErrors({})
    setNewOrder({
      customer_id: '',
      order_number: '',
      item_summary: '',
      total_amount: '',
      payment_method: 'UPI',
      status: 'Pending',
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: '',
      notes: '',
    })

    if (customers.length === 0) {
      try {
        setLoadingCustomers(true)
        const res = await customersApi.getAll(1, 100)
        if (res && res.data) {
          setCustomers(res.data)
          if (res.data.length > 0) {
            setNewOrder((prev) => ({ ...prev, customer_id: String(res.data[0].id) }))
          }
        }
      } catch (err) {
        console.error('Failed to load customers for order creation', err)
      } finally {
        setLoadingCustomers(false)
      }
    } else if (customers.length > 0) {
      setNewOrder((prev) => ({ ...prev, customer_id: String(customers[0].id) }))
    }
  }, [isOwner, customers.length])

  // Handle form submission
  const handleCreateOrder = async (e) => {
    e.preventDefault()
    const errors = {}

    if (!newOrder.customer_id) {
      errors.customer_id = 'Please select a customer.'
    }
    if (!newOrder.item_summary.trim()) {
      errors.item_summary = 'Item or service description is required.'
    }
    const numAmount = parseFloat(newOrder.total_amount)
    if (isNaN(numAmount) || numAmount < 0) {
      errors.total_amount = 'Please enter a valid total amount (₹).'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      setSubmitting(true)
      setFormErrors({})

      const payload = {
        customer_id: parseInt(newOrder.customer_id, 10),
        order_number: newOrder.order_number.trim() || undefined,
        item_summary: newOrder.item_summary.trim(),
        total_amount: numAmount,
        payment_method: newOrder.payment_method,
        status: newOrder.status,
        order_date: newOrder.order_date,
        delivery_date: newOrder.delivery_date || undefined,
        notes: newOrder.notes.trim() || undefined,
      }

      const res = await ordersApi.create(payload)
      if (res && res.data) {
        setOrders((prev) => [res.data, ...prev])
        setShowCreateModal(false)
        setFeedback({ type: 'success', text: `Order ${res.data.order_number} created successfully.` })
        setTimeout(() => setFeedback(null), 4000)
      }
    } catch (err) {
      setFormErrors({ _api: err.message || 'Failed to create order.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle status update
  const handleStatusChange = async (orderId, newStatus) => {
    const prevOrders = [...orders]
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    )

    try {
      await ordersApi.updateStatus(orderId, newStatus)
      setFeedback({ type: 'success', text: `Order status updated to ${newStatus}.` })
      setTimeout(() => setFeedback(null), 3000)
      refreshNotifications()
    } catch (err) {
      // Revert on failure
      setOrders(prevOrders)
      setFeedback({ type: 'error', text: err.message || 'Failed to update order status.' })
      setTimeout(() => setFeedback(null), 5000)
    }
  }

  // Handle order cancellation (Team Member only)
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order? This will update the order status to Cancelled.')) {
      return
    }

    const prevOrders = [...orders]
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'Cancelled' } : o))
    )

    try {
      await ordersApi.cancel(orderId)
      setFeedback({ type: 'success', text: 'Order cancelled successfully.' })
      setTimeout(() => setFeedback(null), 3000)
    } catch (err) {
      setOrders(prevOrders)
      setFeedback({ type: 'error', text: err.message || 'Failed to cancel order.' })
      setTimeout(() => setFeedback(null), 5000)
    }
  }

  // Calculate filtered totals
  const totalValue = useMemo(() => {
    return orders.reduce((sum, o) => {
      // Exclude cancelled orders from total ledger value
      if (o.status === 'Cancelled') return sum
      return sum + (o.total_amount || o.amount || 0)
    }, 0)
  }, [orders])

  return (
    <div className="page-view">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={feedback.type === 'error' ? 'alert-error' : 'alert-success'}
          style={{ marginBottom: '14px' }}
        >
          {feedback.type === 'error' ? '⚠️ ' : '✓ '}
          {feedback.text}
        </div>
      )}

      {/* Control & Filter Bar */}
      <div className="panel" style={{ padding: '16px 20px', marginBottom: '18px' }}>
        <div className="filter-bar" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="filter-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-input-box">
              <input
                type="text"
                placeholder="Search order number, client, company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search orders"
              />
            </div>

            <select
              className="select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter orders by status"
            >
              <option value="all">All Fulfillment Statuses</option>
              <option value="Delivered">Delivered</option>
              <option value="Processing">Processing</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="filter-count">
              Showing {orders.length} record{orders.length === 1 ? '' : 's'}
            </span>
            {!isOwner && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={handleOpenCreateModal}
              >
                <span>+</span> New Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="table-wrap">
        {loading ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--slate)' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '8px' }}>⏳</div>
            <div>Loading commercial orders ledger...</div>
          </div>
        ) : apiError ? (
          <div style={{ padding: '36px 16px', textAlign: 'center' }}>
            <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '8px' }}>
              ⚠️ {apiError}
            </div>
            <button type="button" className="btn-secondary" onClick={fetchOrders}>
              Retry Loading Orders
            </button>
          </div>
        ) : (
          <table className="datatable" aria-label="Commercial Orders Directory">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer / Company</th>
                <th>Item / Service</th>
                <th>Order Date</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th className="num">Total Amount</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px 14px', color: 'var(--slate)' }}>
                    {search || statusFilter !== 'all'
                      ? 'No orders match your filter criteria.'
                      : isOwner
                        ? 'No commercial orders found in your ledger.'
                        : 'No commercial orders found in your ledger. Create your first order to begin tracking fulfillment.'}
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  let statusTagClass = 'tag wait'
                  if (ord.status === 'Delivered') statusTagClass = 'tag ok'
                  if (ord.status === 'Processing') statusTagClass = 'tag prog'
                  if (ord.status === 'Cancelled') statusTagClass = 'tag risk'

                  return (
                    <tr key={ord.id}>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
                        {ord.order_number || ord.id}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                          {ord.company || ord.customer}
                        </div>
                        {ord.customer && ord.company && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>
                            Contact: {ord.customer}
                          </div>
                        )}
                      </td>
                      <td>{ord.item_summary || ord.item}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', color: 'var(--slate)' }}>
                        {ord.date || ord.order_date}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>
                          {ord.payment_method || ord.method}
                        </span>
                      </td>
                      <td>
                        <select
                          className={`order-status-select ${statusTagClass}`}
                          value={ord.status}
                          onChange={isOwner ? undefined : (e) => handleStatusChange(ord.id, e.target.value)}
                          disabled={isOwner}
                          aria-label={`Update status for ${ord.order_number || ord.id}`}
                          aria-disabled={isOwner}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="num">
                        {inr(ord.total_amount || ord.amount || 0)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!isOwner && ord.status !== 'Cancelled' && (
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: '3px 8px', fontSize: '0.74rem', color: 'var(--danger)' }}
                            onClick={() => handleCancelOrder(ord.id)}
                            title="Cancel Order"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Orders Summary Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          background: 'var(--white)',
          border: '1px solid var(--line-light)',
          borderTop: 'none',
          borderRadius: '0 0 var(--radius-md) var(--radius-md)',
          fontSize: '0.86rem',
        }}
      >
        <span style={{ color: 'var(--slate)' }}>
          Showing {orders.length} order{orders.length === 1 ? '' : 's'} in ledger
        </span>
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
          Active Filtered Value:{' '}
          <span style={{ color: 'var(--signal)', fontFamily: 'var(--mono)', fontWeight: 700 }}>
            {inr(totalValue)}
          </span>
        </span>
      </div>

      {/* ── CREATE ORDER MODAL ── */}
      {!isOwner && showCreateModal && (
        <div
          className="orders-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false)
          }}
        >
          <div className="orders-modal-card">
            <div className="orders-modal-header">
              <h3>Create Commercial Order</h3>
              <button
                type="button"
                className="orders-modal-close"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {formErrors._api && (
              <div className="alert-error" style={{ marginBottom: '14px' }}>
                ⚠️ {formErrors._api}
              </div>
            )}

            <form onSubmit={handleCreateOrder}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: '6px' }}>
                  Client Account <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                {loadingCustomers ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Loading customers...</div>
                ) : customers.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--danger)' }}>
                    No customers found in your business. Please add a customer first in the Customers module.
                  </div>
                ) : (
                  <select
                    className="form-input"
                    value={newOrder.customer_id}
                    onChange={(e) => setNewOrder({ ...newOrder, customer_id: e.target.value })}
                    required
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {formErrors.customer_id && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '4px' }}>
                    {formErrors.customer_id}
                  </div>
                )}
              </div>

              <div className="form-grid-2" style={{ marginBottom: '14px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: '6px' }}>
                    Order Number <span style={{ color: 'var(--slate)', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ORD-9401 (Auto if blank)"
                    value={newOrder.order_number}
                    onChange={(e) => setNewOrder({ ...newOrder, order_number: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: '6px' }}>
                    Total Amount (₹) <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="e.g. 25000"
                    value={newOrder.total_amount}
                    onChange={(e) => setNewOrder({ ...newOrder, total_amount: e.target.value })}
                    required
                  />
                  {formErrors.total_amount && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '4px' }}>
                      {formErrors.total_amount}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: '6px' }}>
                  Item / Service Summary <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ergonomic Office Chairs ×6, Printer Cartridges"
                  value={newOrder.item_summary}
                  onChange={(e) => setNewOrder({ ...newOrder, item_summary: e.target.value })}
                  required
                />
                {formErrors.item_summary && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '4px' }}>
                    {formErrors.item_summary}
                  </div>
                )}
              </div>

              <div className="form-grid-2" style={{ marginBottom: '14px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: '6px' }}>
                    Payment Method
                  </label>
                  <select
                    className="form-input"
                    value={newOrder.payment_method}
                    onChange={(e) => setNewOrder({ ...newOrder, payment_method: e.target.value })}
                  >
                    <option value="UPI">UPI</option>
                    <option value="NEFT">NEFT</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: '6px' }}>
                    Fulfillment Status
                  </label>
                  <select
                    className="form-input"
                    value={newOrder.status}
                    onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2" style={{ marginBottom: '18px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: '6px' }}>
                    Order Date
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={newOrder.order_date}
                    onChange={(e) => setNewOrder({ ...newOrder, order_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: '6px' }}>
                    Delivery Date <span style={{ color: 'var(--slate)', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={newOrder.delivery_date}
                    onChange={(e) => setNewOrder({ ...newOrder, delivery_date: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting || customers.length === 0}
                >
                  {submitting ? 'Saving Order...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
