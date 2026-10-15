# OmniOS — Demo & Local Development Guide

> **Course:** LJICA B.Sc. IT Semester III — IBSIT-304P (React with PHP Practical)  
> **Project:** OmniOS Business Operating System  
> **Demo Business:** **Sharma Office Supplies**, Ahmedabad, Gujarat (B2B Stationery & Workplace Supplies)

---

## 🔑 Demo Owner Credentials

These two co-owner accounts exist in the MySQL `owners` table with bcrypt-hashed passwords generated via PHP `password_hash()`:

| # | Name | Email | Password | Role & Company |
|---|------|-------|----------|----------------|
| 1 | **Nirav Vala** | `nirav.vala@omnios.local` | `OmniOwner@2026` | Co-Owner & Operations Head &bull; **Sharma Office Supplies** |
| 2 | **Rajesh Sharma** | `rajesh@sharmatraders.in` | `Sharma@Trade2026` | Co-Owner & Commercial Director &bull; **Sharma Office Supplies** |

> **Note for viva examination:** Passwords are stored exclusively as bcrypt hashes (`PASSWORD_DEFAULT`). The plaintext password never enters the database or client JavaScript. Authentication verifies using PHP `password_verify()`. On successful login, a secure session cookie (`OMNIOS_SESSID`) is issued with `HttpOnly` and `SameSite=Lax` flags.

---

## 🚀 Local Setup Steps

### Step 1 — Start XAMPP
Open XAMPP Control Panel and ensure both services are started:
- **Apache** (running on port 80 / 443)
- **MySQL** (running on port 3306)

