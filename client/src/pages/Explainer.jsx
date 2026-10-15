import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Explainer.css'

/**
 * OmniOS public Problem / Solution page.
 * Faithful React port of the authoritative source page (omnioss.html):
 * brand + nav, hero with the scattered-tools illustration, 01 Problem,
 * 02 Solution flow, 03 Dashboard preview, 04 Feature cards, 05 Tech & cost
 * and the footer — original wording, figures and order preserved.
 *
 * The dashboard section below is a static preview of the product, not the
 * authenticated workspace. All CTAs lead to /login (owner authentication).
 */

const CHART_DATA = [
  { d: 'Mon', v: 32 },
  { d: 'Tue', v: 41 },
  { d: 'Wed', v: 28 },
  { d: 'Thu', v: 52 },
  { d: 'Fri', v: 47 },
  { d: 'Sat', v: 63 },
  { d: 'Sun', v: 38 },
]

const ORDER_ROWS = [
  { customer: 'R. Sharma', item: 'Bulk stationery', amount: '₹8,400', status: 'Pending', tag: 'wait' },
  { customer: 'Patel Traders', item: 'Office chairs ×6', amount: '₹27,000', status: 'Delivered', tag: 'ok' },
  { customer: 'N. Desai', item: 'Printer cartridges', amount: '₹2,150', status: 'Overdue', tag: 'risk' },
  { customer: 'Shah Enterprises', item: 'Annual AMC', amount: '₹45,000', status: 'Delivered', tag: 'ok' },
  { customer: 'K. Mehta', item: 'Signage order', amount: '₹6,800', status: 'Pending', tag: 'wait' },
]

const PREVIEW_SIDE = ['Overview', 'Customers', 'Tasks', 'Orders', 'Sales', 'Reports']

const PREVIEW_TASKS = [
  { label: 'Confirm Patel Traders delivery', done: true },
  { label: 'Call back N. Desai — overdue payment', done: false },
  { label: 'Send quotation to K. Mehta', done: false },
  { label: 'Update stock count — stationery', done: false },
]

const PROBLEM_CELLS = [
  { num: '01', title: 'Customer records', text: 'Saved in registers or personal phones — lost when staff changes.' },
  { num: '02', title: 'Tasks & follow-ups', text: 'Tracked in WhatsApp threads that scroll away and get forgotten.' },
  { num: '03', title: 'Sales & orders', text: 'Logged in spreadsheets that only one person knows how to read.' },
  { num: '04', title: 'Reports', text: 'Built manually before every review — never available on demand.' },
]

const FLOW_STEPS = [
  { title: 'Capture', text: 'Customers, orders and tasks logged in one place, by anyone on the team.' },
  { title: 'Connect', text: 'A new order links automatically to its customer and a follow-up task.' },
  { title: 'Understand', text: 'Dashboard turns raw entries into sales trends and pending work.' },
  { title: 'Act', text: "Plain-language nudges flag what actually needs the owner's attention." },
]

const FEATURES = [
  { title: 'Unified dashboard', text: 'One home screen for sales, tasks, orders and customers — no switching tabs.' },
  { title: 'Customer records', text: "Every customer's order history and follow-ups in a single profile." },
  { title: 'Task automation', text: 'A new order can auto-create its own follow-up task and reminder.' },
  { title: 'Live search & filter', text: 'Find any order or customer instantly as you type, no page reload.' },
  { title: 'Plain-language insights', text: 'The dashboard explains what changed, not just the raw numbers.' },
  { title: 'Responsive by default', text: "Same dashboard works on the shop counter tablet and the owner's phone." },
]

const STACK_CARDS = [
  { k: 'Now — this build', title: 'Frontend', items: ['HTML5', 'CSS3 (flexbox, grid)', 'Vanilla JavaScript'] },
  { k: 'Next', title: 'Backend', items: ['PHP', 'MySQL (XAMPP)', 'REST endpoints'] },
  { k: 'Future scope', title: 'AI layer', items: ['Insight generation', 'Workflow automation', 'Optional LLM API'] },
  { k: 'Future scope', title: 'Scale-up stack', items: ['React + TypeScript', 'Node/Express + Prisma', 'PostgreSQL + Redis'] },
]

