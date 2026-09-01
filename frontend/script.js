/**
 * OmniOS Business Operating System — Interactive Prototype Logic
 * Pure Vanilla JavaScript (No frameworks, No backend dependencies)
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. DATA REPOSITORIES (Static / Hardcoded UI Data)
  // =========================================================================

  const CUSTOMERS_DATA = [
    { id: 1, name: 'Rajesh Sharma', email: 'rajesh@sharmatraders.in', company: 'Sharma Traders', status: 'Active', lastContact: '2 hours ago', spent: '₹1,24,000' },
    { id: 2, name: 'Priya Patel', email: 'priya.p@apexglobal.com', company: 'Apex Global Logistics', status: 'Active', lastContact: 'Yesterday', spent: '₹2,45,000' },
    { id: 3, name: 'Amit Desai', email: 'amit@desaitech.com', company: 'Desai Tech Solutions', status: 'Lead', lastContact: '3 days ago', spent: '₹0' },
    { id: 4, name: 'Sunita Mehta', email: 'sunita@mehtagroup.org', company: 'Mehta Group', status: 'Active', lastContact: '4 days ago', spent: '₹88,500' },
    { id: 5, name: 'Vikram Verma', email: 'v.verma@horizonbuild.in', company: 'Horizon Builders', status: 'Inactive', lastContact: '2 weeks ago', spent: '₹42,000' },
    { id: 6, name: 'Ananya Rao', email: 'ananya@zenithenterprise.com', company: 'Zenith Enterprise', status: 'Active', lastContact: 'Today', spent: '₹3,10,000' },
    { id: 7, name: 'Rohan Gupta', email: 'rohan.g@guptaretail.in', company: 'Gupta Retailers', status: 'Lead', lastContact: '5 days ago', spent: '₹0' },
    { id: 8, name: 'Neha Joshi', email: 'neha@joshiadvisors.in', company: 'Joshi Financial Advisors', status: 'Active', lastContact: '1 day ago', spent: '₹1,95,000' },
    { id: 9, name: 'Suresh Nair', email: 'suresh@nairindustries.com', company: 'Nair Industrial Parts', status: 'Inactive', lastContact: '1 month ago', spent: '₹64,000' },
    { id: 10, name: 'Pooja Kulkarni', email: 'pooja@kulkarnidesign.studio', company: 'Kulkarni Design Studio', status: 'Active', lastContact: '3 hours ago', spent: '₹76,000' },
    { id: 11, name: 'Manish Chawla', email: 'manish@chawlasupply.com', company: 'Chawla Supplies Corp', status: 'Active', lastContact: 'Yesterday', spent: '₹1,52,000' },
    { id: 12, name: 'Divya Iyer', email: 'divya@iyeranalytics.io', company: 'Iyer Data Labs', status: 'Lead', lastContact: 'Just now', spent: '₹0' }
  ];

  let tasksData = [
    { id: 'task-1', title: 'Confirm Patel Traders bulk delivery', desc: 'Verify courier tracking number for six ergonomic office chairs and dispatch delivery receipt.', status: 'done', priority: 'High', assignee: 'Nirav V.', initials: 'NV', dueDate: 'Today, 2:00 PM' },
    { id: 'task-2', title: 'Call back N. Desai — overdue payment', desc: 'Follow up on the pending ₹2,150 invoice for printer cartridges supplied last week.', status: 'todo', priority: 'High', assignee: 'Harsh J.', initials: 'HJ', dueDate: 'Today, 5:30 PM' },
    { id: 'task-3', title: 'Send quotation to K. Mehta', desc: 'Prepare revised pricing breakdown for storefront signage installation and warranty terms.', status: 'in-progress', priority: 'Medium', assignee: 'Yash C.', initials: 'YC', dueDate: 'Tomorrow' },
    { id: 'task-4', title: 'Update stationery stock count', desc: 'Perform weekly physical count of reams, markers, and folders in warehouse bin #4.', status: 'todo', priority: 'Low', assignee: 'Vishal', initials: 'V', dueDate: 'Thursday' },
    { id: 'task-5', title: 'Prepare GST return filing figures', desc: 'Reconcile sales ledger entries with GSTR-1 generated report before CA submission.', status: 'in-progress', priority: 'High', assignee: 'Manaswi K.', initials: 'MK', dueDate: 'Friday' },
    { id: 'task-6', title: 'Draft Q3 AMC renewal agreement', desc: 'Create service contract draft for Shah Enterprises covering 12-month server maintenance.', status: 'done', priority: 'Medium', assignee: 'Nirav V.', initials: 'NV', dueDate: 'Yesterday' },
    { id: 'task-7', title: 'Integrate new lead intake webhook', desc: 'Connect landing page inquiry form to internal CRM customer database pipeline.', status: 'todo', priority: 'Medium', assignee: 'Tirtha B.', initials: 'TB', dueDate: 'Aug 28' },
    { id: 'task-8', title: 'Client onboarding meeting with Zenith', desc: 'Conduct introductory operational setup sync with Ananya Rao and her operations team.', status: 'in-progress', priority: 'High', assignee: 'Yash C.', initials: 'YC', dueDate: 'Sep 02' },
    { id: 'task-9', title: 'Archiving quarterly order receipts', desc: 'Compress and upload scanned signed delivery challans to cloud storage vault.', status: 'done', priority: 'Low', assignee: 'Harsh J.', initials: 'HJ', dueDate: 'Aug 20' }
  ];

  const ORDERS_DATA = [
    { id: 'ORD-9401', customer: 'R. Sharma', item: 'Bulk Stationery Pack', amount: '₹8,400', status: 'Pending', date: 'Today, 11:20 AM', method: 'UPI' },
    { id: 'ORD-9402', customer: 'Patel Traders', item: 'Office Chairs ×6', amount: '₹27,000', status: 'Delivered', date: 'Yesterday', method: 'NEFT' },
    { id: 'ORD-9403', customer: 'N. Desai', item: 'Printer Cartridges ×4', amount: '₹2,150', status: 'Overdue', date: '3 days ago', method: 'Pending' },
    { id: 'ORD-9404', customer: 'Shah Enterprises', item: 'Annual Server AMC', amount: '₹45,000', status: 'Delivered', date: '4 days ago', method: 'Net Banking' },
    { id: 'ORD-9405', customer: 'K. Mehta', item: 'Custom Store Signage', amount: '₹6,800', status: 'Processing', date: '5 days ago', method: 'Card' },
    { id: 'ORD-9406', customer: 'Zenith Corp', item: 'Workstation Setup ×10', amount: '₹1,20,000', status: 'Processing', date: '1 week ago', method: 'NEFT' },
    { id: 'ORD-9407', customer: 'Joshi Advisors', item: 'Network Router Setup', amount: '₹14,500', status: 'Delivered', date: '1 week ago', method: 'UPI' },
    { id: 'ORD-9408', customer: 'Chawla Supplies', item: 'Thermal Printer Paper', amount: '₹4,900', status: 'Pending', date: '2 weeks ago', method: 'Cash' }
  ];

  const TEAM_DATA = [
    { name: 'Nirav Vala', initials: 'NV', role: 'Project Lead & Developer', email: 'nirav@omnios.local', status: 'online', dept: 'Engineering', tasks: 3 },
    { name: 'Harsh Joshi', initials: 'HJ', role: 'Backend & Database Lead', email: 'harsh.j@omnios.local', status: 'online', dept: 'Backend', tasks: 2 },
    { name: 'Yash Chauhan', initials: 'YC', role: 'Frontend & UI Developer', email: 'yash.c@omnios.local', status: 'online', dept: 'Frontend', tasks: 3 },
    { name: 'Tirtha Bharambhat', initials: 'TB', role: 'UI/UX Designer & Research', email: 'tirtha.b@omnios.local', status: 'online', dept: 'Design', tasks: 2 },
    { name: 'Manaswi Khuman', initials: 'MK', role: 'QA & Compliance Specialist', email: 'manaswi.k@omnios.local', status: 'offline', dept: 'Testing & QA', tasks: 1 },
    { name: 'Vishal', nickname: 'Insane', initials: 'V', role: 'Operations & Documentation', email: 'vishal@omnios.local', status: 'offline', dept: 'Operations', tasks: 2 }
  ];

  const NOTIFICATIONS_DATA = [
    { id: 1, title: 'Sales Dip Alert', desc: 'Weekly revenue dipped 6% vs prior period. 3 customer follow-ups remain overdue.', time: '10 mins ago', icon: '📉', unread: true },
    { id: 2, title: 'New Customer Registered', desc: 'Divya Iyer from Iyer Data Labs created an account.', time: '1 hour ago', icon: '👤', unread: true },
    { id: 3, title: 'Order Delivered', desc: 'Order #ORD-9402 (Office Chairs ×6) was marked delivered by courier.', time: 'Yesterday', icon: '📦', unread: false },
    { id: 4, title: 'Task Completed', desc: 'Nirav V. completed "Draft Q3 AMC renewal agreement".', time: '1 day ago', icon: '✅', unread: false },
    { id: 5, title: 'Backup Successful', desc: 'Automated nightly database backup completed.', time: '2 days ago', icon: '🗄️', unread: false },
    { id: 6, title: 'Invoice Overdue Notice', desc: 'N. Desai invoice #ORD-9403 is now 3 days past payment term.', time: '3 days ago', icon: '⚠️', unread: false }
  ];

  // =========================================================================
  // 2. NAVIGATION & VIEW SWITCHING LOGIC + KPI COUNT-UP ANIMATION
  // =========================================================================

  const navItems = document.querySelectorAll('.nav-item[data-view]');
  const viewSections = document.querySelectorAll('.view-section');
  const pageTitle = document.getElementById('pageTitle');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');

  const viewTitles = {
    dashboard: 'Dashboard',
    customers: 'Customers Directory',
    tasks: 'Task Kanban Board',
    orders: 'Orders & Fulfillment',
    team: 'Team Workspace',
    sales: 'Sales & Revenue',
    analytics: 'Analytics & BI',
    notifications: 'Notifications',
    settings: 'System Settings'
  };

  /**
   * Smooth count-up animation for KPI stat card numbers
   */
  function animateKPIs(container) {
    if (!container) return;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const valElements = container.querySelectorAll('.kpi-card .val');

    valElements.forEach(el => {
      // Store original text if not already stored
      if (!el.getAttribute('data-target-val')) {
        el.setAttribute('data-target-val', el.textContent.trim());
      }

      const rawText = el.getAttribute('data-target-val');
      if (isReduced) {
        el.textContent = rawText;
        return;
      }

      // Parse format: e.g. "₹4,82,500", "₹34.42L", "24.8%", "14 Days", "146", "6"
      const prefixMatch = rawText.match(/^[^\d.]*/);
      const prefix = prefixMatch ? prefixMatch[0] : '';
      const suffixMatch = rawText.match(/[^\d.]*$/);
      const suffix = suffixMatch ? suffixMatch[0] : '';

      const numStr = rawText.slice(prefix.length, rawText.length - suffix.length).replace(/,/g, '');
      const targetNum = parseFloat(numStr);

      if (isNaN(targetNum)) {
        el.textContent = rawText;
        return;
      }

      const hasDecimals = numStr.includes('.');
      const decimalPlaces = hasDecimals ? numStr.split('.')[1].length : 0;
      const hasCommas = rawText.includes(',');

      const duration = 650; // ms
      const startTime = performance.now();

      function formatNumber(num) {
        if (hasDecimals) {
          return num.toFixed(decimalPlaces);
        }
        const rounded = Math.round(num);
        if (hasCommas) {
          return rounded.toLocaleString('en-IN');
        }
        return rounded.toString();
      }

      function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutCubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const currentNum = targetNum * ease;

        el.textContent = `${prefix}${formatNumber(currentNum)}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          el.textContent = rawText;
        }
      }

      requestAnimationFrame(update);
    });
  }

  let isSwitching = false;

  function switchView(targetViewId) {
    if (!targetViewId || isSwitching) return;

    const currentActiveSection = document.querySelector('.view-section.active');
    const targetSection = document.getElementById(`view-${targetViewId}`);
    if (!targetSection) return;

    // Update Nav
    navItems.forEach(item => {
      if (item.getAttribute('data-view') === targetViewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update Topbar Title
    if (pageTitle && viewTitles[targetViewId]) {
      pageTitle.textContent = viewTitles[targetViewId];
    }

    // Close Mobile Drawer if open
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      sidebar.classList.remove('mobile-open');
    }

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function activateTarget() {
      viewSections.forEach(sec => {
        sec.classList.remove('active', 'view-leaving');
      });

      targetSection.classList.add('active');

      // Trigger KPI count-up
      animateKPIs(targetSection);

      // Re-trigger bar chart animations when entering charts
      if (targetViewId === 'dashboard') {
        renderDashboardSalesChart();
      } else if (targetViewId === 'sales') {
        renderSalesMonthlyChart();
      }

      window.scrollTo({ top: 0, behavior: isReduced ? 'auto' : 'smooth' });
      isSwitching = false;
    }

    if (currentActiveSection && currentActiveSection !== targetSection && !isReduced) {
      isSwitching = true;
      currentActiveSection.classList.add('view-leaving');
      setTimeout(activateTarget, 90);
    } else {
      activateTarget();
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      switchView(view);
    });
  });

  // Bell icon click opens notifications
  const notifBtn = document.getElementById('notifBtn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      switchView('notifications');
    });
  }

  // Mobile menu toggle
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }

  // =========================================================================
  // 3. DASHBOARD CHARTS & RECENT ACTIVITY
  // =========================================================================

  function renderDashboardSalesChart() {
    const chartContainer = document.getElementById('dashSalesChart');
    if (!chartContainer) return;

    const data = [
      { day: 'Mon', val: 34000 },
      { day: 'Tue', val: 42500 },
      { day: 'Wed', val: 28000 },
      { day: 'Thu', val: 56000 },
      { day: 'Fri', val: 48000 },
      { day: 'Sat', val: 68500 }, // Peak
      { day: 'Sun', val: 39000 }
    ];

    const max = Math.max(...data.map(d => d.val));
    chartContainer.innerHTML = '';

    data.forEach(item => {
      const col = document.createElement('div');
      const isPeak = item.val === max;
      col.className = `col ${isPeak ? 'peak' : ''}`;
      
      const pct = Math.round((item.val / max) * 100);
      col.innerHTML = `
        <div class="stick" data-tooltip="${item.day}: ₹${item.val.toLocaleString('en-IN')}" title="${item.day}: ₹${item.val.toLocaleString('en-IN')}">
          <div class="fill" style="height: ${pct}%;"></div>
        </div>
        <span class="lbl">${item.day}</span>
      `;
      chartContainer.appendChild(col);
    });
  }

  // =========================================================================
  // 4. CUSTOMERS DIRECTORY (Live Search & Filter)
  // =========================================================================

  const customerTableBody = document.getElementById('customerTableBody');
  const customerSearchInput = document.getElementById('customerSearch');
  const customerStatusFilter = document.getElementById('customerStatusFilter');
  const customerCountDisplay = document.getElementById('customerCountDisplay');

  function renderCustomersTable() {
    if (!customerTableBody) return;

    const query = (customerSearchInput ? customerSearchInput.value : '').toLowerCase().trim();
    const statusFilter = customerStatusFilter ? customerStatusFilter.value : 'all';

    const filtered = CUSTOMERS_DATA.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.company.toLowerCase().includes(query);

      const matchesStatus = (statusFilter === 'all') || (c.status.toLowerCase() === statusFilter.toLowerCase());

      return matchesSearch && matchesStatus;
    });

    if (customerCountDisplay) {
      customerCountDisplay.textContent = `Showing ${filtered.length} of ${CUSTOMERS_DATA.length} customers`;
    }

    if (filtered.length === 0) {
      customerTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding: 28px; color: var(--slate);">
            No matching customers found for "${query}".
          </td>
        </tr>
      `;
      return;
    }

    customerTableBody.innerHTML = filtered.map(c => {
      let badgeClass = 'tag lead';
      if (c.status === 'Active') badgeClass = 'tag ok';
      else if (c.status === 'Inactive') badgeClass = 'tag risk';

      return `
        <tr>
          <td>
            <strong style="color: var(--ink); display:block;">${c.name}</strong>
            <span style="font-size:0.75rem; color:var(--slate);">${c.company}</span>
          </td>
          <td style="font-family: var(--mono); font-size: 0.8rem;">${c.email}</td>
          <td><span class="${badgeClass}">${c.status}</span></td>
          <td style="font-family: var(--mono); font-size: 0.78rem; color: var(--slate);">${c.lastContact}</td>
          <td style="font-family: var(--mono); font-weight:600; text-align:right;">${c.spent}</td>
        </tr>
      `;
    }).join('');
  }

  if (customerSearchInput) {
    customerSearchInput.addEventListener('input', renderCustomersTable);
  }
  if (customerStatusFilter) {
    customerStatusFilter.addEventListener('change', renderCustomersTable);
  }

  // =========================================================================
  // 5. KANBAN BOARD & DRAG-AND-DROP + MODAL
  // =========================================================================

  const colTodo = document.getElementById('col-todo');
  const colProg = document.getElementById('col-in-progress');
  const colDone = document.getElementById('col-done');

  const countTodo = document.getElementById('count-todo');
  const countProg = document.getElementById('count-prog');
  const countDone = document.getElementById('count-done');

  // Modal elements
  const taskModal = document.getElementById('taskModal');
  const modalTaskTitle = document.getElementById('modalTaskTitle');
  const modalTaskDesc = document.getElementById('modalTaskDesc');
  const modalTaskAssignee = document.getElementById('modalTaskAssignee');
  const modalTaskDueDate = document.getElementById('modalTaskDueDate');
  const modalTaskPriority = document.getElementById('modalTaskPriority');
  const modalTaskStatus = document.getElementById('modalTaskStatus');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalCloseAction = document.getElementById('modalCloseAction');

  function openTaskModal(taskId) {
    const task = tasksData.find(t => t.id === taskId);
    if (!task || !taskModal) return;

    modalTaskTitle.textContent = task.title;
    modalTaskDesc.textContent = task.desc;
    modalTaskAssignee.textContent = task.assignee;
    modalTaskDueDate.textContent = task.dueDate;
    modalTaskPriority.textContent = task.priority;
    
    let statusLabel = 'To Do';
    if (task.status === 'in-progress') statusLabel = 'In Progress';
    if (task.status === 'done') statusLabel = 'Done';
    modalTaskStatus.textContent = statusLabel;

    taskModal.classList.add('open');
  }

  function closeTaskModal() {
    if (taskModal) {
      taskModal.classList.remove('open');
    }
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeTaskModal);
  if (modalCloseAction) modalCloseAction.addEventListener('click', closeTaskModal);
  if (taskModal) {
    taskModal.addEventListener('click', (e) => {
      if (e.target === taskModal) closeTaskModal();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && taskModal && taskModal.classList.contains('open')) {
      closeTaskModal();
    }
  });

  function renderKanban() {
    if (!colTodo || !colProg || !colDone) return;

    colTodo.innerHTML = '';
    colProg.innerHTML = '';
    colDone.innerHTML = '';

    let todoCount = 0;
    let progCount = 0;
    let doneCount = 0;

    tasksData.forEach(task => {
      const card = document.createElement('div');
      card.className = 'kanban-card';
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-id', task.id);

      let pTag = 'tag lead';
      if (task.priority === 'High') pTag = 'tag risk';
      else if (task.priority === 'Medium') pTag = 'tag wait';

      card.innerHTML = `
        <div class="kanban-card-top">
          <span class="${pTag}">${task.priority}</span>
          <span style="font-family:var(--mono); font-size:0.7rem; color:var(--slate);">${task.id.toUpperCase()}</span>
        </div>
        <div class="kanban-card-title">${task.title}</div>
        <div class="kanban-card-desc">${task.desc}</div>
        <div class="kanban-card-meta">
          <div class="kanban-assignee">
            <span class="kanban-avatar">${task.initials}</span>
            <span>${task.assignee}</span>
          </div>
          <span>${task.dueDate}</span>
        </div>
      `;

      // Click to view modal
      card.addEventListener('click', (e) => {
        openTaskModal(task.id);
      });

      // Drag Events
      card.addEventListener('dragstart', (e) => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        document.querySelectorAll('.kanban-cards-wrap').forEach(w => w.classList.remove('drop-target'));
      });

      if (task.status === 'todo') {
        colTodo.appendChild(card);
        todoCount++;
      } else if (task.status === 'in-progress') {
        colProg.appendChild(card);
        progCount++;
      } else if (task.status === 'done') {
        colDone.appendChild(card);
        doneCount++;
      }
    });

    if (countTodo) countTodo.textContent = todoCount;
    if (countProg) countProg.textContent = progCount;
    if (countDone) countDone.textContent = doneCount;
  }

  // Setup Column Drop Zones
  function setupKanbanDropZones() {
    const dropZones = [
      { el: colTodo, status: 'todo' },
      { el: colProg, status: 'in-progress' },
      { el: colDone, status: 'done' }
    ];

    dropZones.forEach(zone => {
      if (!zone.el) return;

      zone.el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        zone.el.classList.add('drop-target');
      });

      zone.el.addEventListener('dragleave', () => {
        zone.el.classList.remove('drop-target');
      });

      zone.el.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.el.classList.remove('drop-target');
        const taskId = e.dataTransfer.getData('text/plain');
        
        const task = tasksData.find(t => t.id === taskId);
        if (task && task.status !== zone.status) {
          task.status = zone.status;
          renderKanban();

          // Flash highlight on the newly dropped card
          const droppedCard = document.querySelector(`.kanban-card[data-id="${taskId}"]`);
          if (droppedCard) {
            droppedCard.classList.add('card-drop-highlight');
            setTimeout(() => {
              droppedCard.classList.remove('card-drop-highlight');
            }, 600);
          }
        }
      });
    });
  }

  // =========================================================================
  // 6. ORDERS TABLE RENDERING
  // =========================================================================

  function renderOrdersTable() {
    const ordersBody = document.getElementById('ordersTableBody');
    if (!ordersBody) return;

    ordersBody.innerHTML = ORDERS_DATA.map(o => {
      let tagClass = 'tag wait';
      if (o.status === 'Delivered') tagClass = 'tag ok';
      else if (o.status === 'Overdue') tagClass = 'tag risk';
      else if (o.status === 'Processing') tagClass = 'tag prog';

      return `
        <tr>
          <td style="font-family: var(--mono); font-weight:600;">${o.id}</td>
          <td><strong>${o.customer}</strong></td>
          <td>${o.item}</td>
          <td style="font-family: var(--mono); font-weight:600;">${o.amount}</td>
          <td><span class="${tagClass}">${o.status}</span></td>
          <td style="font-family: var(--mono); font-size: 0.78rem; color: var(--slate);">${o.date}</td>
          <td style="font-size: 0.8rem; color: var(--ink-2);">${o.method}</td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // 7. TEAM GRID RENDERING
  // =========================================================================

  function renderTeamGrid() {
    const teamGrid = document.getElementById('teamGrid');
    if (!teamGrid) return;

    // Sync Dashboard KPI card dynamically
    const dashTeamCount = document.getElementById('dashTeamCount');
    const dashTeamOnline = document.getElementById('dashTeamOnline');
    if (dashTeamCount) {
      dashTeamCount.textContent = TEAM_DATA.length;
      dashTeamCount.setAttribute('data-target-val', TEAM_DATA.length.toString());
    }
    if (dashTeamOnline) {
      const onlineCount = TEAM_DATA.filter(m => m.status === 'online').length;
      dashTeamOnline.textContent = `● ${onlineCount} online`;
    }

    teamGrid.innerHTML = TEAM_DATA.map(m => {
      const nicknameTag = m.nickname ? ` <span class="tag lead" style="font-size:0.68rem; font-weight:500; margin-left:4px; vertical-align:middle;">${m.nickname}</span>` : '';
      return `
        <div class="team-card">
          <div class="team-card-head">
            <div class="team-avatar-lg">
              ${m.initials}
              <span class="team-status-dot ${m.status}" title="${m.status}"></span>
            </div>
            <div>
              <div class="team-card-name">${m.name}${nicknameTag}</div>
              <div class="team-card-role">${m.role}</div>
            </div>
          </div>
          <div class="team-card-body">
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--slate);">Department:</span>
              <span style="font-weight:500;">${m.dept}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--slate);">Email:</span>
              <span style="font-family:var(--mono); font-size:0.75rem;">${m.email}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:4px;">
              <span style="color:var(--slate);">Active tasks:</span>
              <span class="tag lead">${m.tasks} assigned</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // 8. SALES MONTHLY CHART
  // =========================================================================

  function renderSalesMonthlyChart() {
    const chart = document.getElementById('salesMonthlyChart');
    if (!chart) return;

    const monthlyData = [
      { m: 'Jan', v: 280000 }, { m: 'Feb', v: 310000 }, { m: 'Mar', v: 420000 },
      { m: 'Apr', v: 390000 }, { m: 'May', v: 460000 }, { m: 'Jun', v: 510000 },
      { m: 'Jul', v: 440000 }, { m: 'Aug', v: 482500 }
    ];

    const max = Math.max(...monthlyData.map(d => d.v));
    chart.innerHTML = '';

    monthlyData.forEach(item => {
      const col = document.createElement('div');
      const isPeak = item.v === max;
      col.className = `col ${isPeak ? 'peak' : ''}`;
      const pct = Math.round((item.v / max) * 100);

      col.innerHTML = `
        <div class="stick" data-tooltip="${item.m}: ₹${(item.v / 100000).toFixed(2)}L" title="${item.m}: ₹${(item.v / 100000).toFixed(2)}L">
          <div class="fill" style="height: ${pct}%;"></div>
        </div>
        <span class="lbl">${item.m}</span>
      `;
      chart.appendChild(col);
    });
  }

  // =========================================================================
  // 9. NOTIFICATIONS LIST & "MARK AS READ"
  // =========================================================================

  const notifList = document.getElementById('notifList');
  const markAllReadBtn = document.getElementById('markAllReadBtn');
  const notifDotBadge = document.getElementById('notifDotBadge');

  function renderNotifications() {
    if (!notifList) return;

    notifList.innerHTML = NOTIFICATIONS_DATA.map(n => {
      return `
        <div class="notif-item ${n.unread ? 'unread' : ''}">
          <div class="notif-icon">${n.icon}</div>
          <div class="notif-body">
            <div class="notif-title">${n.title}</div>
            <div class="notif-desc">${n.desc}</div>
            <div class="notif-time">${n.time}</div>
          </div>
        </div>
      `;
    }).join('');

    // Update unread dot
    const hasUnread = NOTIFICATIONS_DATA.some(n => n.unread);
    if (notifDotBadge) {
      notifDotBadge.style.display = hasUnread ? 'block' : 'none';
    }
  }

  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', () => {
      const unreadItems = notifList ? notifList.querySelectorAll('.notif-item.unread') : [];
      if (unreadItems.length === 0) return;

      unreadItems.forEach((item, index) => {
        setTimeout(() => {
          item.classList.add('read-transition');
          item.classList.remove('unread');
        }, index * 40);
      });

      NOTIFICATIONS_DATA.forEach(n => n.unread = false);
      if (notifDotBadge) {
        setTimeout(() => {
          notifDotBadge.style.display = 'none';
        }, unreadItems.length * 40 + 50);
      }
    });
  }

  // =========================================================================
  // 10. SETTINGS TOGGLE SWITCHES & SAVE
  // =========================================================================

  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const settingsAlert = document.getElementById('settingsAlert');

  if (saveSettingsBtn && settingsAlert) {
    saveSettingsBtn.addEventListener('click', (e) => {
      e.preventDefault();

      // Tactile button pulse
      saveSettingsBtn.classList.add('btn-clicked');
      setTimeout(() => saveSettingsBtn.classList.remove('btn-clicked'), 200);

      settingsAlert.style.display = 'block';
      saveSettingsBtn.textContent = 'Saved!';
      setTimeout(() => {
        settingsAlert.style.display = 'none';
        saveSettingsBtn.textContent = 'Save Preferences';
      }, 2500);
    });
  }

  // =========================================================================
  // 11. INITIALIZATION CALLS
  // =========================================================================

  renderDashboardSalesChart();
  renderCustomersTable();
  renderKanban();
  setupKanbanDropZones();
  renderOrdersTable();
  renderTeamGrid();
  renderSalesMonthlyChart();
  renderNotifications();

  // Initial load KPI count-up on Dashboard
  animateKPIs(document.getElementById('view-dashboard'));

  console.log("OmniOS Prototype Initialized Successfully.");
});
