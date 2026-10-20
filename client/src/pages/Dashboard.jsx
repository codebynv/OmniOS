import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { inr } from '../data/demoData'
import { dashboardApi } from '../services/api'

/**
 * Dashboard — Fully Database-Driven Business Operations Workspace.
 * Real-time KPIs, weekly sales chart, recent updates, and rule-based insights.
 * All figures derived exclusively from verified MySQL records with business isolation.
 */
export default function Dashboard() {
  const { user, owner } = useAuth()
  const currentUser = user || owner
  const isOwner = currentUser?.role === 'owner'

  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setApiError('')
      const res = await dashboardApi.getSummary()
      if (res && res.data) {
        setDashboardData(res.data)
      } else {
        setDashboardData(null)
      }
    } catch (err) {
      setApiError(err.message || 'Failed to load dashboard metrics from database.')
      setDashboardData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const kpis = dashboardData?.kpis || {}
  const weeklySales = dashboardData?.weekly_sales || []
  const recentOrders = dashboardData?.recent_orders || []
  const recentUpdates = dashboardData?.recent_updates || []
  const insights = dashboardData?.insights || []
  const myTasks = dashboardData?.my_tasks || []

  const maxBar = Math.max(...weeklySales.map((d) => d.amount), 0)
  const businessName = dashboardData?.business?.name || currentUser?.business_name || 'Business Workspace'
  const userName = currentUser?.name || (isOwner ? 'Owner' : 'Team Member')
  const currentYear = new Date().getFullYear()
  const fyLabel = `FY ${currentYear}-${String(currentYear + 1).slice(-2)}`

  if (loading) {
    return (
      <div className="page-view">
        <div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--slate)' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>📊</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Loading business operations dashboard...</div>
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
          <button type="button" className="btn-secondary" onClick={fetchDashboard}>
            Retry Loading Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-view">
      {/* Workspace Welcome Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '18px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink)' }}>
            Welcome back, {userName}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>
            {businessName} &bull; Verified MySQL Data &bull; Active business operations
          </p>
        </div>
        <span className="tag lead">{isOwner ? 'Owner Workspace' : 'Team Workspace'} &bull; {fyLabel}</span>
      </div>

      {/* KPI Row — Role-Aware */}
      {isOwner ? (
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="lbl">Total Sales (MTD)</div>
            <div className="val money">{inr(kpis.sales_mtd || 0)}</div>
            <div className="delta up">
              <span style={{ color: kpis.sales_mtd > 0 ? 'var(--signal)' : 'var(--slate)' }}>
                {kpis.sales_mtd > 0 ? '● Realized Delivered Revenue' : '○ No delivered sales this month'}
              </span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="lbl">Pending Tasks</div>
            <div className="val">{kpis.pending_tasks ?? 0}</div>
            <div className="delta down">
              <span style={{ color: kpis.high_priority_tasks > 0 ? 'var(--danger)' : 'var(--slate)' }}>
                {kpis.high_priority_tasks > 0
                  ? `▼ ${kpis.high_priority_tasks} high priority`
                  : 'No high-priority backlog'}
              </span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="lbl">Active Customers</div>
            <div className="val">{kpis.total_customers ?? 0}</div>
            <div className="delta neutral">
              <span style={{ color: 'var(--slate)' }}>Database-backed customer directory</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="lbl">Team Members</div>
            <div className="val">{kpis.team_members_count ?? 0}</div>
            <div className="delta neutral">
              <span style={{ color: 'var(--slate)' }}>
                {kpis.team_members_count > 0 ? `${kpis.team_members_count} active accounts` : 'Zero registered members'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="lbl">My Active Tasks</div>
            <div className="val">{kpis.pending_tasks ?? 0}</div>
            <div className="delta down">
              <span style={{ color: kpis.high_priority_tasks > 0 ? 'var(--danger)' : 'var(--slate)' }}>
                {kpis.high_priority_tasks > 0
                  ? `▼ ${kpis.high_priority_tasks} high priority`
                  : 'No urgent items'}
              </span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="lbl">Completed Tasks</div>
            <div className="val">{kpis.completed_tasks ?? 0}</div>
            <div className="delta up">
              <span style={{ color: 'var(--signal)' }}>● Finished milestones</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="lbl">In Progress</div>
            <div className="val">{kpis.in_progress_tasks ?? 0}</div>
            <div className="delta neutral">
              <span style={{ color: 'var(--slate)' }}>Currently underway</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="lbl">Total Assigned</div>
            <div className="val">{kpis.total_tasks ?? 0}</div>
            <div className="delta neutral">
              <span style={{ color: 'var(--slate)' }}>Assigned to your profile</span>
            </div>
          </div>
        </div>
      )}

      {/* 2-col grid */}
      <div className="dash-grid-2col">
        {/* LEFT COLUMN */}
        <div>
          {/* Weekly sales bar chart (Owner only) */}
          {isOwner && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Weekly Sales Performance</h3>
                  <p className="panel-subtitle">Delivered revenue grouped by day — Current week</p>
                </div>
                <span className="tag lead">Real-time</span>
              </div>
              {maxBar === 0 && (
                <div style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--slate)', fontSize: '0.82rem', background: 'var(--paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-light)', marginBottom: '12px' }}>
                  No delivered sales recorded for the current week.
                  <br />
                  <span style={{ fontSize: '0.75rem' }}>Commercial orders marked as <strong>Delivered</strong> will automatically appear in this chart.</span>
                </div>
              )}
              <div className="chart-container">
                <div className="bar-chart-visual">
                  {weeklySales.map((d) => {
                    const pct = maxBar > 0 ? Math.round((d.amount / maxBar) * 100) : 0
                    const isPeak = maxBar > 0 && d.amount === maxBar
                    return (
                      <div key={d.day} className={`col${isPeak ? ' peak' : ''}`}>
                        <div
                          className="stick"
                          data-tooltip={`${d.day} (${d.date}): ${inr(d.amount)}`}
                          title={`${d.day} (${d.date}): ${inr(d.amount)}`}
                        >
                          <div className="fill" style={{ height: `${pct}%` }} />
                        </div>
                        <span className="lbl">{d.day}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Team Member Task Queue (Team Member only) */}
          {!isOwner && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">My Current Task Queue</h3>
                  <p className="panel-subtitle">Tasks assigned to you on the business board</p>
                </div>
                <Link to="/tasks" style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--slate)' }}>
                  Open Kanban →
                </Link>
              </div>
              {myTasks.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--slate)' }}>
                  No tasks currently assigned to your account.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {myTasks.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.84rem',
                        paddingBottom: '8px',
                        borderBottom: '1px solid var(--paper-dim)',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{t.title}</span>
                        {t.due_date && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--slate)', marginLeft: '8px' }}>
                            Due: {t.due_date}
                          </span>
                        )}
                      </div>
                      <span className={`tag ${t.status === 'done' ? 'ok' : t.status === 'in-progress' ? 'prog' : 'wait'}`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent Updates (Aggregated from real order & task timestamps) */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">Recent Updates</h3>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--slate)' }}>
                Database Records
              </span>
            </div>
            <div className="activity-list">
              {recentUpdates.length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--slate)', fontSize: '0.86rem' }}>
                  No recent order or task activity recorded in your workspace yet.
                </div>
              ) : (
                recentUpdates.map((item, i) => (
                  <div className="activity-item" key={i}>
                    <div className="activity-icon">{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <p className="activity-text" dangerouslySetInnerHTML={{ __html: item.text }} />
                      <span className="activity-time">{item.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Insights panel — Rule-based derived from real records */}
          <div className="ai-notice-panel">
            <div className="ai-notice-head">
              <span className="ai-notice-tag">✦ Business Insights</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--slate)' }}>
                Rule-based &bull; Live MySQL
              </span>
            </div>
            <ul className="ai-notice-list">
              {insights.length === 0 ? (
                <li className="ai-notice-item" style={{ color: 'var(--slate)' }}>
                  No urgent operational alerts or pending bottlenecks for your workspace.
                </li>
              ) : (
                insights.map((ins, i) => (
                  <li className="ai-notice-item" key={i}>
                    <strong>{ins.title}</strong> — {ins.text}
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Quick Operations — Role-Aware */}
          <div className="panel">
            <h3 className="panel-title" style={{ marginBottom: '12px' }}>Quick Operations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/customers" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <span>👥</span> View Customer Directory
              </Link>
              <Link to="/tasks" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <span>📋</span> View Task Board
              </Link>
              <Link to="/orders" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <span>📦</span> Review Commercial Orders
              </Link>
              {isOwner && (
                <Link to="/sales" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                  <span>📊</span> Monthly Sales Report
                </Link>
              )}
            </div>
          </div>

          {/* Latest Orders (Owner only) */}
          {isOwner && (
            <div className="panel" style={{ marginBottom: 0 }}>
              <div className="panel-header">
                <h3 className="panel-title">Latest Orders</h3>
                <Link to="/orders" style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--slate)' }}>
                  View all →
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentOrders.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--slate)', fontSize: '0.86rem' }}>
                    No commercial orders found in your ledger.
                  </div>
                ) : (
                  recentOrders.map((o) => {
                    let tagCls = 'tag wait'
                    if (o.status === 'Delivered') tagCls = 'tag ok'
                    if (o.status === 'Cancelled') tagCls = 'tag risk'
                    if (o.status === 'Processing') tagCls = 'tag prog'
                    return (
                      <div
                        key={o.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.84rem',
                          paddingBottom: '8px',
                          borderBottom: '1px solid var(--paper-dim)',
                        }}
                      >
                        <div>
                          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--ink)' }}>
                            {o.id}
                          </span>
                          <span style={{ color: 'var(--slate)', marginLeft: '8px' }}>
                            {o.company || o.customer}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={tagCls}>{o.status}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
                            {inr(o.amount)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
