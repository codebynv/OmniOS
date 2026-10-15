# OmniOS — Syllabus-to-Feature Mapping Document

**Course:** IBSIT-304P — React With PHP Practical  
**Programme:** B.Sc. IT (Semester III) | LJ Institute of Computer Applications, LJ University  
**Syllabus Document:** `IBSIT-304P_Sem3_ReactPHP_Practical_Syllabus_v2.docx`  
**Scope:** Units I, II, III, and IV only.  
**Strict Scope Boundary:** Unit V (P-43 to P-52: REST API formalization, JWT auth, advanced CORS practicals) is **strictly excluded** and not claimed.  
**Domain Rule:** All implementations use OmniOS business entities (**Customers, Tasks, Orders, Admin Activity, KPI Metrics**) rather than generic student-management templates.

---

## 1. Executive Summary & Verification Methodology

Every practical syllabus concept across Units I through IV has been audited and mapped to a real business feature within the OmniOS application architecture.

### Status Tracking Rules
- **Planned**: Architecture and file targets defined, pending implementation.
- **Implemented**: Code written, verified on disk, and syntax/lint checked.
- **Tested**: Verified at runtime in the browser (DOM/Network) or via live HTTP/PHP execution against MySQL.

> **Workspace Audit (Current Baseline):**  
> - `client/` has a Vite + React 19 + React Router setup, currently with starter boilerplate.  
> - `frontend/` preserves the original vanilla HTML/CSS/JS prototype.  
> - `api/` and `database/` directories are not yet created.  
> - **All target syllabus items in the React + PHP architecture are currently marked `Planned`.** No topic is marked `Implemented` or `Tested` without inspection.

---

## 2. Unit-by-Unit Syllabus to Feature Mapping

---

### Unit I: HTML5, CSS3 and JavaScript Fundamentals (CO1, Practicals P-01 to P-10)

