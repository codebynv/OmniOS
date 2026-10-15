/**
 * OmniOS Demo Data — Sharma Office Supplies, Ahmedabad
 * -------------------------------------------------------
 * Coherent fictional business data for college demonstration.
 * NOT real customer records or actual transactions.
 *
 * Business: Sharma Office Supplies
 * Type: B2B office stationery & workplace supplies
 * Location: Ahmedabad, Gujarat
 * Demo owners: Nirav Vala & Kiran Vala (co-owners)
 */

/** ₹ INR Formatter using Indian numbering system */
export const inr = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

/** Short INR: ₹24,800 (no trailing .00) */
export const inrShort = inr

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMERS (demo — consistent with orders)
// Note: actual directory loads from MySQL. This is the demo complement shown
// in Orders, Tasks, Dashboard. Do NOT replace the API-backed Customers page.
// ─────────────────────────────────────────────────────────────────────────────
export const DEMO_CUSTOMERS = [
  { id: 1, name: 'Rajesh Sharma',     company: 'Sharma Traders',           email: 'rajesh@sharmatraders.in',       phone: '+91 98200 11223', status: 'Active',   spent: 124000, lastContact: '2 hours ago' },
  { id: 2, name: 'Priya Patel',       company: 'Apex Global Logistics',    email: 'priya.p@apexglobal.com',        phone: '+91 98765 43210', status: 'Active',   spent: 245000, lastContact: 'Yesterday'  },
  { id: 3, name: 'Amit Desai',        company: 'Desai Tech Solutions',     email: 'amit@desaitech.com',            phone: '+91 99099 88776', status: 'Lead',     spent: 0,      lastContact: '3 days ago' },
  { id: 4, name: 'Sunita Mehta',      company: 'Mehta Group',              email: 'sunita@mehtagroup.org',         phone: '+91 98450 33445', status: 'Active',   spent: 88500,  lastContact: '4 days ago' },
  { id: 5, name: 'Vikram Verma',      company: 'Horizon Builders',         email: 'v.verma@horizonbuild.in',       phone: '+91 93154 77821', status: 'Inactive', spent: 42000,  lastContact: '2 weeks ago'},
  { id: 6, name: 'Ananya Rao',        company: 'Zenith Enterprise',        email: 'ananya@zenithenterprise.com',   phone: '+91 97123 55667', status: 'Active',   spent: 310000, lastContact: 'Today'      },
  { id: 7, name: 'Rohan Gupta',       company: 'Gupta Retailers',          email: 'rohan.g@guptaretail.in',        phone: '+91 98111 22334', status: 'Lead',     spent: 0,      lastContact: '5 days ago' },
  { id: 8, name: 'Neha Joshi',        company: 'Joshi Financial Advisors', email: 'neha@joshiadvisors.in',         phone: '+91 99024 66110', status: 'Active',   spent: 195000, lastContact: '1 day ago'  },
  { id: 9, name: 'Suresh Nair',       company: 'Nair Industrial Parts',    email: 'suresh@nairindustries.com',     phone: '+91 90000 44312', status: 'Inactive', spent: 64000,  lastContact: '1 month ago'},
  { id: 10, name: 'Pooja Kulkarni',   company: 'Kulkarni Design Studio',   email: 'pooja@kulkarnidesign.studio',   phone: '+91 98202 87654', status: 'Active',   spent: 76000,  lastContact: '3 hours ago'},
  { id: 11, name: 'Manish Chawla',    company: 'Chawla Supplies Corp',     email: 'manish@chawlasupply.com',       phone: '+91 99870 12345', status: 'Active',   spent: 152000, lastContact: 'Yesterday'  },
  { id: 12, name: 'Divya Iyer',       company: 'Iyer Data Labs',           email: 'divya@iyeranalytics.io',        phone: '+91 98761 00987', status: 'Lead',     spent: 0,      lastContact: 'Just now'   },
]

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS (demo-only — not persisted to MySQL)
// ─────────────────────────────────────────────────────────────────────────────
export const DEMO_ORDERS = [
  { id: 'ORD-9401', customer: 'Rajesh Sharma',    company: 'Sharma Traders',        item: 'Bulk Stationery Pack (200 units)', amount: 8400,    status: 'Pending',    date: '14 Oct 2026', method: 'UPI'        },
  { id: 'ORD-9402', customer: 'Suresh Nair',      company: 'Patel Traders',         item: 'Ergonomic Office Chairs ×6',       amount: 27000,   status: 'Delivered',  date: '13 Oct 2026', method: 'NEFT'       },
  { id: 'ORD-9403', customer: 'Amit Desai',       company: 'Desai Tech Solutions',  item: 'Printer Cartridges ×4',            amount: 2150,    status: 'Overdue',    date: '11 Oct 2026', method: 'Pending'    },
  { id: 'ORD-9404', company: 'Shah Enterprises',  customer: 'P. Shah',              item: 'Annual Server AMC Contract',       amount: 45000,   status: 'Delivered',  date: '10 Oct 2026', method: 'Net Banking'},
  { id: 'ORD-9405', customer: 'Sunita Mehta',     company: 'Mehta Group',           item: 'Custom Store Signage ×3',          amount: 6800,    status: 'Processing', date: '09 Oct 2026', method: 'Card'       },
  { id: 'ORD-9406', customer: 'Ananya Rao',       company: 'Zenith Enterprise',     item: 'Workstation Setup Kit ×10',        amount: 120000,  status: 'Processing', date: '07 Oct 2026', method: 'NEFT'       },
  { id: 'ORD-9407', customer: 'Neha Joshi',       company: 'Joshi Financial Advisors', item: 'Network Router + Setup',        amount: 14500,   status: 'Delivered',  date: '06 Oct 2026', method: 'UPI'        },
  { id: 'ORD-9408', customer: 'Manish Chawla',    company: 'Chawla Supplies Corp',  item: 'Thermal Printer Paper ×50 rolls',  amount: 4900,    status: 'Pending',    date: '01 Oct 2026', method: 'Cash'       },
]

