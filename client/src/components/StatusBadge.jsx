import './StatusBadge.css'

/**
 * Reusable Status Badge Component.
 * Demonstrates Syllabus Unit IV-B (Props) & Unit IV-E (Conditional Rendering).
 *
 * @param {Object} props
 * @param {string} [props.status='active'] - Status string ('active', 'lead', 'inactive', etc.)
 */
export default function StatusBadge({ status = 'active' }) {
  const normalized = status ? status.toLowerCase().replace(/\s+/g, '_') : 'active'
  const label = status ? status.replace(/_/g, ' ') : 'Active'

  return (
    <span className={`status-badge ${normalized}`}>
      <span className="status-badge-dot" aria-hidden="true"></span>
      {label}
    </span>
  )
}