| # | Practical Ref | Exact Syllabus Concept | OmniOS Business Feature | Target File(s) | Demonstration / Testing Procedure | Status |
|---|---|---|---|---|---|---|
| 1 | **P-01** | DOCTYPE, html, head, title, body, meta viewport | Single Page Application entry HTML shell with semantic metadata | `client/index.html` | Inspect page source: verify `<!DOCTYPE html>`, `<html lang="en">`, `<meta name="viewport">`, descriptive `<title>` | Tested |
| 2 | **P-01** | Semantic tags: `<header>`, `<nav>`, `<main>`, `<section>`, `<aside>`, `<footer>` | App Shell layout structure wrapping navigation, topbar, and workspace | `client/src/components/Layout.jsx` | Inspect DOM in Chrome DevTools: verify semantic layout tags wrap header, sidebar navigation, main content, and footer | Tested |
| 3 | **P-01** | Heading hierarchy (`<h1>`–`<h6>`, `<p>`, `<span>`, `<div>`, `<a>`) | Page titles, KPI card headings, customer profile text hierarchy | `client/src/pages/Dashboard.jsx`, `client/src/pages/Customers.jsx` | Audit headings via DevTools: verify strict single `<h1>` per page, `<h2>` for sections, `<h3>` for cards | Tested |
| 4 | **P-01** | Images with descriptive `alt` text | OmniOS branding logo, customer avatars, empty state graphic | `client/src/components/Sidebar.jsx`, `client/src/components/CustomerTable.jsx` | Inspect `<img>` tags in DevTools: ensure meaningful `alt` attributes on logo and avatars | Planned |
| 5 | **P-02** | HTML Tables: `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` | Customer directory data table with status, revenue, and actions | `client/src/pages/Dashboard.jsx`, `client/src/pages/Orders.jsx` | Inspect Customers page: verify well-formed table markup with `<thead>` headers and `<tbody>` rows | Tested |
| 6 | **P-02** | HTML Forms: input types (`text`, `email`, `tel`, `select`, `date`, `number`, `textarea`) | Customer onboarding and edit modal/form | `client/src/components/CustomerForm.jsx` | Open Add Customer form: inspect field types (`email`, `tel`, `text`, `select` for tier/status) | Planned |
| 7 | **P-02** | Form labels, field grouping, buttons (`type="submit"`, `type="button"`) | Add/Edit Customer form accessibility and controls | `client/src/components/CustomerForm.jsx` | Verify every input has a matching `<label htmlFor="...">`, submit button triggers form submission | Planned |
| 8 | **P-03** | CSS Selectors (element, `.class`, `#id`), properties | Global typography, card styles, action button theme | `client/src/index.css`, `client/src/components/StatCard.css` | Inspect stylesheet: verify element reset rules, BEM-like class selectors for cards, ID selectors for specific anchors | Tested |
| 9 | **P-03** | CSS Box Model: content, padding, border, margin, `box-sizing: border-box` | Stat cards, data table cells, form control layout | `client/src/index.css`, `client/src/components/StatCard.css` | Inspect computed box model in DevTools: verify `box-sizing: border-box` on all elements, visible margins/padding | Tested |
| 10 | **P-04** | CSS Flexbox: `display: flex`, `justify-content`, `align-items`, `gap`, `flex-wrap` | Responsive topbar, sidebar menu alignment, KPI metric cards grid | `client/src/components/Layout.css`, `client/src/pages/Dashboard.css` | View computed CSS: verify flexbox container with `gap`, alignment, and `flex-wrap: wrap` on metric cards | Tested |
| 11 | **P-09** | CSS Responsive Design: `@media` queries, breakpoints (768px, 480px) | Adaptive app shell: collapsible sidebar and stacked tables on mobile | `client/src/index.css`, `client/src/components/Layout.css` | Resize viewport below 768px in DevTools: sidebar collapses to hamburger/drawer, cards stack vertically | Tested |
| 12 | **P-05** | JS Variables (`let`/`const`), data types, template literals | Data transformations, formatted currency and date strings | `client/src/utils/formatters.js`, `client/src/pages/Customers.jsx` | Review code: verify `const`/`let` usage without `var`, template literals `` `${customer.name} (${customer.company})` `` | Planned |
| 13 | **P-05** | JS Functions, arrow functions, parameter defaults | Event handlers, formatting utilities, API request wrappers | `client/src/services/api.js`, `client/src/utils/formatters.js` | Invoke formatters in console: test arrow functions with default params (e.g., `formatCurrency(val, currency = 'USD')`) | Planned |
| 14 | **P-06** | JS Arrays: `.map()`, `.filter()`, `.reduce()` | Client-side search filtering, revenue calculation, row rendering | `client/src/pages/Customers.jsx`, `client/src/pages/Dashboard.jsx` | Calculate total customer spend in Dashboard using `.reduce()`, filter customer list with `.filter()` | Planned |
| 15 | **P-06** | JS Objects, JSON serialization (`JSON.stringify()`, `JSON.parse()`) | Customer record payload formatting for API requests | `client/src/services/api.js` | Inspect Network tab: verify `JSON.stringify()` creates outbound POST payload; response parsed to JS object | Planned |
| 16 | **P-07** | DOM concepts & Virtual DOM comparison | Reactive UI state updates vs. imperative DOM manipulation | `client/src/components/CustomerTable.jsx` (vs `frontend/script.js`) | Demonstrate reactive DOM mutation in React without manual `document.createElement()` or `appendChild()` | Planned |
| 17 | **P-08** | Event handling: `click`, `submit`, `event.preventDefault()` | Customer form submission interception and action buttons | `client/src/components/CustomerForm.jsx` | Submit form: page does not reload (`e.preventDefault()` active); validation runs cleanly | Planned |
| 18 | **P-08** | Client-side form validation with visual feedback | Required fields (name, email format, phone digits), error text in red | `client/src/components/CustomerForm.jsx` | Submit invalid email/empty name: verify red validation warning messages below corresponding fields | Planned |
| 19 | **P-10** | Fetch API: `async`/`await`, `try`/`catch`, loading states | Asynchronous customer retrieval from PHP backend | `client/src/services/api.js`, `client/src/pages/Customers.jsx` | Open Customers page: observe loading spinner, successful JSON fetch via async/await, error banner if server stopped | Planned |

