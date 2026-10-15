import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEMO_CUSTOMERS, DEMO_ORDERS, INITIAL_TASKS } from '../data/demoData'
import './GlobalSearch.css'

const SECTIONS = [
  { label: 'Dashboard',            path: '/dashboard',     hint: 'KPIs, weekly sales chart, activity feed' },
  { label: 'Customers Directory',  path: '/customers',     hint: 'MySQL-backed client CRUD' },
  { label: 'Task Kanban Board',    path: '/tasks',         hint: 'To Do, In Progress, Done' },
  { label: 'Orders & Fulfillment', path: '/orders',        hint: 'Commercial orders ledger (INR)' },
  { label: 'Team Workspace',       path: '/team',          hint: 'Staff directory & online status' },
  { label: 'Sales & Revenue',      path: '/sales',         hint: 'Monthly revenue curve' },
  { label: 'Analytics & BI',       path: '/analytics',     hint: 'Operational benchmarks' },
  { label: 'Notifications',        path: '/notifications', hint: 'Pipeline alerts & reminders' },
  { label: 'System Settings',      path: '/settings',      hint: 'Company profile & automation rules' },
]

const MAX_PER_GROUP = 4

/**
 * Global quick-find. Searches the workspace sections and the demo
 * customer / task / order records, then routes to the matching view.
 * Keyboard: “/” to focus, ↑ ↓ to move, Enter to open, Esc to dismiss.
 */
export default function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const match = (...fields) => fields.some((f) => String(f).toLowerCase().includes(q))

    const groups = [
      {
        key: 'sections',
        title: 'Sections',
        items: SECTIONS.filter((s) => match(s.label, s.hint)).map((s) => ({
          id: `section-${s.path}`,
          label: s.label,
          meta: s.path,
          path: s.path,
        })),
      },
      {
        key: 'customers',
        title: 'Customers',
        items: DEMO_CUSTOMERS.filter((c) => match(c.name, c.company, c.email, c.status)).map((c) => ({
          id: `customer-${c.id}`,
          label: c.name,
          meta: `${c.company} · ${c.status}`,
          path: '/customers',
        })),
      },
      {
        key: 'tasks',
        title: 'Tasks',
        items: INITIAL_TASKS.filter((t) => match(t.title, t.desc, t.assignee, t.id)).map((t) => ({
          id: `task-${t.id}`,
          label: t.title,
          meta: `${t.id} · ${t.assignee} · ${t.status}`,
          path: '/tasks',
        })),
      },
      {
        key: 'orders',
        title: 'Orders',
        items: DEMO_ORDERS.filter((o) => match(o.id, o.customer, o.company, o.item, o.status)).map((o) => ({
          id: `order-${o.id}`,
          label: `${o.id} — ${o.item}`,
          meta: `${o.customer} · ${o.status}`,
          path: '/orders',
        })),
      },
    ]

    return groups
      .map((g) => ({ ...g, items: g.items.slice(0, MAX_PER_GROUP) }))
      .filter((g) => g.items.length > 0)
  }, [query])

  const flatResults = useMemo(() => results.flatMap((g) => g.items), [results])

  // Focus the search field with “/” (unless already typing somewhere)
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Dismiss on outside click
  useEffect(() => {
    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const go = (item) => {
    if (!item) return
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
    navigate(item.path)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!open || flatResults.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % flatResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + flatResults.length) % flatResults.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(flatResults[activeIndex])
    }
  }

  let runningIndex = -1

  return (
    <div className="topbar-search global-search" ref={wrapRef}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search sections, customers, tasks… (Press /)"
        aria-label="Global workspace search"
        aria-expanded={open && flatResults.length > 0}
        aria-controls="global-search-results"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {open && query.trim() && (
        <div className="global-search-panel" id="global-search-results" role="listbox">
          {flatResults.length === 0 ? (
            <p className="global-search-empty">No sections, customers, tasks or orders match “{query.trim()}”.</p>
          ) : (
            results.map((group) => (
              <div className="global-search-group" key={group.key}>
                <div className="global-search-group-title">{group.title}</div>
                {group.items.map((item) => {
                  runningIndex += 1
                  const index = runningIndex
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      className={`global-search-item${index === activeIndex ? ' active' : ''}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => go(item)}
                    >
                      <span className="global-search-item-label">{item.label}</span>
                      <span className="global-search-item-meta">{item.meta}</span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
          <div className="global-search-foot">
            <span>Demo quick-find across workspace sections &amp; sample records</span>
          </div>
        </div>
      )}
    </div>
  )
}