// ─────────────────────────────────────────────────────────────────────────────
// TASKS (demo-only — changes are session-local, not persisted)
// ─────────────────────────────────────────────────────────────────────────────
export const INITIAL_TASKS = [
  { id: 'TASK-01', title: 'Confirm Patel Traders bulk delivery',          desc: 'Verify courier tracking number for six ergonomic office chairs and dispatch delivery receipt.',                 status: 'done',        priority: 'High',   assignee: 'Nirav V.',   initials: 'NV', dueDate: '14 Oct 2026' },
  { id: 'TASK-02', title: 'Call back Amit Desai — overdue payment',       desc: 'Follow up on the pending ₹2,150 invoice for printer cartridges supplied on 11 Oct.',                          status: 'todo',        priority: 'High',   assignee: 'Rajesh S.',  initials: 'RS', dueDate: '14 Oct 2026' },
  { id: 'TASK-03', title: 'Send revised quotation to Sunita Mehta',       desc: 'Prepare revised pricing breakdown for custom storefront signage and warranty terms for Mehta Group.',          status: 'in-progress', priority: 'Medium', assignee: 'Yash C.',    initials: 'YC', dueDate: '15 Oct 2026' },
  { id: 'TASK-04', title: 'Weekly stationery stock count',                 desc: 'Perform physical count of reams, markers, folders and pens in warehouse bins #4 and #5.',                    status: 'todo',        priority: 'Low',    assignee: 'Vishal P.',  initials: 'VP', dueDate: '16 Oct 2026' },
  { id: 'TASK-05', title: 'Prepare GST return filing figures',             desc: 'Reconcile sales ledger entries with GSTR-1 generated report before CA submission deadline.',                  status: 'in-progress', priority: 'High',   assignee: 'Manaswi K.', initials: 'MK', dueDate: '17 Oct 2026' },
  { id: 'TASK-06', title: 'Draft Q3 AMC renewal agreement',               desc: 'Create service contract draft for Shah Enterprises covering 12-month server maintenance.',                     status: 'done',        priority: 'Medium', assignee: 'Nirav V.',   initials: 'NV', dueDate: '10 Oct 2026' },
  { id: 'TASK-07', title: 'Onboarding sync with Zenith Enterprise',       desc: 'Conduct introductory operational setup meeting with Ananya Rao and her operations team.',                     status: 'in-progress', priority: 'High',   assignee: 'Yash C.',    initials: 'YC', dueDate: '20 Oct 2026' },
  { id: 'TASK-08', title: 'Update vendor invoice register',                desc: 'Compile all October vendor supply invoices into the monthly purchase register spreadsheet.',                  status: 'todo',        priority: 'Medium', assignee: 'Harsh J.',   initials: 'HJ', dueDate: '20 Oct 2026' },
  { id: 'TASK-09', title: 'Archive Q2 delivery challans',                  desc: 'Compress and upload scanned signed delivery challans for Apr–Jun 2026 to cloud storage vault.',              status: 'done',        priority: 'Low',    assignee: 'Harsh J.',   initials: 'HJ', dueDate: '05 Oct 2026' },
]

