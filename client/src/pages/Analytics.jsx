import { ANALYTICS_METRICS, CHANNEL_BREAKDOWN, inr } from '../data/demoData'

/**
 * Analytics & Operational Intelligence Workspace.
 * Derived business benchmarks and channel metrics for Sharma Office Supplies.
 * Clearly identified as derived demo observations without artificial AI claims.
 */
export default function Analytics() {
  return (
    <div className="page-view">
      {/* Demo Notice */}
      <div className="demo-banner-strip">
        <div>
          <strong>Operational Analytics &amp; Benchmarks</strong> &bull; Calculated from available demo records for Sharma Office Supplies.
        </div>
        <span className="tag demo">Deterministic Calculations &bull; Non-AI</span>
      </div>

      {/* 4 KPI Cards */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="lbl">Lead Conversion Rate</div>
          <div className="val">{ANALYTICS_METRICS.conversionRate}</div>
          <div className="delta up">{ANALYTICS_METRICS.conversionDelta}</div>
        </div>

        <div className="kpi-card">
          <div className="lbl">Average Deal Cycle</div>
          <div className="val">{ANALYTICS_METRICS.dealCycle}</div>
          <div className="delta up">{ANALYTICS_METRICS.dealCycleDelta}</div>
        </div>

        <div className="kpi-card">
          <div className="lbl">Client Retention Rate</div>
          <div className="val">{ANALYTICS_METRICS.retentionRate}</div>
          <div className="delta up">{ANALYTICS_METRICS.retentionDelta}</div>
        </div>

        <div className="kpi-card">
          <div className="lbl">Monthly Account Churn</div>
          <div className="val">{ANALYTICS_METRICS.monthlyChurn}</div>
          <div className="delta up">{ANALYTICS_METRICS.churnDelta}</div>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="dash-grid-2col">
        {/* Acquisition Channel Breakdown */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Client Acquisition Channel Breakdown</h3>
              <p className="panel-subtitle">Distribution of incoming client orders across channels</p>
            </div>
            <span className="tag ok">Healthy Pipeline</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
            {CHANNEL_BREAKDOWN.map((ch) => (
              <div key={ch.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{ch.label}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
                    {ch.percent}% ({inr(ch.amount)})
                  </span>
                </div>
                <div style={{ height: '8px', background: 'var(--paper-dim)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${ch.percent}%`,
                      background: ch.color,
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', padding: '14px', background: 'var(--paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-light)', fontSize: '0.82rem', color: 'var(--ink-2)', lineHeight: 1.5 }}>
            <strong>Channel Observation:</strong> Over 50% of revenue continues to originate from client referrals and repeat B2B partnerships across Gujarat. Inbound digital inquiries represent the fastest growing acquisition vector.
          </div>
        </div>

        {/* Operational Efficiency Card */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Fulfillment &amp; Ops Efficiency</h3>
              <p className="panel-subtitle">Key operational performance indicators</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px 14px', background: 'var(--paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-light)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>
                On-Time Courier Delivery
              </div>
              <div style={{ fontSize: '1.35rem', fontFamily: 'var(--display)', fontWeight: 700, color: 'var(--ink)', margin: '4px 0' }}>
                95.8%
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>
                Average fulfillment turnaround: 1.8 business days across Ahmedabad &amp; Gandhinagar.
              </p>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-light)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>
                Average Invoice Settlement Time
              </div>
              <div style={{ fontSize: '1.35rem', fontFamily: 'var(--display)', fontWeight: 700, color: 'var(--ink)', margin: '4px 0' }}>
                11.4 Days
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>
                Standard credit term: 15 days. 88% of clients settle via instant UPI or NEFT.
              </p>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-light)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>
                Average Customer LTV
              </div>
              <div style={{ fontSize: '1.35rem', fontFamily: 'var(--display)', fontWeight: 700, color: 'var(--ink)', margin: '4px 0' }}>
                {inr(142000)}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>
                Derived across 12 active corporate client accounts in stationery and workplace supplies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