### Step 2 — Initialize Database (if starting fresh)
Open phpMyAdmin (`http://localhost/phpmyadmin`) or MySQL console:
```sql
CREATE DATABASE IF NOT EXISTS `omnios`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 3 — Run the Database Setup Script
In your browser or terminal:
```
http://localhost/OmniOS/database/setup.php
```
or from CLI:
```powershell
C:\xampp\php\php.exe C:\xampp\htdocs\OmniOS\database\setup.php
```

This creates both tables (`owners`, `customers`) if not already present and seeds:
- The 2 co-owner accounts for Sharma Office Supplies with bcrypt hashes
- 12 authentic Indian small-business client records (Ahmedabad/Gujarat B2B clients)

### Step 4 — Start the React Client Dev Server
```powershell
cd C:\xampp\htdocs\OmniOS\client
npm install    # only needed on first setup
npm run dev
```

### Step 5 — Open the Application
Navigate in your browser to:
```
http://localhost:5173
```

---

## 📱 User Journey & Feature Map

| Step | Section / Action | URL | Persistence Type | Expected Behavior |
|------|------------------|-----|------------------|-------------------|
| 1 | **Public Explainer** | `/` | Static / Public | Hero overview, 01 Problem Statement (4 cells), 02 Proposed Solution (pipeline diagram + owner-login CTA), 03 Dashboard Preview, 04 Core Features (6 cards), 05 Tech Stack & ₹0-Cost budget. Faithful React port of the authoritative `omnioss.html` page (same tokens, typography, spacing and responsive breakpoints). |
| 2 | **Solution CTA** | `/login` | Public | Navigates to owner login page. |
| 3 | **Authentication** | `/login` | PHP Session + MySQL | Enter credentials or click either demo pill (`Nirav Vala` or `Rajesh Sharma`). Click "Sign In as Owner". Redirects to `/dashboard`. |
| 4 | **Dashboard** | `/dashboard` | Demo + Aggregated | KPIs (MTD Sales, Pending Tasks, Active Clients, Team Members), Weekly Sales bar chart with hover tooltips, Recent Activity feed, rule-based Insights panel, and Latest Orders preview. |
| 5 | **Customers** | `/customers` | **MySQL-Backed Persistent CRUD** | Paginated customer table fetched from `GET /api/customers.php`. Real-time search, Add Customer modal (POST), Edit Customer modal (PUT), Delete Customer confirmation (DELETE). Mobile numbers are validated against the strict Indian rule `^[6-9][0-9]{9}$` on both the client and the server, with inline field errors. All changes persist in MySQL across page refreshes. |
| 6 | **Tasks** | `/tasks` | Demo-only (Session state) | Interactive 3-column Kanban board (To Do, In Progress, Done). Tasks linked to customers/orders with assignees, priorities, and due dates. Move cards with the in-card buttons or by drag-and-drop; every move shows a visible confirmation, and columns stack below 860px. |
| 7 | **Orders** | `/orders` | Demo-only | Realistic B2B orders ledger for stationery/workplace products with Indian Rupee formatting (`inr()`), status filtering (Delivered, Processing, Pending, Overdue), and search. |
| 8 | **Team** | `/team` | Demo-only | Team directory for Sharma Office Supplies with 6 staff profiles, live online status indicators, department tags and assigned task counts. A compact filter row search by name/email and narrows by department, role/designation and work status (options derived from the dataset), shows a live "showing X of Y" count, supports combined filters, and offers a Clear Filters reset plus a helpful empty state. |
| 9 | **Sales** | `/sales` | Demo-only | Monthly revenue curve (Jan–Oct) bar chart, YTD revenue summaries formatted in INR, and recent commercial invoice breakdown. |
| 10 | **Analytics** | `/analytics` | Demo-only (Calculated) | Operational metrics: Lead Conversion Rate (24.8%), Deal Cycle (14 Days), Client Retention (96.4%), Churn (1.2%), and Client Acquisition Channel breakdown. |
| 11 | **Notifications** | `/notifications` | Demo-only (Interactive state) | Operational pipeline alerts with functional read/unread toggling, unread count badge, filter tabs, and "Mark All as Read" button. Unread state is shared with the topbar bell dropdown, so both stay in sync. |
| 12 | **Settings** | `/settings` | Demo + Session info | Organization preferences for Sharma Office Supplies (Ahmedabad, GSTIN, INR base currency), active owner details, and automation rule toggles. Inputs are validated before saving, unsaved changes are indicated, and the confirmation states honestly that preferences are session-local (nothing is written to MySQL). |
| 13 | **Sign Out** | Topbar profile button | Session destruction | Calls `POST /api/auth/logout.php`, clears session cookie, and redirects to `/login`. |

---

## 🔒 Distinction: MySQL-Backed vs Demo-Only Features

| Feature Area | Data Source | Persistence | Notes |
|--------------|-------------|-------------|-------|
| **Owner Authentication** | MySQL `owners` table | **Fully Persistent** | Verified via PHP `password_verify()`. Session stored in PHP `$_SESSION` and cookie `OMNIOS_SESSID`. |
| **Customer Directory** | MySQL `customers` table | **Fully Persistent** | Full CRUD via prepared statements in `api/customers.php`. Server-side pagination & search, strict 10-digit Indian mobile validation (client + server), duplicate-email protection. Survives page reload. |
| **Dashboard KPIs & Charts** | `demoData.js` + MySQL count | Demo-only | Reconciled with Sharma Office Supplies business records. |
| **Task Kanban Board** | React `useState` session | Demo-only (Session state) | State changes survive in-memory navigation. Cards move via buttons or drag-and-drop, each move confirmed visibly. Clearly marked with demo banner strip. |
| **Orders Ledger** | `demoData.js` | Demo-only | Realistic B2B orders formatted in INR. Not written to database. |
| **Team Roster** | `demoData.js` | Demo-only | 6 believable team roles for Sharma Office Supplies. |
| **Sales & Analytics** | `demoData.js` | Demo-only | Month-by-month and channel distribution figures. |
| **Notifications** | React `useState` (NotificationsContext) | Demo-only (Interactive state) | Toggling read status and "Mark All as Read" work in memory and are shared with the topbar bell dropdown. |
| **System Settings** | React `useState` + session | Demo-only + Live Owner | Validated form with inline errors and unsaved-changes indicator; confirmation explicitly states settings are session-local. Displays authenticated owner from session without exposing password hashes. |

---

## 🏗 Architecture Overview

```
OmniOS/
├── frontend/                     ← Original prototype (preserved untouched)
│   ├── omnios.html               ← Problem Statement reference
│   ├── index.html                ← Dashboard prototype reference
│   ├── style.css                 ← Design system token reference
│   └── script.js
│
├── client/                       ← React 18 SPA (Vite + React Router v6)
│   └── src/
│       ├── App.jsx               ← BrowserRouter + AuthProvider + NotificationsProvider + All 9 Routes
│       ├── context/
│       │   ├── AuthContext.jsx     ← Session auth state (auto-checks /api/auth/me.php)
│       │   └── NotificationsContext.jsx ← Shared unread state for the topbar bell & Notifications page
│       ├── services/
│       │   └── api.js            ← Centralized fetch wrapper with credentials
│       ├── data/
│       │   └── demoData.js       ← Coherent Indian business data (Sharma Office Supplies)
│       ├── components/
│       │   ├── ProtectedRoute.jsx← Route guard blocking unauthenticated access
│       │   ├── Layout.jsx        ← Authenticated app shell (Sidebar + Header + Content)
│       │   ├── Sidebar.jsx       ← Navigation linking all 9 sections with active indicators
│       │   ├── Header.jsx        ← Page title, working global search, bell dropdown & working logout
│       │   ├── GlobalSearch.jsx  ← Topbar quick-find across sections & demo records (“/” to focus)
│       │   ├── StatCard.jsx      ← KPI metric card
│       │   └── StatusBadge.jsx   ← Status pill badge
│       └── pages/
│           ├── Explainer.jsx     ← / (public) 5-section Problem/Solution narrative
│           ├── Login.jsx         ← /login (public) Owner login form with demo pills
│           ├── Dashboard.jsx     ← /dashboard (protected) KPIs, sales chart, recent activity
│           ├── Customers.jsx     ← /customers (protected) Full MySQL-backed CRUD
│           ├── Tasks.jsx         ← /tasks (protected) 3-column Kanban board
│           ├── Orders.jsx        ← /orders (protected) Commercial orders in INR
│           ├── Team.jsx          ← /team (protected) Team directory with online statuses
│           ├── Sales.jsx         ← /sales (protected) Monthly revenue curve & invoices
│           ├── Analytics.jsx     ← /analytics (protected) Operational benchmarks & channels
│           ├── Notifications.jsx ← /notifications (protected) Read/unread notifications
│           └── Settings.jsx      ← /settings (protected) Company & session settings
│
├── api/                          ← PHP REST Backend (XAMPP Apache)
│   ├── config/
│   │   ├── db.php               ← MySQL mysqli connection & sendJsonResponse helper
│   │   └── session.php          ← Session init, requireAuth() guard, getCurrentOwner()
│   ├── auth/
│   │   ├── login.php            ← POST /api/auth/login.php (password_verify + session start)
│   │   ├── me.php               ← GET  /api/auth/me.php (session verification)
│   │   └── logout.php           ← POST /api/auth/logout.php (session destroy)
│   ├── customers.php            ← Full CRUD + prepared statement queries + auth guard
│   └── health.php               ← GET  /api/health.php (system health check)
│
└── database/
    ├── schema.sql               ← customers table definition
    ├── auth_schema.sql          ← owners table definition
    ├── seed_owners.php          ← Standalone CLI owner seeder
    └── setup.php                ← Browser/CLI database setup & seeder