// ─────────────────────────────────────────────────────────────────────────────
// TEAM
// ─────────────────────────────────────────────────────────────────────────────
export const TEAM_MEMBERS = [
  { name: 'Nirav Vala',           initials: 'NV', role: 'Co-Owner & Operations Head', email: 'nirav.vala@omnios.local',         status: 'online',  dept: 'Management',   tasks: 3, phone: '+91 98200 55000' },
  { name: 'Rajesh Sharma',        initials: 'RS', role: 'Co-Owner & Commercial Director', email: 'rajesh@sharmatraders.in',      status: 'online',  dept: 'Management',   tasks: 2, phone: '+91 98200 11223' },
  { name: 'Harsh Joshi',          initials: 'HJ', role: 'Accounts & Billing Lead',     email: 'harsh.j@sharmaofficesupplies.in', status: 'online',  dept: 'Accounts',     tasks: 2, phone: '+91 98765 10020' },
  { name: 'Yash Chauhan',         initials: 'YC', role: 'Sales & Client Relations',    email: 'yash.c@sharmaofficesupplies.in',  status: 'online',  dept: 'Sales',        tasks: 3, phone: '+91 99090 77744' },
  { name: 'Manaswi Khuman',       initials: 'MK', role: 'Inventory & Compliance',      email: 'manaswi.k@sharmaofficesupplies.in', status: 'offline', dept: 'Operations', tasks: 1, phone: '+91 93140 88800' },
  { name: 'Vishal Panchal',       initials: 'VP', role: 'Warehouse & Logistics',       email: 'vishal.p@sharmaofficesupplies.in', status: 'offline', dept: 'Logistics',   tasks: 2, phone: '+91 90990 33311' },
]

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
export const INITIAL_NOTIFICATIONS = [
  { id: 1, title: 'Overdue Payment Alert',        desc: 'ORD-9403 from Desai Tech Solutions (₹2,150) is now 3 days past the payment due date.', time: '10 mins ago',  icon: '⚠️', unread: true  },
  { id: 2, title: 'New Lead: Divya Iyer',         desc: 'Divya Iyer from Iyer Data Labs submitted an inquiry form. Follow up before end of day.', time: '1 hour ago',   icon: '👤', unread: true  },
  { id: 3, title: 'Order ORD-9402 Delivered',     desc: 'Ergonomic Office Chairs ×6 for Patel Traders marked delivered by courier.',              time: 'Yesterday',    icon: '📦', unread: false },
  { id: 4, title: 'Task Completed',               desc: 'Nirav V. completed "Draft Q3 AMC renewal agreement" for Shah Enterprises.',              time: '1 day ago',    icon: '✅', unread: false },
  { id: 5, title: 'Database Backup Complete',     desc: 'Automated nightly MySQL backup completed successfully.',                                  time: '2 days ago',   icon: '🗄️', unread: false },
  { id: 6, title: 'GST Filing Reminder',          desc: 'GSTR-1 filing is due in 7 days. Manaswi K. has started reconciliation.',                 time: '3 days ago',   icon: '📋', unread: false },
]

