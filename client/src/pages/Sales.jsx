import { useState, useEffect, useCallback } from 'react'
import { inr } from '../data/demoData'
import { salesApi } from '../services/api'

/**
 * Sales & Revenue Analytics Workspace.
 * Authentic database-driven revenue performance and commercial invoices ledger.
 * All figures derived exclusively from persisted orders in MySQL.
 */
export default function Sales() {
  const [salesData, setSalesData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [apiError, setApiError] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(null)

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true)
      setApiError('')
      const res = await salesApi.getSummary()
      if (res && res.data) {
        setSalesData(res.data)
      } else {
        setSalesData(null)
      }
    } catch (err) {
      setApiError(err.message || 'Failed to load sales metrics.')
      setSalesData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  // Indian financial year months (Apr-Mar)
  const FY_MONTHS = [
    { month: 'Apr', monthNum: 4 },
    { month: 'May', monthNum: 5 },
    { month: 'Jun', monthNum: 6 },
    { month: 'Jul', monthNum: 7 },
    { month: 'Aug', monthNum: 8 },
    { month: 'Sep', monthNum: 9 },
    { month: 'Oct', monthNum: 10 },
    { month: 'Nov', monthNum: 11 },
    { month: 'Dec', monthNum: 12 },
    { month: 'Jan', monthNum: 1 },
    { month: 'Feb', monthNum: 2 },
    { month: 'Mar', monthNum: 3 },
  ]

  const apiMonthlySales = salesData?.monthly_sales || []
  const fyStartYear = salesData?.year || new Date().getFullYear()
  const fyEndYear = fyStartYear + 1
  const fyLabel = salesData?.fy_label || `FY ${fyStartYear}-${String(fyEndYear).slice(-2)}`

  // Merge API data with all 12 FY months, filling missing months with zero
  const monthlySales = FY_MONTHS.map((fyMonth) => {
    const apiItem = apiMonthlySales.find(
      (m) => m.month === fyMonth.month && (m.year ?? fyStartYear) === (fyMonth.monthNum >= 4 ? fyStartYear : fyEndYear)
    )
    return apiItem || {
      month: fyMonth.month,
      monthNum: fyMonth.monthNum,
      amount: 0,
      year: fyMonth.monthNum >= 4 ? fyStartYear : fyEndYear,
    }
  })

  const maxMonthly = Math.max(...monthlySales.map((m) => m.amount), 0)
  const ytdTotal = salesData?.annual_revenue_ytd ?? 0
  const avgOrderVal = salesData?.avg_order_value ?? 0
  const collectedMonth = salesData?.collected_this_month ?? 0
  const pendingInvoices = salesData?.pending_invoices ?? 0
  const pendingCount = salesData?.pending_count ?? 0
  const recentInvoices = salesData?.recent_invoices || []

  if (loading) {
    return (
      <div className="page-view">
        <div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--slate)' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>📊</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Aggregating commercial revenue ledger...</div>
        </div>
      </div>
    )
  }

  if (apiError) {
    return (
      <div className="page-view">
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '12px', fontSize: '1.05rem' }}>
            ⚠️ {apiError}
          </div>
          <button type="button" className="btn-secondary" onClick={fetchSales}>
            Retry Loading Sales
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-view">
      {/* 4 Database-Backed KPI Cards */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="lbl">Annual Revenue (YTD)</div>
          <div className="val money">{inr(ytdTotal)}</div>
          <div className="delta" style={{ color: ytdTotal > 0 ? 'var(--signal)' : 'var(--slate)' }}>
            {ytdTotal > 0 ? '● Realized Delivered Revenue' : '○ No delivered revenue yet'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="lbl">Avg Order Value</div>
          <div className="val money">{inr(avgOrderVal)}</div>
          <div className="delta" style={{ color: avgOrderVal > 0 ? 'var(--signal)' : 'var(--slate)' }}>
            {salesData?.total_orders ? `Across ${salesData.total_orders} active orders` : 'No order history'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="lbl">Collected This Month</div>
          <div className="val money">{inr(collectedMonth)}</div>
          <div className="delta" style={{ color: collectedMonth > 0 ? 'var(--signal)' : 'var(--slate)' }}>
            {collectedMonth > 0 ? '● Settled in current calendar month' : '○ Zero collections this month'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="lbl">Pending Receivables</div>
          <div className="val money">{inr(pendingInvoices)}</div>
          <div className="delta" style={{ color: pendingCount > 0 ? 'var(--accent-primary)' : 'var(--slate)' }}>
            {pendingCount > 0 ? `▲ ${pendingCount} order${pendingCount === 1 ? '' : 's'} in pipeline` : 'All invoices settled'}
          </div>
        </div>
      </div>

      {/* Monthly Revenue Bar Chart Panel */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Monthly Revenue Performance ({fyLabel})</h3>
            <p className="panel-subtitle">Delivered commercial revenue grouped by month in Indian Rupees (₹)</p>
          </div>
          <span className="tag lead">{fyLabel}</span>
        </div>

        <div className="chart-container" style={{ padding: '16px 0 8px' }}>
            {maxMonthly === 0 && (
              <div style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--slate)', fontSize: '0.82rem', background: 'var(--paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-light)', marginBottom: '12px' }}>
                No delivered order revenue recorded for {fyLabel} yet.
                <br />
                <span style={{ fontSize: '0.75rem' }}>When commercial orders are marked as <strong>Delivered</strong>, their settled amounts will automatically appear in this chart.</span>
              </div>
            )}
            <div className="bar-chart-visual" style={{ height: '180px' }}>
              {monthlySales.map((item) => {
                const pct = maxMonthly > 0 ? Math.round((item.amount / maxMonthly) * 100) : 0
                const isPeak = maxMonthly > 0 && item.amount === maxMonthly
                const isSelected = selectedMonth?.month === item.month && selectedMonth?.year === item.year
                const displayYear = item.year || fyStartYear

                return (
                  <div
                    key={`${item.year}-${item.monthNum}`}
                    className={`col${isPeak ? ' peak' : ''}`}
                    onClick={() => setSelectedMonth(item)}
                    style={{ cursor: item.amount > 0 ? 'pointer' : 'default' }}
                  >
                    <div
                      className="stick"
                      data-tooltip={`${item.month} ${displayYear}: ${inr(item.amount)}`}
                      title={`${item.month} ${displayYear}: ${inr(item.amount)}`}
                    >
                      <div
                        className="fill"
                        style={{
                          height: `${pct}%`,
                          filter: isSelected ? 'brightness(1.3)' : undefined,
                        }}
                      />
                    </div>
                    <span className="lbl">{item.month}</span>
                  </div>
                )
              })}
            </div>
          </div>

        {selectedMonth && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: 'var(--paper)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.84rem',
            }}
          >
            <span>
              Selected Month: <b>{selectedMonth.month} {selectedMonth.year || fyStartYear}</b>
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink)' }}>
              Realized Revenue: {inr(selectedMonth.amount)}
            </span>
          </div>
        )}
      </div>

      {/* Recent Invoices Table */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Recent Commercial Invoices &amp; Settlements</h3>
            <p className="panel-subtitle">Authenticated transactions from your business orders ledger</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="datatable">
            <thead>
              <tr>
                <th>Invoice / Order</th>
                <th>Client Account</th>
                <th>Billing Date</th>
                <th>Payment Status</th>
                <th className="num">Invoice Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px 14px', color: 'var(--slate)' }}>
                    No commercial orders or invoices found in your ledger.
                  </td>
                </tr>
              ) : (
                recentInvoices.map((ord) => (
                  <tr key={ord.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{ord.id}</td>
                    <td>
                      <b>{ord.company || ord.customer}</b>
                      {ord.item && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>{ord.item}</div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', color: 'var(--slate)' }}>
                      {ord.date}
                    </td>
                    <td>
                      <span
                        className={`tag ${
                          ord.status === 'Delivered'
                            ? 'ok'
                            : ord.status === 'Cancelled'
                            ? 'risk'
                            : ord.status === 'Processing'
                            ? 'prog'
                            : 'wait'
                        }`}
                      >
                        {ord.status === 'Delivered' ? 'Settled' : ord.status}
                      </span>
                    </td>
                    <td className="num">{inr(ord.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