---

### Unit II: PHP Fundamentals and Server-Side Programming (CO2, Practicals P-11 to P-20)

| # | Practical Ref | Exact Syllabus Concept | OmniOS Business Feature | Target File(s) | Demonstration / Testing Procedure | Status |
|---|---|---|---|---|---|---|
| 20 | **P-11** | PHP tags `<?php ?>`, `echo`, data types, `var_dump()` | System health check and runtime diagnostic endpoint | `api/health.php` | Access `http://localhost/OmniOS/api/health.php`: verify JSON output with PHP version, OS, timestamp | Tested |
| 21 | **P-12** | Operators, strict comparison (`===` vs `==`), control flow (`if`/`elseif`/`else`) | HTTP request method routing and action dispatching | `api/customers.php` | Inspect routing block: verify strict `$_SERVER['REQUEST_METHOD'] === 'GET'` dispatching | Tested |
| 22 | **P-12** | Control flow: `switch-case` and ternary operator | Status code mapping and default query parameter assignment | `api/customers.php`, `api/config/db.php` | Test invalid HTTP method: switch statement returns `405 Method Not Allowed`; test ternary for defaults | Tested |
| 23 | **P-13** | Loops: `for`, `while`, `foreach` | Iterating MySQL result sets and batch data transformation | `api/customers.php` | Verify `while ($row = mysqli_fetch_assoc($result))` iterating customer rows; `foreach` validating input keys | Tested |
| 24 | **P-14** | PHP Arrays: indexed, associative, multidimensional, `count()`, `in_array()` | Customer record representation, status whitelisting | `api/customers.php`, `api/config/db.php` | Inspect PHP payload: associative array per customer, whitelisting status (`in_array($status, ['active','lead','inactive'])`) | Tested |
| 25 | **P-15** | String functions: `strlen()`, `strtolower()`, `trim()`, `substr()`, `htmlspecialchars()` | Input sanitization, company/email normalization | `api/customers.php` | Test input trimming and email lowercasing; verify `htmlspecialchars()` prevents XSS payload injection | Tested |
| 26 | **P-15** | User-defined functions, parameters, return types | Reusable database response formatters and validation helpers | `api/config/db.php`, `api/customers.php` | Code review: verify `sendJsonResponse($statusCode, $payload)` and `getDbConnection()` with return values | Tested |
| 27 | **P-16** | Form handling: `$_GET`, `$_POST`, `$_SERVER`, `isset()`, `empty()` | API request parameter ingestion and query string parsing | `api/customers.php` | Test `GET /api/customers.php?id=1`: read `$_GET['id']` with `isset()`; verify safe empty check handling | Tested |
| 28 | **P-17** | File operations: `fopen()`, `fwrite()`, `fclose()`, `file_get_contents()` | OmniOS operational audit log (visitor / API request logger) | `api/helpers/logger.php`, `api/logs/requests.log` | Trigger API requests: open `api/logs/requests.log` to verify timestamped append logs (`fopen('...','a')`) | Planned |
| 29 | **P-18** | Sessions: `session_start()`, `$_SESSION`, `session_destroy()` | Standalone business session demo (operator session counter & state) | `api/demo/session_demo.php` | Open `http://localhost/OmniOS/api/demo/session_demo.php`: refresh page to see session visit counter increment, click reset | Planned |
| 30 | **P-18** | Cookies: `setcookie()`, `$_COOKIE` with expiration | Standalone workspace cookie demo (operator theme preference: dark/light) | `api/demo/cookie_demo.php` | Open `http://localhost/OmniOS/api/demo/cookie_demo.php`: toggle theme cookie, refresh page to observe cookie persistence | Planned |
| 31 | **P-19** | MySQL connection with `mysqli_connect()`, error handling | Database connection management | `api/config/db.php` | Call `api/health.php`: verify `"database": "connected"`; simulate bad password to verify safe error handling | Tested |
| 32 | **P-19** | SQL `CREATE TABLE IF NOT EXISTS` execution via PHP | Initial database bootstrapping script | `database/schema.sql`, `api/health.php` | Run setup script: verify table `customers` created in MySQL with correct column constraints | Tested |
| 33 | **P-20** | `mysqli_query()`, `mysqli_fetch_assoc()`, `mysqli_num_rows()` | Fetch customer directory rows and total record counts | `api/customers.php`, `api/health.php` | Execute GET request: verify record count returned matches `mysqli_num_rows($result)` | Tested |

