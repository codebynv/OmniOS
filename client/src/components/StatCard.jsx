import './StatCard.css'

/**
 * Reusable Metric KPI Card Component.
 * Demonstrates Syllabus Unit IV-B: Props destructuring and read-only props.
 *
 * @param {Object} props
 * @param {string} props.title - Title label
 * @param {string|number} props.value - Primary metric value
 * @param {string} [props.change] - Percentage or delta text (e.g., '+12%')
 * @param {'up'|'down'|'neutral'} [props.trend='neutral'] - Trend indicator
 * @param {string} [props.icon] - Emoji or icon symbol
 */
export default function StatCard({ title, value, change, trend = 'neutral', icon }) {
  const trendClass = trend === 'up' ? 'stat-trend-up' : trend === 'down' ? 'stat-trend-down' : 'stat-trend-neutral'

  return (
    <article className="stat-card">
      <header className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {icon && <div className="stat-card-icon" aria-hidden="true">{icon}</div>}
      </header>
      <div className="stat-card-value">{value}</div>
      {change && (
        <footer className="stat-card-footer">
          <span className={trendClass}>{trend === 'up' ? '▲' : trend === 'down' ? '▼' : '●'} {change}</span>
          <span>vs last month</span>
        </footer>
      )}
    </article>
  )
}
