import { useState } from 'react'
import { MONTHLY_SALES, DEMO_ORDERS, inr } from '../data/demoData'

/**
 * Sales & Revenue Workspace.
 * Monthly revenue performance, Indian Rupee metrics, and invoice ledger.
 * All amounts formatted in INR using the Indian numbering system.
 */
export default function Sales() {
  const [selectedMonth, setSelectedMonth] = useState(null)

  const maxMonthly = Math.max(...MONTHLY_SALES.map((m) => m.amount))
  const ytdTotal = MONTHLY_SALES.reduce((sum, m) => sum + m.amount, 0)

  return (
    <div className="page-view">
      {/* Demo Notice */}
      <div className="demo-banner-strip">
        <div>
          <strong>Financial &amp; Revenue Overview</strong> &bull; Commercial demo ledger for Sharma Office Supplies, Ahmedabad (FY 2026-27).
        </div>
        <span className="tag demo">Demo Revenue Modeling</span>
      </div>

      {/* 4 KPI Cards */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="lbl">Annual Revenue (YTD)</div>
          <div className="val money">{inr(ytdTotal)}</div>
          <div className="delta up">▲ +18.2% vs target</div>
        </div>

        <div className="kpi-card">
          <div className="lbl">Avg Order Value</div>
          <div className="val money">{inr(24800)}</div>
          <div className="delta up">▲ +4.1%</div>
        </div>

        <div className="kpi-card">
          <div className="lbl">Collected This Month</div>
          <div className="val money">{inr(482500)}</div>
          <div className="delta up">▲ 92% of monthly goal</div>
        </div>

        <div className="kpi-card">
          <div className="lbl">Pending Invoices</div>
          <div className="val money">{inr(15450)}</div>
          <div className="delta down">▼ 2 overdue accounts</div>
        </div>
      </div>

      {/* Monthly Revenue Bar Chart Panel */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Monthly Revenue Performance (Jan – Oct 2026)</h3>
            <p className="panel-subtitle">Revenue grouped by month in Indian Rupees (₹)</p>
          </div>
          <span className="tag lead">FY 2026-27</span>
        </div>

        <div className="chart-container" style={{ padding: '16px 0 8px' }}>
          <div className="bar-chart-visual" style={{ height: '180px' }}>
            {MONTHLY_SALES.map((item) => {
              const pct = Math.round((item.amount / maxMonthly) * 100)
              const isPeak = item.amount === maxMonthly
              const isSelected = selectedMonth?.month === item.month

              return (
                <div
                  key={item.month}
                  className={`col${isPeak ? ' peak' : ''}`}
                  onClick={() => setSelectedMonth(item)}
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    className="stick"
                    data-tooltip={`${item.month}: ${inr(item.amount)}`}
                    title={`${item.month}: ${inr(item.amount)}`}
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
              Selected Month: <b>{selectedMonth.month} 2026</b>
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink)' }}>
              Revenue: {inr(selectedMonth.amount)}
            </span>
          </div>
        )}
      </div>

      {/* Recent Invoices Table */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Recent Commercial Invoices &amp; Settlements</h3>
            <p className="panel-subtitle">B2B client invoices generated across stationery and equipment contracts</p>
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
              {DEMO_ORDERS.map((ord) => (
                <tr key={ord.id}>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{ord.id}</td>
                  <td>
                    <b>{ord.company || ord.customer}</b>
                    <div style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>{ord.item}</div>
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', color: 'var(--slate)' }}>
                    {ord.date}
                  </td>
                  <td>
                    <span
                      className={`tag ${
                        ord.status === 'Delivered'
                          ? 'ok'
                          : ord.status === 'Overdue'
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