// ─────────────────────────────────────────────────────────────────────────────
// SALES — Monthly revenue (FY 2026, Jan–Oct, demo figures)
// ─────────────────────────────────────────────────────────────────────────────
export const MONTHLY_SALES = [
  { month: 'Jan', amount: 280000 },
  { month: 'Feb', amount: 310000 },
  { month: 'Mar', amount: 420000 },
  { month: 'Apr', amount: 390000 },
  { month: 'May', amount: 460000 },
  { month: 'Jun', amount: 510000 },
  { month: 'Jul', amount: 440000 },
  { month: 'Aug', amount: 482500 },
  { month: 'Sep', amount: 398000 },
  { month: 'Oct', amount: 228900 }, // partial (MTD)
]

// Weekly sales (current week — dashboard chart)
export const WEEKLY_SALES = [
  { day: 'Mon', amount: 34000  },
  { day: 'Tue', amount: 42500  },
  { day: 'Wed', amount: 28000  },
  { day: 'Thu', amount: 56000  },
  { day: 'Fri', amount: 48000  },
  { day: 'Sat', amount: 68500  },
  { day: 'Sun', amount: 39000  },
]

// ─────────────────────────────────────────────────────────────────────────────
// RECENT ACTIVITY (dashboard feed — demo)
// ─────────────────────────────────────────────────────────────────────────────
export const RECENT_ACTIVITY = [
  { icon: '👤', text: 'New lead <b>Divya Iyer</b> added from Iyer Data Labs.',                         time: 'Just now'     },
  { icon: '📦', text: 'Order <b>#ORD-9401</b> (₹8,400) placed by <b>Rajesh Sharma</b>.',              time: '2 hours ago'  },
  { icon: '✅', text: 'Task <b>"Confirm Patel Traders delivery"</b> completed by <b>Nirav V.</b>',     time: '4 hours ago'  },
  { icon: '💰', text: 'Invoice <b>₹45,000</b> settled for <b>Shah Enterprises AMC</b>.',              time: 'Yesterday'    },
  { icon: '⚙️', text: 'Automated reminder sent for <b>Amit Desai</b> overdue invoice.',                time: 'Yesterday'    },
]

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS & BI METRICS (derived operational benchmarks — demo)
// ─────────────────────────────────────────────────────────────────────────────
export const ANALYTICS_METRICS = {
  conversionRate: '24.8%',
  conversionDelta: '▲ +3.2% vs target',
  dealCycle: '14 Days',
  dealCycleDelta: '▲ 2 days faster',
  retentionRate: '96.4%',
  retentionDelta: '▲ Top tier B2B',
  monthlyChurn: '1.2%',
  churnDelta: '▼ -0.4% reduction',
}

export const CHANNEL_BREAKDOWN = [
  { label: 'Direct Referral & Existing B2B Network', percent: 52, amount: 250000, color: 'var(--ink)' },
  { label: 'Inbound Organic Web Inquiries',          percent: 28, amount: 135000, color: 'var(--signal)' },
  { label: 'Direct Sales Outreach',                  percent: 20, amount: 97000,  color: 'var(--slate)' },
]

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY INFO
// ─────────────────────────────────────────────────────────────────────────────
export const COMPANY = {
  name: 'Sharma Office Supplies',
  tagline: 'B2B Office Stationery & Workplace Supplies',
  city: 'Ahmedabad, Gujarat',
  gstin: '24AAHFS1234A1Z5',
  email: 'info@sharmaofficesupplies.in',
  phone: '+91 79 4020 5500',
  currency: 'INR (₹)',
  fy: 'FY 2026-27',
}
