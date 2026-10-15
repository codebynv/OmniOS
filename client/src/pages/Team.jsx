import { useMemo, useState } from 'react'
import { TEAM_MEMBERS } from '../data/demoData'

/**
 * Team Workspace Directory.
 * Matches frontend/index.html team directory, extended with a practical
 * filter row (search + department + role + work status) for larger teams.
 * Displays member profiles, roles, departments, active status, and assigned tasks.
 */
export default function Team() {
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Options are derived from the dataset — never hardcoded.
  const departments = useMemo(() => [...new Set(TEAM_MEMBERS.map((m) => m.dept))], [])
  const roles = useMemo(() => [...new Set(TEAM_MEMBERS.map((m) => m.role))], [])

  const query = search.trim().toLowerCase()

  const filteredMembers = TEAM_MEMBERS.filter((m) => {
    const matchesSearch =
      !query ||
      m.name.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query)
    const matchesDept = deptFilter === 'all' || m.dept === deptFilter
    const matchesRole = roleFilter === 'all' || m.role === roleFilter
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter
    return matchesSearch && matchesDept && matchesRole && matchesStatus
  })

  const hasFilters =
    query !== '' || deptFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all'

  const resetFilters = () => {
    setSearch('')
    setDeptFilter('all')
    setRoleFilter('all')
    setStatusFilter('all')
  }

  const onlineCount = TEAM_MEMBERS.filter((m) => m.status === 'online').length

  return (
    <div className="page-view">
      {/* Overview Banner */}
      <div className="panel" style={{ padding: '18px 24px', marginBottom: '20px' }}>
        <div className="panel-header" style={{ marginBottom: 0 }}>
          <div>
            <h3 className="panel-title">Team Workspace Directory</h3>
            <p className="panel-subtitle">
              Internal roster for Sharma Office Supplies &bull; Operations, commercial, billing &amp; warehouse teams
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="tag ok">● {onlineCount} Online Now</span>
            <span className="tag lead">{TEAM_MEMBERS.length} Total Members</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="panel" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div className="filter-group">
            <div className="search-input-box">
              <input
                id="team-search"
                type="search"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search team by name or email"
              />
            </div>

            <label className="filter-label" htmlFor="team-dept-filter">Department</label>
            <select
              id="team-dept-filter"
              className="select-filter"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <label className="filter-label" htmlFor="team-role-filter">Role</label>
            <select
              id="team-role-filter"
              className="select-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <label className="filter-label" htmlFor="team-status-filter">Work Status</label>
            <select
              id="team-status-filter"
              className="select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="online">Online / Active</option>
              <option value="offline">Offline</option>
            </select>

            <button
              type="button"
              className="btn-ghost"
              id="team-reset-filters"
              onClick={resetFilters}
              disabled={!hasFilters}
            >
              Clear Filters
            </button>
          </div>

          <span className="filter-count">
            Showing {filteredMembers.length} of {TEAM_MEMBERS.length} members
          </span>
        </div>
      </div>

      {/* Team Grid */}
      {filteredMembers.length === 0 ? (
        <div className="team-empty" role="status">
          <div className="team-empty-icon" aria-hidden="true">🔍</div>
          <h3>No team members match these filters</h3>
          <p>Try a different name or email, or relax the department, role and status filters.</p>
          <button type="button" className="btn-secondary" onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="team-grid">
          {filteredMembers.map((member) => (
            <article key={member.email} className="team-card">
              <div className="team-card-head">
                <div className="team-avatar-lg">
                  {member.initials}
                  <span
                    className={`team-status-dot ${member.status}`}
                    title={member.status === 'online' ? 'Online' : 'Offline'}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 className="team-card-name">{member.name}</h4>
                  <p className="team-card-role">{member.role}</p>
                  <span className="tag lead" style={{ marginTop: '4px', fontSize: '0.68rem' }}>
                    {member.dept}
                  </span>
                </div>
              </div>

              <div className="team-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate)' }}>Assigned Tasks:</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{member.tasks} tasks</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate)' }}>Email:</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{member.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate)' }}>Phone:</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{member.phone}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
