import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { tasksApi, teamApi } from '../services/api'
import './Tasks.css'

const COLUMNS = [
  {
    key: 'todo',
    title: 'To Do',
    empty: 'No tasks in this column.',
    actions: [{ label: 'Start Task', next: 'in-progress', variant: 'btn-ghost' }],
  },
  {
    key: 'in-progress',
    title: 'In Progress',
    empty: 'No tasks in progress.',
    actions: [
      { label: 'Back to To Do', next: 'todo', variant: 'btn-ghost' },
      { label: 'Mark Complete', next: 'done', variant: 'btn-secondary' },
    ],
  },
  {
    key: 'done',
    title: 'Done',
    empty: 'No completed tasks yet.',
    actions: [{ label: 'Reopen Task', next: 'in-progress', variant: 'btn-ghost' }],
  },
]

const STATUS_LABEL = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'done': 'Done',
}

const priorityClass = (priority) =>
  priority === 'High' ? 'risk' : priority === 'Medium' ? 'wait' : 'lead'

export default function Tasks() {
  const { user, owner } = useAuth()
  const { refreshNotifications } = useNotifications()
  const currentUser = user || owner
  const isOwner = currentUser?.role === 'owner'

  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [feedback, setFeedback] = useState(null)

  // Filters
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Drag and drop state
  const [draggingId, setDraggingId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  const [newTask, setNewTask] = useState({
    title: '',
    desc: '',
    priority: 'Medium',
    assigned_to: '',
    dueDate: 'Tomorrow',
    startDate: '',
  })

  // Feedback toast helper
  const report = (type, message) => {
    setFeedback({ type, message })
    window.setTimeout(() => setFeedback(null), 3500)
  }

  // Load tasks from real MySQL database
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setApiError('')
    try {
      const res = await tasksApi.getAll()
      if (res?.success) {
        setTasks(res.data || [])
      } else {
        setApiError(res?.error || 'Failed to load tasks.')
      }
    } catch (err) {
      setApiError(err.message || 'Failed to connect to tasks API.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Load team members for task assignment (Owner only)
  const loadTeamMembers = useCallback(async () => {
    if (!isOwner) return
    setLoadingTeam(true)
    try {
      const res = await teamApi.getAll()
      if (res?.success) {
        const activeMembers = (res.data || []).filter((m) => m.status === 'active')
        setTeamMembers(activeMembers)
        if (activeMembers.length > 0 && !newTask.assigned_to) {
          setNewTask((prev) => ({ ...prev, assigned_to: String(activeMembers[0].id) }))
        }
      }
    } catch {
      // Non-critical: modal handles empty team
    } finally {
      setLoadingTeam(false)
    }
  }, [isOwner, newTask.assigned_to])

  const openCreateModal = () => {
    if (!isOwner) return
    loadTeamMembers()
    setModalError('')
    setShowAddModal(true)
  }

  // Move task status with optimistic UI update and server persistence
  const moveTask = async (taskId, newStatus) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) {
      report('fail', `Task #${taskId} could not be found.`)
      return
    }
    if (task.status === newStatus) {
      report('fail', `${task.task_code || 'Task'} is already in ${STATUS_LABEL[newStatus]}.`)
      return
    }

    const previousTasks = [...tasks]
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )

    try {
      const res = await tasksApi.updateStatus(taskId, newStatus)
      if (res?.success) {
        report('ok', `${task.task_code || 'Task'} moved to ${STATUS_LABEL[newStatus]}.`)
        // Update with full persisted object
        if (res.data) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)))
        }
        refreshNotifications()
      } else {
        // Rollback
        setTasks(previousTasks)
        report('fail', res?.error || 'Failed to update task status on server.')
      }
    } catch (err) {
      // Rollback
      setTasks(previousTasks)
      report('fail', err.message || 'Network error updating task status.')
    }
  }

  const handleDrop = (status) => {
    if (draggingId) moveTask(draggingId, status)
    setDraggingId(null)
    setDropTarget(null)
  }

  // Delete task (Owner only)
  const handleDeleteTask = async (taskId, taskCode) => {
    if (!isOwner) return
    if (!window.confirm(`Delete ${taskCode || 'this task'} permanently?`)) return

    const previousTasks = [...tasks]
    setTasks((prev) => prev.filter((t) => t.id !== taskId))

    try {
      const res = await tasksApi.delete(taskId)
      if (res?.success) {
        report('ok', `${taskCode || 'Task'} deleted successfully.`)
      } else {
        setTasks(previousTasks)
        report('fail', res?.error || 'Failed to delete task.')
      }
    } catch (err) {
      setTasks(previousTasks)
      report('fail', err.message || 'Error deleting task.')
    }
  }

  // Handle task creation
  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!newTask.title.trim()) {
      setModalError('Task title is required.')
      return
    }
    if (!newTask.assigned_to) {
      setModalError('Please select a Team Member to assign this task to.')
      return
    }

    setSubmitting(true)
    setModalError('')

    try {
      const payload = {
        title: newTask.title.trim(),
        description: newTask.desc.trim(),
        priority: newTask.priority,
        assigned_to: Number(newTask.assigned_to),
        due_date: newTask.dueDate.trim(),
        start_date: newTask.startDate.trim(),
      }

      const res = await tasksApi.create(payload)
      if (res?.success && res.data) {
        setTasks((prev) => [...prev, res.data])
        report('ok', `${res.data.task_code || 'Task'} created in To Do.`)
        refreshNotifications()
        setNewTask({
          title: '',
          desc: '',
          priority: 'Medium',
          assigned_to: teamMembers[0]?.id ? String(teamMembers[0].id) : '',
          dueDate: 'Tomorrow',
          startDate: '',
        })
        setShowAddModal(false)
      } else {
        setModalError(res?.error || 'Failed to create task.')
      }
    } catch (err) {
      setModalError(err.message || 'Failed to connect to server.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtering
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesPriority =
        priorityFilter === 'all' ||
        t.priority.toLowerCase() === priorityFilter.toLowerCase()
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.desc && t.desc.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assignee && t.assignee.toLowerCase().includes(q))
      return matchesPriority && matchesSearch
    })
  }, [tasks, priorityFilter, search])

  const tasksFor = (status) => filteredTasks.filter((t) => t.status === status)

  return (
    <div className="page-view">
      {/* Real-time Status Banner */}
      <div className="demo-banner-strip" style={{ background: '#f8fafc', borderColor: '#e2e8f0', color: '#1e293b' }}>
        <div>
          <strong>Database-Backed Kanban Board</strong> &bull; Changes persist directly in MySQL.
          {isOwner
            ? ' As an Owner, you can create, assign, and manage all workflow tasks for your business.'
            : ' You are viewing tasks specifically assigned to your team account.'}
        </div>
        <span className="tag ok" style={{ fontSize: '0.72rem' }}>
          ● Live MySQL Database
        </span>
      </div>

      {/* Global Error Banner */}
      {apiError && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid rgba(220, 38, 38, 0.3)',
          color: '#b91c1c',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.88rem'
        }}>
          <span>⚠️ {apiError}</span>
          <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={fetchTasks}>
            Retry
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="panel" style={{ padding: '16px 20px', marginBottom: '18px' }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div className="filter-group">
            <div className="search-input-box">
              <input
                type="text"
                placeholder="Search tasks, descriptions, assignees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search tasks"
              />
            </div>

            <select
              className="select-filter"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter tasks by priority"
            >
              <option value="all">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="filter-count">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </span>
            {isOwner && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={openCreateModal}
                id="btn-add-task"
              >
                + Add Task
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      <div className="task-feedback-slot" role="status" aria-live="polite">
        {feedback && (
          <div className={`alert-strip ${feedback.type === 'ok' ? 'ok' : 'fail'}`}>
            {feedback.type === 'ok' ? '✓ ' : '! '}
            {feedback.message}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--slate)' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '3px solid #e2e8f0',
            borderTopColor: 'var(--ink)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px'
          }} />
          <p>Loading persistent tasks from MySQL...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : tasks.length === 0 ? (
        <div className="panel" style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--white)' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '12px' }}>📋</div>
          <h3 style={{ margin: '0 0 6px', color: 'var(--ink)', fontSize: '1.15rem' }}>
            {isOwner ? 'No tasks created yet' : 'No tasks assigned to you'}
          </h3>
          <p style={{ margin: '0 0 16px', color: 'var(--slate)', fontSize: '0.88rem' }}>
            {isOwner
              ? 'Start by creating your first task and assigning it to an active team member.'
              : 'Tasks assigned to your account by your business owner will appear here.'}
          </p>
          {isOwner && (
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
              + Add First Task
            </button>
          )}
        </div>
      ) : (
        /* Kanban Columns */
        <div className="kanban-board">
          {COLUMNS.map((column) => {
            const columnTasks = tasksFor(column.key)
            return (
              <div
                key={column.key}
                className={`kanban-column${dropTarget === column.key ? ' drop-target' : ''}`}
                onDragOver={(e) => {
                  if (!draggingId) return
                  e.preventDefault()
                  setDropTarget(column.key)
                }}
                onDragLeave={() => setDropTarget((cur) => (cur === column.key ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault()
                  handleDrop(column.key)
                }}
              >
                <div className="kanban-col-head">
                  <span className="kanban-col-title">
                    <span>{column.title}</span>
                  </span>
                  <span className="kanban-count">{columnTasks.length}</span>
                </div>

                <div className="kanban-cards-wrap">
                  {columnTasks.length === 0 ? (
                    <p className="kanban-empty">{column.empty}</p>
                  ) : (
                    columnTasks.map((t) => (
                      <article
                        key={t.id}
                        className={`kanban-card${t.status === 'done' ? ' is-done' : ''}${
                          draggingId === t.id ? ' dragging' : ''
                        }`}
                        draggable
                        onDragStart={(e) => {
                          setDraggingId(t.id)
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', String(t.id))
                        }}
                        onDragEnd={() => {
                          setDraggingId(null)
                          setDropTarget(null)
                        }}
                      >
                        <div className="kanban-card-top">
                          <span className="kanban-card-id">{t.task_code || `TASK-${t.id}`}</span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {t.status === 'done' ? (
                              <span className="tag ok">Completed</span>
                            ) : (
                              <span className={`tag ${priorityClass(t.priority)}`}>{t.priority}</span>
                            )}
                            {isOwner && (
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ padding: '2px 5px', fontSize: '0.75rem', color: 'var(--danger)' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteTask(t.id, t.task_code)
                                }}
                                title="Delete task"
                                aria-label={`Delete task ${t.title}`}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className={`kanban-card-title${t.status === 'done' ? ' struck' : ''}`}>
                          {t.title}
                        </h4>

                        {(t.desc || t.description) && (
                          <p className="kanban-card-desc">{t.desc || t.description}</p>
                        )}

                        <div className="kanban-card-meta">
                          <div className="kanban-assignee">
                            <span className="kanban-avatar">{t.initials || 'TM'}</span>
                            <span title={t.assignee_email || ''}>{t.assignee || 'Assigned'}</span>
                          </div>
                          <span>
                            {t.startDate || t.start_date ? (
                              <>
                                {t.startDate || t.start_date} → {t.dueDate || t.due_date || '—'}
                              </>
                            ) : (
                              t.dueDate || t.due_date || '—'
                            )}
                          </span>
                        </div>

                        <div className="kanban-actions-row">
                          {column.actions.map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              className={`btn ${action.variant} btn-sm kanban-action`}
                              onClick={() => moveTask(t.id, action.next)}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Task Modal (Owner only) */}
      {showAddModal && isOwner && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-task-modal-title">
          <div className="modal-box">
            <div className="modal-head">
              <h3 className="modal-title" id="add-task-modal-title">Create Follow-up Task</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                {modalError && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid rgba(220, 38, 38, 0.3)',
                    color: '#b91c1c',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '14px',
                    fontSize: '0.84rem'
                  }}>
                    ⚠️ {modalError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="task-title-input">
                    Task Title <span className="req">*</span>
                  </label>
                  <input
                    id="task-title-input"
                    type="text"
                    className="form-input-field"
                    placeholder="e.g. Call back Amit Desai for payment"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="task-desc-input">Description / Instructions</label>
                  <textarea
                    id="task-desc-input"
                    className="form-input-field"
                    rows="3"
                    placeholder="Provide context or tracking information..."
                    value={newTask.desc}
                    onChange={(e) => setNewTask({ ...newTask, desc: e.target.value })}
                  />
                </div>

                <div className="form-2col">
                  <div className="form-group">
                    <label className="form-label" htmlFor="task-priority-select">Priority</label>
                    <select
                      id="task-priority-select"
                      className="form-input-field"
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="task-assignee-select">
                      Assignee (Active Team Member) <span className="req">*</span>
                    </label>
                    {loadingTeam ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Loading team members...</p>
                    ) : teamMembers.length === 0 ? (
                      <div style={{ fontSize: '0.82rem', color: 'var(--danger)', lineHeight: 1.4 }}>
                        No active team members found. Please add a team member on the <strong>Team</strong> page before assigning tasks.
                      </div>
                    ) : (
                      <select
                        id="task-assignee-select"
                        className="form-input-field"
                        value={newTask.assigned_to}
                        onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                        required
                      >
                        <option value="">Select Team Member</option>
                        {teamMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.department || 'General'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="form-2col">
                  <div className="form-group">
                    <label className="form-label" htmlFor="task-start-date-input">Start Date</label>
                    <input
                      id="task-start-date-input"
                      type="text"
                      className="form-input-field"
                      placeholder="e.g. Today, 9:00 AM or 24 Oct 2026"
                      value={newTask.startDate}
                      onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="task-due-date-input">Due Date</label>
                    <input
                      id="task-due-date-input"
                      type="text"
                      className="form-input-field"
                      placeholder="e.g. Tomorrow, 5:30 PM or 24 Oct 2026"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || teamMembers.length === 0}
                >
                  {submitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
