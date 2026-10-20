<?php
/**
 * OmniOS Dashboard Summary API Endpoint
 *
 * Provides a consolidated, multi-tenant dashboard aggregation derived exclusively
 * from verified MySQL database records.
 *
 * Rules:
 * - Scoped strictly to the authenticated user's business_id.
 * - Role-aware: Owners receive business-wide KPIs (customers, team, tasks, sales, orders);
 *   Team Members receive personal task and workflow summaries without sensitive financial or team management totals.
 * - Excludes Cancelled orders from all revenue/receivable calculations.
 * - Genuine zero values and empty arrays when no records exist (zero fabricated demo numbers).
 */

// Handle CORS Preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/session.php';

$conn = getDbConnection();

// 1. Enforce Authentication (HTTP 401 if unauthenticated)
$currentUser = requireAuth($conn);

// 2. Verify valid business context
$businessId = isset($currentUser['business_id']) ? (int) $currentUser['business_id'] : 0;
if ($businessId <= 0) {
    sendJsonResponse(403, [
        'success' => false,
        'error'   => 'Access denied. User is not associated with a valid business.'
    ]);
}

$currentUserId   = (int) $currentUser['id'];
$currentRole     = $currentUser['role'];
$businessName    = $currentUser['business_name'];
$currentUserName = $currentUser['name'];

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') {
    sendJsonResponse(405, [
        'success' => false,
        'error'   => "HTTP method $method is not supported."
    ]);
}

$currentYear  = (int) date('Y');
$currentMonth = (int) date('m');

