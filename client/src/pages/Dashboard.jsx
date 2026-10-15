import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  WEEKLY_SALES, RECENT_ACTIVITY, DEMO_ORDERS, INITIAL_TASKS, TEAM_MEMBERS, inr
} from '../data/demoData'

/**
 * Dashboard — KPIs, weekly sales bar chart, recent activity, insights panel.
 * All data is demo — clearly labelled. Customers count links to live MySQL page.
 */
export default function Dashboard() {
  const pendingTasks = INITIAL_TASKS.filter(t => t.status === 'todo').length
  const overdueTasks = INITIAL_TASKS.filter(t => t.priority === 'High' && t.status === 'todo').length
  const onlineTeam = TEAM_MEMBERS.filter(m => m.status === 'online').length

  const maxBar = Math.max(...WEEKLY_SALES.map(d => d.amount))

  const { owner } = useAuth()

  return (
    <div className="page-view">
      {/* Workspace Welcome Banner */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink)' }}>
            Welcome back, {owner?.name || 'Owner'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>
            Sharma Office Supplies &bull; Ahmedabad, Gujarat &bull; Active business operations
          </p>
        </div>
        <span className="tag demo">Demo Workspace &bull; FY 2026-27</span>
      </div>

      {/* KPI Row */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="lbl">Total Sales (MTD)</div>
          <div className="val money">{inr(482500)}</div>
          <div className="delta up">
            <span>▲ 12.4%</span>
            <span style={{ color: 'var(--slate)' }}>vs last month</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="lbl">Pending Tasks</div>
          <div className="val">{pendingTasks}</div>
          <div className="delta down">
            <span>▼ {overdueTasks} overdue</span>
            <span style={{ color: 'var(--slate)' }}>action needed</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="lbl">Active Customers</div>
          <div className="val">12</div>
          <div className="delta neutral">
            <span style={{ color: 'var(--slate)' }}>12 demo records · MySQL-backed</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="lbl">Team Members</div>
          <div className="val">{TEAM_MEMBERS.length}</div>
          <div className="delta neutral">
            <span>● {onlineTeam} online</span>
            <span style={{ color: 'var(--slate)' }}>active now</span>
          </div>
        </div>
      </div>

      {/* 2-col grid */}
      <div className="dash-grid-2col">
        {/* LEFT: Chart + Activity */}
        <div>
          {/* Weekly sales bar chart */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Weekly Sales Performance</h3>
                <p className="panel-subtitle">Revenue grouped by day — current week (demo data)</p>
              </div>
              <span className="tag lead">Demo Data</span>
            </div>
            <div className="chart-container">
              <div className="bar-chart-visual">
                {WEEKLY_SALES.map((d) => {
                  const pct = Math.round((d.amount / maxBar) * 100)
                  const isPeak = d.amount === maxBar
                  return (
                    <div key={d.day} className={`col${isPeak ? ' peak' : ''}`}>
                      <div
                        className="stick"
                        data-tooltip={`${d.day}: ${inr(d.amount)}`}
                        title={`${d.day}: ${inr(d.amount)}`}
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

          {/* Recent Activity */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">Recent Activity</h3>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--slate)' }}>
                Past 24 Hours
              </span>
            </div>
            <div className="activity-list">
              {RECENT_ACTIVITY.map((item, i) => (
                <div className="activity-item" key={i}>
                  <div className="activity-icon">{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p
                      className="activity-text"
                      dangerouslySetInnerHTML={{ __html: item.text }}
                    />
                    <span className="activity-time">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Insights + Quick Actions */}
        <div>
          {/* Insights panel — rule-based, clearly labelled */}
          <div className="ai-notice-panel">
            <div className="ai-notice-head">
              <span className="ai-notice-tag">✦ Business Insights</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--slate)' }}>
                Rule-based · Demo Data
              </span>
            </div>
            <ul className="ai-notice-list">
              <li className="ai-notice-item">
                <strong>3 overdue follow-ups pending</strong> — Contact Amit Desai and Sunita Mehta before today's close of business.
              </li>
              <li className="ai-notice-item">
                <strong>₹2,150 invoice overdue (ORD-9403)</strong> — Desai Tech Solutions payment term passed 3 days ago.
              </li>
              <li className="ai-notice-item">
                <strong>GST filing due in 7 days</strong> — Manaswi K. has started reconciliation. Verify before Oct 20.
              </li>
            </ul>
          </div>

          {/* Quick Operations */}
          <div className="panel">
            <h3 className="panel-title" style={{ marginBottom: '12px' }}>Quick Operations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/customers" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <span>+</span> Add New Customer
              </Link>
              <Link to="/tasks" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <span>+</span> View Task Board
              </Link>
              <Link to="/orders" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <span>📄</span> Review Pending Orders
              </Link>
              <Link to="/sales" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <span>📊</span> Monthly Sales Report
              </Link>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="panel-header">
              <h3 className="panel-title">Latest Orders</h3>
              <Link to="/orders" style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--slate)' }}>
                View all →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DEMO_ORDERS.slice(0, 4).map((o) => {
                let tagCls = 'tag wait'
                if (o.status === 'Delivered') tagCls = 'tag ok'
                if (o.status === 'Overdue')   tagCls = 'tag risk'
                if (o.status === 'Processing') tagCls = 'tag prog'
                return (
                  <div
                    key={o.id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem', paddingBottom: '8px', borderBottom: '1px solid var(--paper-dim)' }}
                  >
                    <div>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--ink)' }}>{o.id}</span>
                      <span style={{ color: 'var(--slate)', marginLeft: '8px' }}>{o.customer}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={tagCls}>{o.status}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{inr(o.amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