```

---

## 🔒 Security Implementation Summary

| Security Requirement | Implementation |
|----------------------|----------------|
| **Password Storage** | PHP `password_hash($pass, PASSWORD_DEFAULT)` (bcrypt). Plaintext never stored. |
| **Password Verification** | PHP `password_verify($pass, $hash)` during `POST /api/auth/login.php`. |
| **SQL Injection Prevention** | 100% prepared statements with parameterized `bind_param()` on all queries. |
| **Session Fixation Prevention** | `session_regenerate_id(true)` invoked immediately upon successful authentication. |
| **Session Cookie Security** | Configured with `HttpOnly`, `SameSite=Lax`, and named `OMNIOS_SESSID`. |
| **Endpoint Authorization** | `requireAuth($conn)` enforced at the start of all protected API endpoints. |
| **Credential Masking** | Passwords and hashes are omitted from all JSON API responses. |
| **Generic Auth Responses** | Identical error message for non-existent emails or incorrect passwords. |

---

## 📚 Syllabus Coverage (LJICA B.Sc. IT Semester III — IBSIT-304P)

| Unit | Topic | Demonstrated In |
|------|-------|----------------|
| **Unit I-A** | Semantic HTML5 (`header`, `nav`, `aside`, `main`, `footer`, `article`) | `Layout.jsx`, `Sidebar.jsx`, `Header.jsx`, `Explainer.jsx`, `Tasks.jsx` |
| **Unit I-B** | HTML Tables (`table`, `thead`, `tbody`, `tr`, `th`, `td`) | `Customers.jsx`, `Orders.jsx`, `Sales.jsx`, `Explainer.jsx` |
| **Unit I-C** | CSS Flexbox & Grid layouts | `index.css`, `Sidebar.css`, `Explainer.css` |
| **Unit I-D** | HTML Forms with controlled inputs | `Login.jsx`, `Customers.jsx` modal form, `Settings.jsx` |
| **Unit I-F** | Event handling in React | `onClick`, `onChange`, `onSubmit`, `onKeyDown` throughout |
| **Unit II-A** | PHP REST API with MySQL | `customers.php`, `auth/login.php`, `auth/me.php`, `health.php` |
| **Unit II-D** | PHP Session authentication | `config/session.php`, `auth/login.php`, `auth/logout.php` |
| **Unit III** | MySQL CRUD with prepared statements | `customers.php`, `database/setup.php` |
| **Unit IV-A** | React functional components | All components in `client/src/` |
| **Unit IV-B** | Props & component composition | `Layout`, `Header`, `Sidebar`, `StatusBadge`, `StatCard` |
| **Unit IV-C** | React `useState` & `useEffect` hooks | `AuthContext`, `Customers`, `Tasks`, `Notifications`, `Settings` |
| **Unit IV-D** | Form handling & validation | `Login.jsx` & `Customers.jsx` with inline errors |
| **Unit IV-E** | Conditional rendering | Loading, empty, and error states in `Customers.jsx` and `Login.jsx` |
| **Unit IV-F** | Lists & Keys | Customer rows, order rows, task cards, team cards, notification items |
| **Unit IV-H** | SPA routing with React Router v6 | `App.jsx`, `ProtectedRoute.jsx`, `Sidebar.jsx` (all 9 routes) |

---

## ✅ Automated Verification Record

- [x] **PHP Syntax Check:** All 10 PHP files passed with **0 errors** (`C:\xampp\php\php.exe -l`).
- [x] **Client Lint:** `npm run lint` — **0 errors** (only pre-existing advisory warnings).
- [x] **Client Build:** `npm run build` — built with 0 errors.
- [x] **Database Schema & Seeding:** Seeded 2 demo owners and 12 authentic Indian business customers into XAMPP MySQL.
- [x] **Public page fidelity:** rendered React page matches the authoritative `omnioss.html` source — all source content present in order, and measured layout/typography/colour parity across 1440px and 390px viewports.
- [x] **Auth flow (21/21 browser checks):**
  - Public CTAs (nav, hero, Solution section) all route to `/login`.
  - Unauthenticated `/dashboard` and all protected routes redirect to `/login`.
  - Invalid credentials rejected with an inline error, form stays on `/login`.
  - Demo pills fill the form only (no auto-login).
  - Successful login always lands on `/dashboard`; refresh keeps the session.
  - Sign-out destroys the PHP session (`me.php` → 401) and returns to `/login`; protected routes then redirect again.
- [x] **Feature flow (31/31 browser checks):** notifications bell dropdown + shared unread state, global quick-find search, Kanban button/drag-and-drop moves with confirmation and responsive stacking, and validated Settings saves.
- [x] **Customer CRUD API (7/7 browser checks):** Create, Read/Search, Update and Delete verified through the UI **and** re-read from MySQL; unauthenticated access returns HTTP 401.
- [x] **Indian mobile validation (41/41 browser checks):** the Add/Edit Customer form and `api/customers.php` both apply the strict `^[6-9][0-9]{9}$` rule. 4, 9 and 11-digit values, letters, a leading digit below 6 and empty input are all rejected with an inline error and no record is written; valid 10-digit numbers (bare, spaced, hyphenated or `+91`-prefixed) are normalised to `+91 98765 43210`. `POST` and `PUT` re-reject invalid numbers independently and a rejected update leaves the stored record untouched.
- [x] **Interaction polish (same run):** 160 ms page-content fade/slide on route change with header and sidebar staying stable, table rows and action buttons give hover feedback, pagination swaps rows without a page reload, wide tables scroll inside their container on a 390 px viewport, and `prefers-reduced-motion` disables the transition.
- [x] **Add Customer + Team filters (22/22 browser checks):** "+ Add Customer" opens the real modal (no placeholder browser alert ever fires), a bad phone is blocked client-side without any request, a valid create persists through PHP/MySQL, the count updates, the new row survives a full page reload, and edit/delete round-trip through the API. The Team filter row derives its department and role options from the dataset, combines search + department + role + status correctly, resets via Clear Filters, and shows an empty state when nothing matches.
- [x] **Loading polish + search control (28/28 browser checks):** the monetary KPI amounts on Dashboard and Sales fade in over a restrained 200 ms reveal with **no layout shift** (verified both by disabling the animation and comparing card geometry, and by observing zero Chrome layout-shift entries), remain INR-formatted with tabular figures, and the reveal is neutralised under `prefers-reduced-motion`. A failed `customers.php` request renders a clear error state with a Retry action and **zero fabricated rows**, then recovers to the real MySQL list. The Customers search field now carries an inline icon and a 40 px height matched to the Add Customer CTA, with an amber focus ring and full-width stacking (no overlap or horizontal overflow) at 390 px; email / company / name search, Clear and server pagination all still work. The Customers list is search-only (the `customers` table has no status column, so no status filter is offered).
- [x] **UI Routing & Views:** All 9 sections implemented with distinct content, adhering to the original warm-paper `#F6F4EF` and dark-ink `#12182B` design system.