---

### Unit III: PHP with MySQL — CRUD Web Application (CO3, Practicals P-21 to P-31)

| # | Practical Ref | Exact Syllabus Concept | OmniOS Business Feature | Target File(s) | Demonstration / Testing Procedure | Status |
|---|---|---|---|---|---|---|
| 34 | **P-21** | Database schema design: `INT`, `VARCHAR`, `TEXT`, `DECIMAL`, `DATE`, PK, AUTO_INCREMENT, NOT NULL | OmniOS `customers` relational database table | `database/schema.sql` | Inspect `schema.sql` and phpMyAdmin: verify primary key, auto increment, email uniqueness, balance decimal(10,2) | Tested |
| 35 | **P-22** | PHP INSERT with server-side validation | Customer creation endpoint | `api/customers.php` (POST handler) | Submit Add Customer form: inspect MySQL to confirm new row inserted; verify HTTP 201 response | Tested |
| 36 | **P-23** | PHP SELECT with `ORDER BY`, `WHERE` | Customer listing and single customer view | `api/customers.php` (GET handler) | Call `GET /api/customers.php`: verify records returned ordered by `created_at DESC`; call `?id=1` for single customer | Tested |
| 37 | **P-24** | PHP UPDATE flow: fetch by id, pre-fill, execute `UPDATE ... WHERE id = ?` | Customer edit and record updating | `api/customers.php` (PUT handler) | Click Edit on customer: form pre-fills, change phone/company, save: verify MySQL row updated | Tested |
| 38 | **P-25** | PHP DELETE with confirmation | Customer deletion with confirmation prompt | `api/customers.php` (DELETE handler) | Click Delete: confirm in dialog: verify record deleted from MySQL and row removed from UI | Tested |
| 39 | **P-26** | SQL `LIKE` operator search & filter | Customer multi-field search (by name, email, company) | `api/customers.php` (`?search=` param) | Type "Acme" into search bar: backend executes `WHERE name LIKE ? OR company LIKE ?`; matching rows returned | Tested |
| 40 | **P-27** | Password hashing (`password_hash()`, `password_verify()`) & session auth | Standalone operator authentication demo | `api/demo/login_demo.php`, `api/demo/dashboard_demo.php` | Open login demo: authenticate with hashed credentials, access session-protected page, click logout | Planned |
| 41 | **P-28** | Server-side duplicate validation (duplicate email check) | Customer email uniqueness enforcement before INSERT | `api/customers.php` | Attempt creating customer with existing email: API rejects with HTTP 409 and descriptive error message | Tested |
| 42 | **P-29** | PHP File Upload: `$_FILES`, `move_uploaded_file()`, validation (MIME, size) | Customer avatar / logo upload (limited practical scope) | `api/upload.php` | Upload `.png` avatar: verify MIME check, size `< 2MB`, saved in `uploads/` with unique filename | Planned |
| 43 | **P-30** | Database pagination: `LIMIT`, `OFFSET`, `ceil(total / per_page)` | Customer directory paginated views (5 or 10 per page) | `api/customers.php` (`?page=&limit=`) | Click page 2: verify API executes `LIMIT 5 OFFSET 5`, total pages calculated, page indicator updates | Tested |
| 44 | **P-31** | Complete PHP CRUD application integration | Full customer management lifecycle with data integrity | `api/customers.php`, `database/schema.sql` | Demonstrate end-to-end: Add -> View -> Search -> Page -> Edit -> Delete with MySQL persistence | Tested |

