import { useState } from 'react'
import { DEMO_ORDERS, inr } from '../data/demoData'
import './Orders.css'

/**
 * Orders & Commercial Fulfillment Workspace.
 * Realistic order table with Indian Rupee formatting, status filters,
 * and clear demo-only identification.
 */
export default function Orders() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filteredOrders = DEMO_ORDERS.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status.toLowerCase() === statusFilter.toLowerCase()
    const query = search.toLowerCase()
    const matchesSearch =
      o.id.toLowerCase().includes(query) ||
      (o.customer && o.customer.toLowerCase().includes(query)) ||
      (o.company && o.company.toLowerCase().includes(query)) ||
      o.item.toLowerCase().includes(query)
    return matchesStatus && matchesSearch
  })

  const totalValue = filteredOrders.reduce((sum, o) => sum + o.amount, 0)

  return (
    <div className="page-view">
      {/* Demo Notice Banner */}
      <div className="demo-banner-strip">
        <div>
          <strong>Commercial Orders Ledger</strong> &bull; Fictional order records for Sharma Office Supplies.
        </div>
        <span className="tag demo">Demo-only &bull; Non-persistent</span>
      </div>

      <div className="panel" style={{ padding: '16px 20px', marginBottom: '18px' }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div className="filter-group">
            <div className="search-input-box">
              <input
                type="text"
                placeholder="Search by order ID, client, company or item..."
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
              <option value="Overdue">Overdue Payment</option>
            </select>
          </div>

          <span className="filter-count">
            Showing {filteredOrders.length} of {DEMO_ORDERS.length} records
          </span>
        </div>
      </div>

      <div className="table-wrap">
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
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '32px 14px', color: 'var(--slate)' }}>
                  No orders match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredOrders.map((ord) => {
                let statusTagClass = 'tag wait'
                if (ord.status === 'Delivered') statusTagClass = 'tag ok'
                if (ord.status === 'Processing') statusTagClass = 'tag prog'
                if (ord.status === 'Overdue') statusTagClass = 'tag risk'

                return (
                  <tr key={ord.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{ord.id}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{ord.company || ord.customer}</div>
                      {ord.customer && ord.company && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>Contact: {ord.customer}</div>
                      )}
                    </td>
                    <td>{ord.item}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', color: 'var(--slate)' }}>
                      {ord.date}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{ord.method}</span>
                    </td>
                    <td>
                      <span className={statusTagClass}>{ord.status}</span>
                    </td>
                    <td className="num">{inr(ord.amount)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
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
          Showing {filteredOrders.length} active demo orders
        </span>
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
          Total Filtered Value:{' '}
          <span style={{ color: 'var(--signal)', fontFamily: 'var(--mono)', fontWeight: 700 }}>
            {inr(totalValue)}
          </span>
        </span>
      </div>
    </div>
  )
}