/** Live date line — mirrors the source script's date rendering. */
function todayLine() {
  try {
    return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch {
    return 'Today'
  }
}

export default function Explainer() {
  const [navOpen, setNavOpen] = useState(false)
  const [previewSide, setPreviewSide] = useState('Overview')
  const [orderQuery, setOrderQuery] = useState('')
  const [chartBars, setChartBars] = useState(() => CHART_DATA.map((b) => b.v))
  const [chartReady, setChartReady] = useState(false)
  const [taskBoxes, setTaskBoxes] = useState(() => PREVIEW_TASKS.map((t) => t.done))
  const clockLine = todayLine()

  // Preserve the source document title while the public page is mounted
  useEffect(() => {
    const previous = document.title
    document.title = 'OmniOS — One place for every business decision'
    return () => {
      document.title = previous
    }
  }, [])

  // Mirror the source bar-chart reveal animation
  useEffect(() => {
    const id = setTimeout(() => setChartReady(true), 80)
    return () => clearTimeout(id)
  }, [])

  const refreshChart = () => {
    setChartBars(CHART_DATA.map(() => Math.round(20 + Math.random() * 80)))
    setChartReady(true)
  }

  const visibleOrders = ORDER_ROWS.filter((row) => {
    const q = orderQuery.trim().toLowerCase()
    if (!q) return true
    return `${row.customer} ${row.item} ${row.amount} ${row.status}`.toLowerCase().includes(q)
  })

  const toggleTask = (index) => {
    setTaskBoxes((prev) => prev.map((v, i) => (i === index ? !v : v)))
  }

  return (
    <div className="explainer-page">
      {/* ---------- NAVIGATION ---------- */}
      <header className="site">
        <div className="wrap nav">
          <Link to="/" className="brand">
            <span className="mark" aria-hidden="true" />
            <span>OmniOS</span>
          </Link>

          <nav className={`navlinks${navOpen ? ' open' : ''}`} id="navlinks" aria-label="Page sections">
            <a href="#problem" onClick={() => setNavOpen(false)}>Problem</a>
            <a href="#solution" onClick={() => setNavOpen(false)}>Solution</a>
            <a href="#dashboard" onClick={() => setNavOpen(false)}>Dashboard</a>
            <a href="#features" onClick={() => setNavOpen(false)}>Features</a>
            <a href="#stack" onClick={() => setNavOpen(false)}>Tech &amp; cost</a>
          </nav>

          <Link to="/login" className="navcta" id="nav-login-cta">
            See it run
          </Link>

          <button
            type="button"
            className="burger"
            id="burger"
            aria-label="Menu"
            aria-expanded={navOpen}
            aria-controls="navlinks"
            onClick={() => setNavOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow-plain">
              B.Sc. IT &middot; Semester III &middot; React With PHP practical project
            </p>
            <h1 className="hero-title">
              Every business decision, <em>one screen</em> away.
            </h1>
            <p className="hero-sub">
              Small businesses run on scattered spreadsheets, chat threads and memory. OmniOS pulls
              customers, tasks, orders and sales into a single dashboard — and quietly points out what
              needs attention before it becomes a problem.
            </p>
            <div className="hero-actions">
              <Link to="/login" className="btn btn-primary" id="demoBtn2">
                Open the dashboard
              </Link>
              <a className="btn btn-ghost" href="#problem">
                Why we built this
              </a>
            </div>
          </div>

          {/* Scattered-tools illustration — the four tools orbit the fixed OmniOS core */}
          <div className="hero-visual" aria-hidden="true">
            <div className="orbit">
              <div className="orbit-ring">
                <div className="orbit-slot s1">
                  <div className="orbit-card">
                    <div className="scatter-note n1">
                      <b>excel_sales_final2.xlsx</b>
                      Updated 9 days ago
                    </div>
                  </div>
                </div>
                <div className="orbit-slot s2">
                  <div className="orbit-card">
                    <div className="scatter-note n2">
                      <b>WhatsApp — Team</b>
                      &quot;did we call the Sharma order back?&quot;
                    </div>
                  </div>
                </div>
                <div className="orbit-slot s3">
                  <div className="orbit-card">
                    <div className="scatter-note n3">
                      <b>Notebook — page 14</b>
                      Follow-ups for Tuesday
                    </div>
                  </div>
                </div>
                <div className="orbit-slot s4">
                  <div className="orbit-card">
                    <div className="scatter-note n4">
                      <b>Email thread</b>
                      Re: Re: Fwd: invoice
                    </div>
                  </div>
                </div>
              </div>
              <div className="scatter-note n5">
                <b>OmniOS</b>
                Everything above, in one place
              </div>
            </div>
            <div className="converge-arrow">scattered tools &rarr; unified view</div>
          </div>
        </div>
      </section>

      {/* ---------- 01 · THE PROBLEM ---------- */}
      <section className="problem" id="problem">
        <div className="wrap">
          <div className="sec-head">
            <p className="sec-kicker">01 &middot; The problem</p>
            <h2 className="sec-title">Business data isn&apos;t missing. It&apos;s just everywhere.</h2>
            <p className="sec-desc">
              Customers in one app, tasks on paper, sales in a spreadsheet, reports nowhere. The owner
              spends more time hunting for information than acting on it.
            </p>
          </div>

          <div className="problem-grid">
            {PROBLEM_CELLS.map((cell) => (
              <div className="problem-cell" key={cell.num}>
                <span className="num">{cell.num}</span>
                <h3>{cell.title}</h3>
                <p>{cell.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 02 · THE SOLUTION ---------- */}
      <section id="solution">
        <div className="wrap">
          <div className="sec-head">
            <p className="sec-kicker">02 &middot; The solution</p>
            <h2 className="sec-title">OmniOS brings the four into one flow.</h2>
            <p className="sec-desc">
              Not a new tool for every job — a single operating layer that shows what&apos;s happening and
              what needs doing next.
            </p>
          </div>

          <div className="flow">
            {FLOW_STEPS.map((step, i) => (
              <Fragment key={step.title}>
                <div className="flow-item">
                  <h4>{step.title}</h4>
                  <p>{step.text}</p>
                </div>
                {i < FLOW_STEPS.length - 1 && <div className="flow-arrow" aria-hidden="true">→</div>}
              </Fragment>
            ))}
          </div>

          {/* Main Solution CTA → owner authentication */}
          <div className="solution-cta">
            <Link to="/login" className="btn btn-primary" id="solution-cta">
              Open the dashboard <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- 03 · DASHBOARD PREVIEW ---------- */}
      <section id="dashboard">
        <div className="wrap">
          <div className="sec-head">
            <p className="sec-kicker">03 &middot; Product walkthrough</p>
            <h2 className="sec-title">What the owner actually opens every morning.</h2>
            <p className="sec-desc">
              A working front-end prototype — the sidebar switches views, the table search filters live,
              and the insight panel is where the AI layer plugs in later.
            </p>
          </div>

          <div className="dash-shell">
            <div className="dash-topbar">
              <div className="dash-dots">
                <span />
                <span />
                <span />
              </div>
              <div className="dash-search">omnios.app/dashboard</div>
            </div>

            <div className="dash-body">
              <nav className="dash-side" id="dashSide" aria-label="Dashboard preview navigation">
                {PREVIEW_SIDE.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={previewSide === item ? 'active' : ''}
                    aria-pressed={previewSide === item}
                    onClick={() => setPreviewSide(item)}
                  >
                    <span className="dot" />
                    {item}
                  </button>
                ))}
              </nav>

              <div className="dash-main">
                <div className="dash-header-row">
                  <h3>Good morning — here&apos;s today</h3>
                  <span id="clockLine">{clockLine}</span>
                </div>

                <div className="kpi-row">
                  <div className="kpi">
                    <div className="lbl">Sales this week</div>
                    <div className="val">₹1.82L</div>
                    <div className="delta down">▼ 6% vs last week</div>
                  </div>
                  <div className="kpi">
                    <div className="lbl">Open orders</div>
                    <div className="val">23</div>
                    <div className="delta up">▲ 4 new today</div>
                  </div>
                  <div className="kpi">
                    <div className="lbl">Active customers</div>
                    <div className="val">146</div>
                    <div className="delta up">▲ 3 this week</div>
                  </div>
                  <div className="kpi">
                    <div className="lbl">Pending follow-ups</div>
                    <div className="val">7</div>
                    <div className="delta down">3 overdue</div>
                  </div>
                </div>

                <div className="dash-columns">
                  <div>
                    <div className="panel">
                      <h4>
                        Sales — last 7 days{' '}
                        <button type="button" id="refreshChart" onClick={refreshChart}>
                          refresh
                        </button>
                      </h4>
                      <div className="bar-chart" id="barChart">
                        {CHART_DATA.map((item, i) => (
                          <div
                            className={`col${chartBars[i] === Math.max(...chartBars) ? ' hi' : ''}`}
                            key={item.d}
                          >
                            <div className="stick">
                              <i
                                style={{
                                  height: chartReady ? `${chartBars[i]}%` : '0%',
                                }}
                              />
                            </div>
                            <span>{item.d}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="panel">
                      <h4>Recent orders</h4>
                      <input
                        className="searchbox"
                        id="orderSearch"
                        placeholder="Search by customer or item…"
                        aria-label="Search preview orders by customer or item"
                        value={orderQuery}
                        onChange={(e) => setOrderQuery(e.target.value)}
                      />
                      <table className="datatable" id="orderTable">
                        <thead>
                          <tr>
                            <th>Customer</th>
                            <th>Item</th>
                            <th>Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleOrders.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="empty-row">
                                No matching rows.
                              </td>
                            </tr>
                          ) : (
                            visibleOrders.map((row) => (
                              <tr key={row.customer + row.item}>
                                <td>{row.customer}</td>
                                <td>{row.item}</td>
                                <td>{row.amount}</td>
                                <td>
                                  <span className={`tag ${row.tag}`}>{row.status}</span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="panel insight">
                      <p className="tagline">omni insight</p>
                      <p>
                        Sales dipped 6% this week, mostly from delayed Overdue orders. Three customers
                        haven&apos;t been followed up in 5+ days.
                      </p>
                      <ul>
                        <li>→ Call N. Desai about the overdue cartridge order</li>
                        <li>→ Confirm delivery date with R. Sharma</li>
                        <li>→ Revisit pricing on the Shah AMC renewal</li>
                      </ul>
                    </div>

                    <div className="panel">
                      <h4>Today&apos;s tasks</h4>
                      <div className="task-list">
                        {PREVIEW_TASKS.map((task, i) => (
                          <label key={task.label}>
                            <input
                              type="checkbox"
                              checked={taskBoxes[i]}
                              onChange={() => toggleTask(i)}
                            />
                            <span className={taskBoxes[i] ? 'done' : ''}>{task.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 04 · WHAT'S INSIDE ---------- */}
      <section id="features">
        <div className="wrap">
          <div className="sec-head">
            <p className="sec-kicker">04 &middot; What&apos;s inside</p>
            <h2 className="sec-title">Six modules, one shell.</h2>
          </div>

          <div className="feat-grid">
            {FEATURES.map((f) => (
              <div className="feat" key={f.title}>
                <h4>{f.title}</h4>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 05 · TECH & COST ---------- */}
      <section id="stack">
        <div className="wrap">
          <div className="sec-head">
            <p className="sec-kicker">05 &middot; Tech &amp; cost</p>
            <h2 className="sec-title">Built with what we already know.</h2>
            <p className="sec-desc">
              This prototype is HTML, CSS and JavaScript only. PHP + MySQL plug in next for real data;
              the modern stack below is the future-scope direction, not tomorrow&apos;s build.
            </p>
          </div>

          <div className="stack-wrap">
            {STACK_CARDS.map((card) => (
              <div className="stack-card" key={card.title}>
                <p className="k">{card.k}</p>
                <h5>{card.title}</h5>
                <ul>
                  {card.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="cost-note">
            <b>₹0</b>
            <span>
              Every tool used for the current build — HTML, CSS, JS, VS Code, and later PHP + MySQL via
              XAMPP — is free. No hosting, domain or paid API is required to demo this project.
            </span>
          </div>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer>
        <div className="wrap foot-row">
          <div className="brand">
            <span className="mark" aria-hidden="true" />
            <span>OmniOS</span>
          </div>
          <small>Frontend prototype — built for practical review · HTML · CSS · JavaScript</small>
        </div>
      </footer>
    </div>
  )
}