---

### Unit IV: React.js — Components, Hooks and Routing (CO4, Practicals P-32 to P-42)

| # | Practical Ref | Exact Syllabus Concept | OmniOS Business Feature | Target File(s) | Demonstration / Testing Procedure | Status |
|---|---|---|---|---|---|---|
| 45 | **P-32** | React setup with Vite, project structure, component hierarchy | OmniOS Single Page Application structure | `client/src/main.jsx`, `client/src/App.jsx` | Launch `npm run dev`: verify clean React 19 app mount at `http://localhost:5173` | Tested |
| 46 | **P-32** | JSX syntax rules: `className`, self-closing tags, single root, `{}` expressions | Component template definitions | All `.jsx` files in `client/src/` | Code inspection: verify standard JSX syntax, zero `class` attributes, proper curly brace evaluations | Tested |
| 47 | **P-32** | Functional components with default and named exports | Reusable UI atoms and compound pages | `client/src/components/`, `client/src/pages/` | Verify components are pure functions returning JSX with clean modular export structure | Tested |
| 48 | **P-33** | Props: parent-to-child data flow, props destructuring | Metric KPI cards, customer status badge component | `client/src/components/StatCard.jsx`, `client/src/components/StatusBadge.jsx` | Pass `{ title, value, change, icon }` to `StatCard`; pass `{ status }` to `StatusBadge`; verify visual rendering | Tested |
| 49 | **P-33** | Read-only props constraint | Component data isolation | `client/src/components/StatCard.jsx` | Code review: verify components never mutate props, emitting events via parent callbacks instead | Tested |
| 50 | **P-34** | `useState`: state declaration, setter function, re-rendering | Filter toggles, modal open/close state, customer form state | `client/src/components/Layout.jsx`, `client/src/pages/Tasks.jsx` | Mobile sidebar toggle, task completion toggling triggers state update & re-render | Tested |
| 51 | **P-34** | `useState`: Counter / interactive widget | Quick task priority counter / summary counter widget | `client/src/pages/Tasks.jsx` | Click increment/decrement buttons: observe immediate local state re-render with priority shift | Tested |
| 52 | **P-35** | Event handling: `onClick`, `onChange`, `onSubmit`, synthetic events | Form inputs, action buttons, table sorting clicks | `client/src/pages/Tasks.jsx`, `client/src/components/Layout.jsx` | Click buttons: triggers `onClick` with synthetic event handling | Tested |
| 53 | **P-35** | Arrow functions in JSX event handlers | Inline event dispatchers with parameter passing | `client/src/pages/Tasks.jsx` | Inspect button: `onClick={() => toggleTaskStatus(task.id)}`; verify task ID passed properly | Tested |
| 54 | **P-36** | Conditional rendering with ternary operator (`condition ? <A/> : <B/>`) | Loading spinner vs. customer data table | `client/src/pages/Customers.jsx` | Observe initial fetch: spinner displays while `loading === true`, flips to table when data arrives | Planned |
| 55 | **P-36** | Conditional rendering with short-circuit `&&` | Error banners, badge alerts, empty state notices | `client/src/components/Layout.jsx`, `client/src/components/Sidebar.jsx` | Backdrop rendered with `{isOpen && <div className="sidebar-backdrop" />}` | Tested |
| 56 | **P-36** | Conditional rendering by returning `null` | Conditionally suppressed subcomponents | `client/src/components/Pagination.jsx` | When `totalPages <= 1`, pagination component returns `null` to keep UI uncluttered | Planned |
| 57 | **P-37** | Lists and keys: `.map()` array rendering | Dynamic customer table rows, task cards, order items | `client/src/pages/Dashboard.jsx`, `client/src/pages/Tasks.jsx`, `client/src/pages/Orders.jsx` | Inspect rendered lists: verify generated via `.map()` each with stable key prop | Tested |
| 58 | **P-37** | Unique `key` prop requirement (no array indices for keys) | Stable list reconciliation during deletion / reordering | `client/src/pages/Dashboard.jsx`, `client/src/pages/Tasks.jsx`, `client/src/pages/Orders.jsx` | Each element uses unique business ID (`key={kpi.title}`, `key={task.id}`, `key={order.id}`) | Tested |
| 59 | **P-38** | Controlled forms: state-backed inputs, single source of truth | Customer create/edit input fields | `client/src/components/CustomerForm.jsx` | Inspect React DevTools: form state matches input `value` exactly on every keystroke | Planned |
| 60 | **P-38** | Form validation with inline error state in React | Field-level error messages beneath invalid inputs | `client/src/components/CustomerForm.jsx` | Blur or submit with invalid email: inline `errors.email` renders in red without submitting | Planned |
| 61 | **P-39** | `useEffect` with empty dependency array `[]` (mount fetch) | Automatic customer data loading on component mount | `client/src/components/Header.jsx` | Header mounts -> `useEffect` with `[]` fetches `/api/health.php` -> live status badge updates | Tested |
| 62 | **P-40** | `useEffect` with dependency array (reactive fetch / debounced search) | Auto-filter customer records when search query changes | `client/src/pages/Customers.jsx` | Type in search box: `useEffect` with `[searchQuery, currentPage]` triggers filtered API fetch | Planned |
| 63 | **P-40** | React fetch error handling (try-catch, HTTP status check) | Network failure and server error resilience | `client/src/services/api.js`, `client/src/pages/Customers.jsx` | Stop MySQL service: app displays user-friendly error card with "Retry" button rather than crashing | Planned |
| 64 | **P-41** | React Router v6: `BrowserRouter`, `Routes`, `Route` | Multi-page client SPA routing | `client/src/App.jsx` | Navigate between `/`, `/customers`, `/tasks`, `/orders`: URL updates instantly without full browser reload | Tested |
| 65 | **P-41** | Navigation components: `Link` and `NavLink` with active styling | Sidebar navigation bar with current page highlight | `client/src/components/Sidebar.jsx` | Click navigation links: verify active route gets `.active` CSS class, page changes without reload | Tested |
| 66 | **P-41** | Programmatic navigation with `useNavigate()` hook | Redirect to customer list after form submission | `client/src/components/CustomerForm.jsx` | Complete customer creation: form submits, notification shown, programmatic redirect to `/customers` | Planned |
| 67 | **P-42** | Lifting State Up: parent-to-child data sharing & callbacks | `Customers.jsx` parent manages list & selected customer for `CustomerForm` & `CustomerTable` | `client/src/pages/Customers.jsx` | Click Edit on `CustomerTable`: parent state updates `selectedCustomer`, passing it down to `CustomerForm` modal | Planned |
| 68 | **P-42** | Child callback triggering parent state update | Form submission refreshes parent customer list | `client/src/components/CustomerForm.jsx` -> `client/src/pages/Customers.jsx` | `CustomerForm` calls `onCustomerSaved(updatedCustomer)` callback to update parent customer list in place | Planned |

