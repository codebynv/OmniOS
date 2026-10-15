import { useState } from 'react'
import { INITIAL_TASKS } from '../data/demoData'
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

/**
 * Tasks & Workflows — Interactive Kanban Board.
 * Cards can be moved with the board buttons or by drag-and-drop, and every
 * move reports a visible confirmation. Session-local demo state only.
 */
export default function Tasks() {
  const [tasks, setTasks] = useState(INITIAL_TASKS)
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [draggingId, setDraggingId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [newTask, setNewTask] = useState({
    title: '',
    desc: '',
    priority: 'Medium',
    assignee: 'Nirav V.',
    dueDate: 'Tomorrow',
  })

  const filteredTasks = tasks.filter((t) => {
    const matchesPriority = priorityFilter === 'all' || t.priority.toLowerCase() === priorityFilter.toLowerCase()
    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q) ||
      t.assignee.toLowerCase().includes(q)
    return matchesPriority && matchesSearch
  })

  const tasksFor = (status) => filteredTasks.filter((t) => t.status === status)

  const report = (type, message) => {
    setFeedback({ type, message })
    window.setTimeout(() => setFeedback(null), 3200)
  }

  const moveTask = (taskId, newStatus) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) {
      report('fail', `Task ${taskId} could not be found.`)
      return
    }
    if (task.status === newStatus) {
      report('fail', `${taskId} is already in ${STATUS_LABEL[newStatus]}.`)
      return
    }
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
    report('ok', `${taskId} moved to ${STATUS_LABEL[newStatus]}.`)
  }

  const handleDrop = (status) => {
    if (draggingId) moveTask(draggingId, status)
    setDraggingId(null)
    setDropTarget(null)
  }

  const handleCreateTask = (e) => {
    e.preventDefault()
    if (!newTask.title.trim()) return

    const id = `TASK-${String(tasks.length + 1).padStart(2, '0')}`
    const initials = newTask.assignee
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()

    setTasks((prev) => [
      ...prev,
      {
        id,
        title: newTask.title.trim(),
        desc: newTask.desc.trim() || 'No description provided.',
        priority: newTask.priority,
        assignee: newTask.assignee,
        initials: initials || 'NV',
        dueDate: newTask.dueDate,
        status: 'todo',
      },
    ])

    report('ok', `${id} created in To Do.`)
    setNewTask({
      title: '',
      desc: '',
      priority: 'Medium',
      assignee: 'Nirav V.',
      dueDate: 'Tomorrow',
    })
    setShowAddModal(false)
  }

  return (
    <div className="page-view">
      {/* Session Demo Notice */}
      <div className="demo-banner-strip">
        <div>
          <strong>Interactive Task Board</strong> &bull; Drag cards between columns or use the
          buttons. Session-local demo state — changes persist while you navigate this session.
        </div>
        <span className="tag demo">Demo-only &bull; Non-persistent</span>
      </div>

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
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddModal(true)}
            >
              + Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Move confirmation / error */}
      <div className="task-feedback-slot" role="status" aria-live="polite">
        {feedback && (
          <div className={`alert-strip ${feedback.type === 'ok' ? 'ok' : 'fail'}`}>
            {feedback.type === 'ok' ? '✓ ' : '! '}
            {feedback.message}
          </div>
        )}
      </div>

      {/* Kanban Columns */}
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
                        e.dataTransfer.setData('text/plain', t.id)
                      }}
                      onDragEnd={() => {
                        setDraggingId(null)
                        setDropTarget(null)
                      }}
                    >
                      <div className="kanban-card-top">
                        <span className="kanban-card-id">{t.id}</span>
                        {t.status === 'done' ? (
                          <span className="tag ok">Completed</span>
                        ) : (
                          <span className={`tag ${priorityClass(t.priority)}`}>{t.priority}</span>
                        )}
                      </div>
                      <h4 className={`kanban-card-title${t.status === 'done' ? ' struck' : ''}`}>
                        {t.title}
                      </h4>
                      <p className="kanban-card-desc">{t.desc}</p>
                      <div className="kanban-card-meta">
                        <div className="kanban-assignee">
                          <span className="kanban-avatar">{t.initials}</span>
                          <span>{t.assignee}</span>
                        </div>
                        <span>{t.dueDate}</span>
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

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-box">
            <div className="modal-head">
              <h3 className="modal-title">Create Follow-up Task</h3>
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
                <div className="form-group">
                  <label className="form-label">
                    Task Title <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input-field"
                    placeholder="e.g. Call back Amit Desai for payment"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Instructions</label>
                  <textarea
                    className="form-input-field"
                    rows="3"
                    placeholder="Provide context or tracking information..."
                    value={newTask.desc}
                    onChange={(e) => setNewTask({ ...newTask, desc: e.target.value })}
                  />
                </div>

                <div className="form-2col">
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
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
                    <label className="form-label">Assignee</label>
                    <select
                      className="form-input-field"
                      value={newTask.assignee}
                      onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                    >
                      <option value="Nirav V.">Nirav Vala (Operations)</option>
                      <option value="Rajesh S.">Rajesh Sharma (Commercial)</option>
                      <option value="Harsh J.">Harsh Joshi (Billing)</option>
                      <option value="Yash C.">Yash Chauhan (Sales)</option>
                      <option value="Manaswi K.">Manaswi Khuman (Inventory)</option>
                      <option value="Vishal P.">Vishal Panchal (Warehouse)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="text"
                    className="form-input-field"
                    placeholder="e.g. Tomorrow, 5:30 PM"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
