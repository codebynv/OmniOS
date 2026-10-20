import { useState, useEffect, useCallback } from 'react'
import { inr } from '../data/demoData'
import { analyticsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

/**
 * Analytics & Operational Intelligence Workspace.
 * Database-backed business performance benchmarks and status distribution.
 * Derived strictly from verified MySQL records with business isolation.
 */
export default function Analytics() {
  const { user, owner } = useAuth()
  const currentUser = user || owner
  const isOwner = currentUser?.role === 'owner'

  const [range, setRange] = useState('all')
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setApiError('')
      const res = await analyticsApi.getSummary({ range })
      if (res && res.data) {
        setAnalyticsData(res.data)
      } else {
        setAnalyticsData(null)
      }
    } catch (err) {
      setApiError(err.message || 'Failed to load business analytics.')
      setAnalyticsData(null)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const kpis = analyticsData?.kpis || {}
  const statusBreakdown = analyticsData?.status_breakdown || []
  const benchmarks = analyticsData?.benchmarks || {}
  const businessName = analyticsData?.business?.name || currentUser?.business_name || 'Business Workspace'

  if (loading) {
    return (
      <div className="page-view">
        <div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--slate)' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>📈</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Computing operational analytics from database...</div>
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
          <button type="button" className="btn-secondary" onClick={fetchAnalytics}>
            Retry Loading Analytics
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-view">
      {/* Analytics Welcome & Range Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink)' }}>
            Operational Analytics &amp; Benchmarks
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>
            {businessName} &bull; Deterministic MySQL Calculations &bull; Non-AI
          </p>
        </div>

        {/* Date Range Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--slate)', fontWeight: 500 }}>Timeframe:</span>
          <select
            className="select-filter"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={{ padding: '5px 10px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}
            aria-label="Filter analytics by timeframe"
          >
            <option value="all">All Time</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="year">Current Year</option>
          </select>
          <span className="tag lead">{isOwner ? 'Owner View' : 'Team View'}</span>
        </div>
      </div>

      {/* 4 KPI Cards — Role-Aware */}
      {isOwner ? (
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="lbl">Order Fulfillment Rate</div>
            <div className="val">{kpis.fulfillment_rate?.value || '0.0%'}</div>
            <div className={`delta ${kpis.fulfillment_rate?.trend || 'neutral'}`}>
              {kpis.fulfillment_rate?.delta || 'No orders'}
            </div>
          </div>

          <div className="kpi-card">
            <div className="lbl">Task Completion Rate</div>
            <div className="val">{kpis.task_completion_rate?.value || '0.0%'}</div>
            <div className={`delta ${kpis.task_completion_rate?.trend || 'neutral'}`}>
              {kpis.task_completion_rate?.delta || 'No tasks'}
            </div>
          </div>

          <div className="kpi-card">
            <div className="lbl">Realized Client LTV</div>
            <div className="val money">{inr(kpis.avg_customer_ltv?.value || 0)}</div>
            <div className={`delta ${kpis.avg_customer_ltv?.trend || 'neutral'}`}>
              {kpis.avg_customer_ltv?.delta || 'Zero revenue history'}
            </div>
          </div>

          <div className="kpi-card">
            <div className="lbl">Pending Receivables Ratio</div>
            <div className="val">{kpis.receivables_ratio?.value || '0.0%'}</div>
            <div className={`delta ${kpis.receivables_ratio?.trend || 'neutral'}`}>
              {kpis.receivables_ratio?.delta || 'Zero outstanding'}
            </div>
          </div>
        </div>
      ) : (
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="lbl">My Completion Rate</div>
            <div className="val">{kpis.personal_completion_rate?.value || '0.0%'}</div>
            <div className={`delta ${kpis.personal_completion_rate?.trend || 'neutral'}`}>
              {kpis.personal_completion_rate?.delta || 'No assigned tasks'}
            </div>
          </div>

          <div className="kpi-card">
            <div className="lbl">Active Task Queue</div>
            <div className="val">{kpis.pending_tasks?.value || '0'}</div>
            <div className={`delta ${kpis.pending_tasks?.trend || 'neutral'}`}>
              {kpis.pending_tasks?.delta || 'Queue clear'}
            </div>
          </div>

          <div className="kpi-card">
            <div className="lbl">Completed Milestones</div>
            <div className="val">{kpis.completed_milestones?.value || '0'}</div>
            <div className="delta up">
              {kpis.completed_milestones?.delta || 'Finished tasks'}
            </div>
          </div>

          <div className="kpi-card">
            <div className="lbl">Total Assigned</div>
            <div className="val">{kpis.total_assigned?.value || '0'}</div>
            <div className="delta neutral">
              {kpis.total_assigned?.delta || 'Assigned to your profile'}
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Grid */}
      <div className="dash-grid-2col">
        {/* LEFT COLUMN: Status Distribution */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">
                {isOwner ? 'Commercial Order Fulfillment Distribution' : 'Personal Task Progress Breakdown'}
              </h3>
              <p className="panel-subtitle">
                {isOwner
                  ? 'Real-time volume and revenue breakdown across fulfillment statuses'
                  : 'Distribution of your assigned tasks across workflow states'}
              </p>
            </div>
            <span className="tag ok">Live Database</span>
          </div>

          {statusBreakdown.length === 0 || statusBreakdown.every((s) => s.count === 0) ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--slate)' }}>
              No {isOwner ? 'order' : 'task'} records found for the selected timeframe.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
              {statusBreakdown.map((item) => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 500, color: 'var(--ink)' }}>
                      {item.label} &bull; {item.count} {item.count === 1 ? 'item' : 'items'}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
                      {item.percent}% {item.amount !== undefined ? `(${inr(item.amount)})` : ''}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--paper-dim)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${item.percent}%`,
                        background: item.color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: '24px',
              padding: '14px',
              background: 'var(--paper)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-light)',
              fontSize: '0.82rem',
              color: 'var(--ink-2)',
              lineHeight: 1.5,
            }}
          >
            <strong>Operational Observation:</strong>{' '}
            {isOwner ? (
              kpis.fulfillment_rate?.rate > 50
                ? 'Healthy fulfillment velocity. Over 50% of registered commercial orders have been successfully delivered and settled.'
                : 'Fulfillment pipeline active. Monitor pending and processing orders to accelerate delivery turnaround.'
            ) : (
              'Task progress tracked directly from your assigned board milestones.'
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Operational Benchmarks */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Fulfillment &amp; Ops Efficiency</h3>
              <p className="panel-subtitle">Key operational performance indicators derived from records</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.keys(benchmarks).map((key) => {
              const b = benchmarks[key]
              const displayVal = typeof b.value === 'number' ? inr(b.value) : b.value
              return (
                <div
                  key={key}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--paper)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--line-light)',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>
                    {b.label}
                  </div>
                  <div style={{ fontSize: '1.35rem', fontFamily: 'var(--display)', fontWeight: 700, color: 'var(--ink)', margin: '4px 0' }}>
                    {displayVal}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--slate)', margin: 0 }}>
                    {b.note}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