---

## 3. Scope Boundary: Exclusion of Unit V

| Unit V Practical | Topic in Syllabus | Reason for Strict Exclusion |
|---|---|---|
| **P-43 to P-45** | Formal REST API specifications, HTTP OPTIONS preflights, RFC status codes | Excluded from syllabus scope per project instructions. |
| **P-46 to P-50** | Advanced full-stack CORS deep dive & manual REST clients | Core CRUD functionality is covered under Units II, III, and IV. |
| **P-51** | JWT Authentication tokens (base64 encode/decode, Authorization header) | Excluded. Session/cookie concepts are covered in Unit II and III demos. |
| **P-52** | Full-Stack Capstone final project | Immediate goal is a working partial demonstration focusing on Customer CRUD. |

---

## 4. Proposed Implementation Sequence

To ensure stable, testable progress, implementation is organized into four sequential phases. Each step will be verified before moving to the next.

```text
┌────────────────────────────────────────────────────────┐
│  Phase 1: Database & PHP Backend Services (Units II/III)│
│  - MySQL schema creation (`database/schema.sql`)       │
│  - DB connection & Health endpoint (`api/health.php`)  │
│  - Prepared Statement CRUD API (`api/customers.php`)   │
│  - Standalone Session/Cookie Demos (`api/demo/`)       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  Phase 2: React Foundation & App Shell (Units I/IV)    │
│  - Design tokens, CSS flexbox & responsive layout      │
│  - React Router configuration (`App.jsx`)              │
│  - Sidebar, Header, StatCard components                │
│  - Dashboard page with business metrics                │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  Phase 3: Customer CRUD React Integration (Units III/IV)│
│  - API client service (`client/src/services/api.js`)   │
│  - CustomerTable component with loading & error states │
│  - Controlled CustomerForm modal with validation       │
│  - Search filtering & Pagination controls              │
│  - State lifting & optimistic / fresh updates          │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  Phase 4: Verification, Testing & Demonstration        │
│  - Verify full CRUD against live MySQL database        │
│  - Test responsive breakpoints (mobile/tablet/desktop) │
│  - Verify audit logging in `api/logs/requests.log`     │
│  - Update status in syllabus-mapping.md to Implemented/Tested │
└────────────────────────────────────────────────────────┘
```