// ----------------------------------------------------------------------------
// OWNER DASHBOARD METRICS
// ----------------------------------------------------------------------------
if ($currentRole === 'owner') {
    // 1. Total Customers in business
    $custStmt = $conn->prepare("SELECT COUNT(*) AS total FROM customers WHERE business_id = ?");
    $custStmt->bind_param("i", $businessId);
    $custStmt->execute();
    $totalCustomers = (int) $custStmt->get_result()->fetch_assoc()['total'];
    $custStmt->close();

    // 2. Active Team Members in business (excluding owners)
    $teamStmt = $conn->prepare("SELECT COUNT(*) AS total FROM users WHERE business_id = ? AND role = 'team_member' AND status = 'active'");
    $teamStmt->bind_param("i", $businessId);
    $teamStmt->execute();
    $teamMembersCount = (int) $teamStmt->get_result()->fetch_assoc()['total'];
    $teamStmt->close();

    // 3. Task counts (business-wide for Owner)
    $taskStmt = $conn->prepare("
        SELECT 
            COUNT(*) AS total_tasks,
            COALESCE(SUM(CASE WHEN status != 'done' THEN 1 ELSE 0 END), 0) AS pending_tasks,
            COALESCE(SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END), 0) AS todo_tasks,
            COALESCE(SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END), 0) AS in_progress_tasks,
            COALESCE(SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END), 0) AS completed_tasks,
            COALESCE(SUM(CASE WHEN priority = 'High' AND status != 'done' THEN 1 ELSE 0 END), 0) AS high_priority_tasks
        FROM tasks 
        WHERE business_id = ?
    ");
    $taskStmt->bind_param("i", $businessId);
    $taskStmt->execute();
    $taskCounts = $taskStmt->get_result()->fetch_assoc();
    $taskStmt->close();

    // 4. Sales and Revenue Metrics (Delivered only for revenue; Cancelled strictly excluded)
    // MTD Delivered Sales
    $mtdStmt = $conn->prepare("
        SELECT COALESCE(SUM(total_amount), 0) AS mtd_sales
        FROM orders
        WHERE business_id = ? AND status = 'Delivered' AND YEAR(order_date) = ? AND MONTH(order_date) = ?
    ");
    $mtdStmt->bind_param("iii", $businessId, $currentYear, $currentMonth);
    $mtdStmt->execute();
    $salesMtd = (float) $mtdStmt->get_result()->fetch_assoc()['mtd_sales'];
    $mtdStmt->close();

    // Pending Receivables
    $pendStmt = $conn->prepare("
        SELECT COALESCE(SUM(total_amount), 0) AS pending_total,
               COUNT(*) AS pending_orders
        FROM orders
        WHERE business_id = ? AND status IN ('Pending', 'Processing')
    ");
    $pendStmt->bind_param("i", $businessId);
    $pendStmt->execute();
    $pendRow = $pendStmt->get_result()->fetch_assoc();
    $pendingReceivables = (float) $pendRow['pending_total'];
    $pendingOrdersCount = (int) $pendRow['pending_orders'];
    $pendStmt->close();

    // 5. Weekly Sales Performance (current week: Mon - Sun)
    // Find Monday of current week
    $mondayTimestamp = strtotime('monday this week');
    $sundayTimestamp = strtotime('sunday this week');
    $mondayDate = date('Y-m-d', $mondayTimestamp);
    $sundayDate = date('Y-m-d', $sundayTimestamp);

    $weekStmt = $conn->prepare("
        SELECT DATE(order_date) AS o_date, COALESCE(SUM(total_amount), 0) AS day_total
        FROM orders
        WHERE business_id = ? AND status = 'Delivered' AND order_date BETWEEN ? AND ?
        GROUP BY DATE(order_date)
    ");
    $weekStmt->bind_param("iss", $businessId, $mondayDate, $sundayDate);
    $weekStmt->execute();
    $weekRes = $weekStmt->get_result();
    $weekMap = [];
    while ($wRow = $weekRes->fetch_assoc()) {
        $weekMap[$wRow['o_date']] = (float) $wRow['day_total'];
    }
    $weekStmt->close();

    $weeklySales = [];
    $daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for ($i = 0; $i < 7; $i++) {
        $dayDate = date('Y-m-d', strtotime("+$i days", $mondayTimestamp));
        $weeklySales[] = [
            'day'    => $daysOfWeek[$i],
            'date'   => $dayDate,
            'amount' => isset($weekMap[$dayDate]) ? $weekMap[$dayDate] : 0.0
        ];
    }

    // 6. Recent Orders (latest 4 orders)
    $ordersStmt = $conn->prepare("
        SELECT o.id, o.order_number, o.item_summary, o.total_amount, o.status, o.order_date,
               c.name AS customer_name, c.company AS customer_company
        FROM orders o
        INNER JOIN customers c ON o.customer_id = c.id
        WHERE o.business_id = ?
        ORDER BY o.order_date DESC, o.id DESC
        LIMIT 4
    ");
    $ordersStmt->bind_param("i", $businessId);
    $ordersStmt->execute();
    $ordersRes = $ordersStmt->get_result();
    $recentOrders = [];
    while ($o = $ordersRes->fetch_assoc()) {
        $recentOrders[] = [
            'id'       => $o['order_number'],
            'order_id' => (int) $o['id'],
            'customer' => $o['customer_name'],
            'company'  => $o['customer_company'],
            'item'     => $o['item_summary'],
            'status'   => $o['status'],
            'amount'   => (float) $o['total_amount'],
            'date'     => date('d M Y', strtotime($o['order_date']))
        ];
    }
    $ordersStmt->close();

    // 7. Recent Updates (Aggregated from real order & task timestamps)
    $updates = [];

    // Recent orders updates
    $roStmt = $conn->prepare("
        SELECT o.order_number, o.status, o.total_amount, o.created_at, c.name AS customer_name
        FROM orders o
        INNER JOIN customers c ON o.customer_id = c.id
        WHERE o.business_id = ?
        ORDER BY o.created_at DESC
        LIMIT 5
    ");
    $roStmt->bind_param("i", $businessId);
    $roStmt->execute();
    $roRes = $roStmt->get_result();
    while ($ro = $roRes->fetch_assoc()) {
        $updates[] = [
            'type'      => 'order',
            'icon'      => '📦',
            'title'     => "Order {$ro['order_number']}",
            'text'      => "Order <b>{$ro['order_number']}</b> (₹" . number_format($ro['total_amount']) . ") placed for <b>{$ro['customer_name']}</b>.",
            'timestamp' => $ro['created_at'],
            'time'      => date('d M, h:i A', strtotime($ro['created_at']))
        ];
    }
    $roStmt->close();

    // Recent tasks updates
    $rtStmt = $conn->prepare("
        SELECT t.title, t.status, t.priority, t.created_at, u.name AS assignee_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.business_id = ?
        ORDER BY t.created_at DESC
        LIMIT 5
    ");
    $rtStmt->bind_param("i", $businessId);
    $rtStmt->execute();
    $rtRes = $rtStmt->get_result();
    while ($rt = $rtRes->fetch_assoc()) {
        $assigneeStr = $rt['assignee_name'] ? " assigned to <b>{$rt['assignee_name']}</b>" : '';
        $updates[] = [
            'type'      => 'task',
            'icon'      => $rt['status'] === 'done' ? '✅' : '📋',
            'title'     => $rt['title'],
            'text'      => "Task <b>\"{$rt['title']}\"</b> ({$rt['status']})$assigneeStr.",
            'timestamp' => $rt['created_at'],
            'time'      => date('d M, h:i A', strtotime($rt['created_at']))
        ];
    }
    $rtStmt->close();

    // Sort combined updates by timestamp descending and take top 5
    usort($updates, function ($a, $b) {
        return strtotime($b['timestamp']) - strtotime($a['timestamp']);
    });
    $recentUpdates = array_slice($updates, 0, 5);

    // 8. Dynamic Rule-Based Business Insights from Real Records
    $insights = [];
    $highPriCount = (int) $taskCounts['high_priority_tasks'];
    if ($highPriCount > 0) {
        $insights[] = [
            'level' => 'warning',
            'title' => "$highPriCount high-priority task" . ($highPriCount === 1 ? '' : 's') . " pending",
            'text'  => "Requires immediate team attention on the task board."
        ];
    }

    if ($pendingOrdersCount > 0) {
        $insights[] = [
            'level' => 'info',
            'title' => "$pendingOrdersCount order" . ($pendingOrdersCount === 1 ? '' : 's') . " awaiting fulfillment",
            'text'  => "Total pipeline receivables: ₹" . number_format($pendingReceivables) . "."
        ];
    }

    if ($salesMtd > 0) {
        $insights[] = [
            'level' => 'success',
            'title' => "₹" . number_format($salesMtd) . " collected this month",
            'text'  => "Delivered revenue realized for " . date('F Y') . "."
        ];
    }

    if ($totalCustomers > 0 && $teamMembersCount === 0) {
        $insights[] = [
            'level' => 'info',
            'title' => "Add team members to scale fulfillment",
            'text'  => "Currently managing $totalCustomers customer accounts directly."
        ];
    }

    sendJsonResponse(200, [
        'success' => true,
        'role'    => 'owner',
        'data'    => [
            'business' => [
                'id'   => $businessId,
                'name' => $businessName,
            ],
            'user' => [
                'id'   => $currentUserId,
                'name' => $currentUserName,
                'role' => $currentRole
            ],
            'kpis' => [
                'sales_mtd'           => $salesMtd,
                'pending_tasks'       => (int) $taskCounts['pending_tasks'],
                'high_priority_tasks' => $highPriCount,
                'todo_tasks'          => (int) $taskCounts['todo_tasks'],
                'in_progress_tasks'   => (int) $taskCounts['in_progress_tasks'],
                'completed_tasks'     => (int) $taskCounts['completed_tasks'],
                'total_tasks'         => (int) $taskCounts['total_tasks'],
                'total_customers'     => $totalCustomers,
                'team_members_count'  => $teamMembersCount,
                'pending_receivables' => $pendingReceivables,
                'pending_orders'      => $pendingOrdersCount
            ],
            'weekly_sales'   => $weeklySales,
            'recent_orders'  => $recentOrders,
            'recent_updates' => $recentUpdates,
            'insights'       => $insights
        ]
    ]);
}

// ----------------------------------------------------------------------------
// TEAM MEMBER DASHBOARD METRICS (Personalized, no sensitive financial data)
// ----------------------------------------------------------------------------
if ($currentRole === 'team_member') {
    // 1. Task counts strictly assigned to this member
    $tmTaskStmt = $conn->prepare("
        SELECT 
            COUNT(*) AS total_tasks,
            COALESCE(SUM(CASE WHEN status != 'done' THEN 1 ELSE 0 END), 0) AS pending_tasks,
            COALESCE(SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END), 0) AS todo_tasks,
            COALESCE(SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END), 0) AS in_progress_tasks,
            COALESCE(SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END), 0) AS completed_tasks,
            COALESCE(SUM(CASE WHEN priority = 'High' AND status != 'done' THEN 1 ELSE 0 END), 0) AS high_priority_tasks
        FROM tasks 
        WHERE business_id = ? AND assigned_to = ?
    ");
    $tmTaskStmt->bind_param("ii", $businessId, $currentUserId);
    $tmTaskStmt->execute();
    $tmTaskCounts = $tmTaskStmt->get_result()->fetch_assoc();
    $tmTaskStmt->close();

    // 2. Member's latest assigned tasks
    $myTasksStmt = $conn->prepare("
        SELECT id, title, description, status, priority, due_date, created_at
        FROM tasks
        WHERE business_id = ? AND assigned_to = ?
        ORDER BY created_at DESC
        LIMIT 5
    ");
    $myTasksStmt->bind_param("ii", $businessId, $currentUserId);
    $myTasksStmt->execute();
    $myTasksRes = $myTasksStmt->get_result();
    $myTasks = [];
    while ($t = $myTasksRes->fetch_assoc()) {
        $myTasks[] = [
            'id'       => (int) $t['id'],
            'title'    => $t['title'],
            'status'   => $t['status'],
            'priority' => $t['priority'],
            'due_date' => $t['due_date'],
            'date'     => date('d M Y', strtotime($t['created_at']))
        ];
    }
    $myTasksStmt->close();

    // 3. Member's recent task updates
    $myUpdates = [];
    foreach ($myTasks as $mt) {
        $myUpdates[] = [
            'type'      => 'task',
            'icon'      => $mt['status'] === 'done' ? '✅' : '📋',
            'title'     => $mt['title'],
            'text'      => "Assigned task <b>\"{$mt['title']}\"</b> ({$mt['status']}).",
            'time'      => $mt['date']
        ];
    }

    // 4. Personalized Insights
    $tmInsights = [];
    $myHighPri = (int) $tmTaskCounts['high_priority_tasks'];
    $myPending = (int) $tmTaskCounts['pending_tasks'];
    if ($myHighPri > 0) {
        $tmInsights[] = [
            'level' => 'warning',
            'title' => "$myHighPri high-priority task" . ($myHighPri === 1 ? '' : 's') . " assigned to you",
            'text'  => "Please prioritize these items on your task board."
        ];
    }
    if ($myPending > 0) {
        $tmInsights[] = [
            'level' => 'info',
            'title' => "$myPending active task" . ($myPending === 1 ? '' : 's') . " in your queue",
            'text'  => "Update your task status as you make progress."
        ];
    } else {
        $tmInsights[] = [
            'level' => 'success',
            'title' => "All assigned tasks completed!",
            'text'  => "Great job, your current task queue is clear."
        ];
    }

    sendJsonResponse(200, [
        'success' => true,
        'role'    => 'team_member',
        'data'    => [
            'business' => [
                'id'   => $businessId,
                'name' => $businessName,
            ],
            'user' => [
                'id'   => $currentUserId,
                'name' => $currentUserName,
                'role' => $currentRole
            ],
            'kpis' => [
                'pending_tasks'       => $myPending,
                'high_priority_tasks' => $myHighPri,
                'todo_tasks'          => (int) $tmTaskCounts['todo_tasks'],
                'in_progress_tasks'   => (int) $tmTaskCounts['in_progress_tasks'],
                'completed_tasks'     => (int) $tmTaskCounts['completed_tasks'],
                'total_tasks'         => (int) $tmTaskCounts['total_tasks']
            ],
            'my_tasks'       => $myTasks,
            'recent_updates' => $myUpdates,
            'insights'       => $tmInsights
        ]
    ]);
}

sendJsonResponse(403, [
    'success' => false,
    'error'   => 'Unrecognized role context.'
]);