### Detailed Phase Steps

1. **Step 1: Database Foundation (`database/schema.sql`)**
   - Design `customers` table with: `id` (PK, AUTO_INCREMENT), `name` (VARCHAR), `email` (VARCHAR, UNIQUE), `phone` (VARCHAR), `company` (VARCHAR), `status` (VARCHAR/ENUM), `balance` (DECIMAL), `created_at` (TIMESTAMP).
   - Insert 5 realistic business records.

2. **Step 2: PHP Core & Health Check (`api/config/database.php`, `api/health.php`)**
   - Create resilient `mysqli` connection with JSON error responses.
   - Test connectivity at `http://localhost/OmniOS/api/health.php`.

3. **Step 3: Customer CRUD API with Prepared Statements (`api/customers.php`)**
   - Implement `GET` (all + by id + search + pagination).
   - Implement `POST` (insert with email uniqueness check and sanitization).
   - Implement `PUT` (update existing customer).
   - Implement `DELETE` (delete customer by id).
   - Request logging via `api/helpers/logger.php`.

4. **Step 4: Supplementary Demos (`api/demo/`)**
   - `session_demo.php`: Session counter and identity.
   - `cookie_demo.php`: Theme/preference cookie toggle.

5. **Step 5: React App Shell & Styling (`client/src/`)**
   - Clean, professional CSS design system with CSS variables, Flexbox, and responsive media queries.
   - App shell with `Layout`, `Sidebar`, `Header`, and React Router navigation.

6. **Step 6: Customer Management Page (`client/src/pages/Customers.jsx`)**
   - Full parent-child state management: `Customers` (parent) -> `CustomerTable` (child) + `CustomerForm` (child) + `Pagination` + `SearchBar`.
   - Complete CRUD interactions with live MySQL persistence.
