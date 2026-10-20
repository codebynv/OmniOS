<?php
/**
 * OmniOS Analytics & Operational Intelligence API Endpoint
 *
 * Implements prepared statement queries for multi-tenant analytics:
 * - Scoped strictly to the authenticated user's business_id.
 * - Role-aware: Owners receive business-wide fulfillment, revenue, customer LTV, and workload metrics;
 *   Team Members receive personal task workload and completion analytics without sensitive financial data.
 * - Supports date range filtering ('all', '30d', '90d', 'year', or custom 'from' and 'to').
 * - Strictly excludes Cancelled orders from revenue metrics.
 * - Return genuine zero values and clear unavailable indicators when records are absent.
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

$currentUserId = (int) $currentUser['id'];
$currentRole   = $currentUser['role'];
$businessName  = $currentUser['business_name'];
$method        = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    sendJsonResponse(405, [
        'success' => false,
        'error'   => "HTTP method $method is not supported."
    ]);
}

// 3. Process & Validate Date Filters
$range = isset($_GET['range']) ? trim($_GET['range']) : 'all';
$fromDate = isset($_GET['from']) ? trim($_GET['from']) : '';
$toDate   = isset($_GET['to']) ? trim($_GET['to']) : '';

if ($fromDate !== '' || $toDate !== '') {
    // Validate custom date format YYYY-MM-DD
    if ($fromDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate)) {
        sendJsonResponse(422, [
            'success' => false,
            'error'   => "Invalid 'from' date format. Use YYYY-MM-DD."
        ]);
    }
    if ($toDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate)) {
        sendJsonResponse(422, [
            'success' => false,
            'error'   => "Invalid 'to' date format. Use YYYY-MM-DD."
        ]);
    }
    if ($fromDate !== '' && $toDate !== '' && strtotime($fromDate) > strtotime($toDate)) {
        sendJsonResponse(422, [
            'success' => false,
            'error'   => "Invalid date range: 'from' date cannot be after 'to' date."
        ]);
    }
} else {
    // Standard range presets
    if ($range === '30d') {
        $fromDate = date('Y-m-d', strtotime('-30 days'));
        $toDate   = date('Y-m-d');
    } elseif ($range === '90d') {
        $fromDate = date('Y-m-d', strtotime('-90 days'));
        $toDate   = date('Y-m-d');
    } elseif ($range === 'year') {
        $fromDate = date('Y-01-01');
        $toDate   = date('Y-12-31');
    }
}

// ----------------------------------------------------------------------------
// OWNER ANALYTICS
// ----------------------------------------------------------------------------
if ($currentRole === 'owner') {
    // Date condition fragments for orders
    $orderDateSql = "";
    $orderParams = [$businessId];
    $orderTypes  = "i";

    if ($fromDate !== '') {
        $orderDateSql .= " AND order_date >= ?";
        $orderParams[] = $fromDate;
        $orderTypes   .= "s";
    }
    if ($toDate !== '') {
        $orderDateSql .= " AND order_date <= ?";
        $orderParams[] = $toDate;
        $orderTypes   .= "s";
    }

    // 1. Order Status Breakdown & Revenue
    $orderSql = "
        SELECT 
            status,
            COUNT(*) AS order_count,
            COALESCE(SUM(total_amount), 0) AS status_total
        FROM orders
        WHERE business_id = ? $orderDateSql
        GROUP BY status
    ";
    $ordStmt = $conn->prepare($orderSql);
    $ordStmt->bind_param($orderTypes, ...$orderParams);
    $ordStmt->execute();
    $ordRes = $ordStmt->get_result();

    $ordersByStatus = [
        'Delivered'  => ['count' => 0, 'amount' => 0.0],
        'Processing' => ['count' => 0, 'amount' => 0.0],
        'Pending'    => ['count' => 0, 'amount' => 0.0],
        'Cancelled'  => ['count' => 0, 'amount' => 0.0]
    ];
    $totalOrders = 0;
    $totalAmountAll = 0.0;

    while ($r = $ordRes->fetch_assoc()) {
        $st = $r['status'];
        $cnt = (int) $r['order_count'];
        $amt = (float) $r['status_total'];
        if (isset($ordersByStatus[$st])) {
            $ordersByStatus[$st] = ['count' => $cnt, 'amount' => $amt];
        }
        $totalOrders += $cnt;
        $totalAmountAll += $amt;
    }
    $ordStmt->close();

    $deliveredCount  = $ordersByStatus['Delivered']['count'];
    $deliveredAmount = $ordersByStatus['Delivered']['amount'];

    $pendingCount    = $ordersByStatus['Pending']['count'];
    $pendingAmount   = $ordersByStatus['Pending']['amount'];

    $processingCount = $ordersByStatus['Processing']['count'];
    $processingAmount= $ordersByStatus['Processing']['amount'];

    $cancelledCount  = $ordersByStatus['Cancelled']['count'];
    $cancelledAmount = $ordersByStatus['Cancelled']['amount'];

    $activeOrdersCount = $deliveredCount + $processingCount + $pendingCount;
    $activeOrdersAmount= $deliveredAmount + $processingAmount + $pendingAmount;

    // Fulfillment Rate
    $fulfillmentRate = $activeOrdersCount > 0 ? round(($deliveredCount / $activeOrdersCount) * 100, 1) : 0.0;

    // Pending Receivables (Pending + Processing)
    $pendingReceivables = round($pendingAmount + $processingAmount, 2);

    // 2. Customers Analytics
    $custCountStmt = $conn->prepare("SELECT COUNT(*) AS total FROM customers WHERE business_id = ?");
    $custCountStmt->bind_param("i", $businessId);
    $custCountStmt->execute();
    $totalCustomers = (int) $custCountStmt->get_result()->fetch_assoc()['total'];
    $custCountStmt->close();

    // Customers with orders
    $custWithOrdersStmt = $conn->prepare("
        SELECT COUNT(DISTINCT customer_id) AS total
        FROM orders
        WHERE business_id = ? AND status != 'Cancelled'
    ");
    $custWithOrdersStmt->bind_param("i", $businessId);
    $custWithOrdersStmt->execute();
    $customersWithOrders = (int) $custWithOrdersStmt->get_result()->fetch_assoc()['total'];
    $custWithOrdersStmt->close();

    // Client Account Penetration Rate
    $customerPenetrationRate = $totalCustomers > 0 ? round(($customersWithOrders / $totalCustomers) * 100, 1) : 0.0;

    // Realized Average Customer LTV (Delivered revenue / Total customers)
    $avgCustomerLtv = $totalCustomers > 0 ? round($deliveredAmount / $totalCustomers, 2) : 0.0;

    // 3. Task Completion & Workload Analytics
    $taskDateSql = "";
    $taskParams  = [$businessId];
    $taskTypes   = "i";
    if ($fromDate !== '') {
        $taskDateSql .= " AND created_at >= ?";
        $taskParams[] = $fromDate . ' 00:00:00';
        $taskTypes   .= "s";
    }
    if ($toDate !== '') {
        $taskDateSql .= " AND created_at <= ?";
        $taskParams[] = $toDate . ' 23:59:59';
        $taskTypes   .= "s";
    }

    $taskSql = "
        SELECT 
            COUNT(*) AS total_tasks,
            COALESCE(SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END), 0) AS completed_tasks,
            COALESCE(SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END), 0) AS in_progress_tasks,
            COALESCE(SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END), 0) AS todo_tasks,
            COALESCE(SUM(CASE WHEN priority = 'High' AND status != 'done' THEN 1 ELSE 0 END), 0) AS high_priority_tasks
        FROM tasks
        WHERE business_id = ? $taskDateSql
    ";
    $tskStmt = $conn->prepare($taskSql);
    $tskStmt->bind_param($taskTypes, ...$taskParams);
    $tskStmt->execute();
    $tRow = $tskStmt->get_result()->fetch_assoc();
    $tskStmt->close();

    $totalTasks      = (int) $tRow['total_tasks'];
    $completedTasks  = (int) $tRow['completed_tasks'];
    $inProgressTasks = (int) $tRow['in_progress_tasks'];
    $todoTasks       = (int) $tRow['todo_tasks'];
    $highPriTasks    = (int) $tRow['high_priority_tasks'];

    $taskCompletionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 1) : 0.0;

    // 4. Team Workload
    $teamStmt = $conn->prepare("SELECT COUNT(*) AS total FROM users WHERE business_id = ? AND role = 'team_member' AND status = 'active'");
    $teamStmt->bind_param("i", $businessId);
    $teamStmt->execute();
    $activeTeamMembers = (int) $teamStmt->get_result()->fetch_assoc()['total'];
    $teamStmt->close();

    $avgTasksPerMember = $activeTeamMembers > 0 ? round($totalTasks / $activeTeamMembers, 1) : 0.0;

    // 5. Build Channel / Status Breakdown Array for UI
    $statusBreakdown = [];
    $statusColors = [
        'Delivered'  => 'var(--signal)',
        'Processing' => 'var(--accent-primary)',
        'Pending'    => 'var(--slate)',
        'Cancelled'  => 'var(--danger)'
    ];

    foreach (['Delivered', 'Processing', 'Pending', 'Cancelled'] as $stKey) {
        $c = $ordersByStatus[$stKey]['count'];
        $a = $ordersByStatus[$stKey]['amount'];
        $pct = $totalOrders > 0 ? round(($c / $totalOrders) * 100, 1) : 0.0;
        $statusBreakdown[] = [
            'label'   => $stKey . ($stKey === 'Delivered' ? ' (Fulfilled)' : ''),
            'status'  => $stKey,
            'count'   => $c,
            'percent' => $pct,
            'amount'  => $a,
            'color'   => $statusColors[$stKey]
        ];
    }

    // 6. Outstanding Receivables Ratio
    $totalReceivablePool = $deliveredAmount + $pendingReceivables;
    $receivablesRatio = $totalReceivablePool > 0 ? round(($pendingReceivables / $totalReceivablePool) * 100, 1) : 0.0;

    // Average Order Value
    $avgOrderValue = $activeOrdersCount > 0 ? round($activeOrdersAmount / $activeOrdersCount, 2) : 0.0;

    sendJsonResponse(200, [
        'success' => true,
        'role'    => 'owner',
        'data'    => [
            'business' => [
                'id'   => $businessId,
                'name' => $businessName
            ],
            'filters' => [
                'range' => $range,
                'from'  => $fromDate,
                'to'    => $toDate
            ],
            'kpis' => [
                'fulfillment_rate' => [
                    'value' => $fulfillmentRate . '%',
                    'rate'  => $fulfillmentRate,
                    'delta' => $activeOrdersCount > 0 ? "$deliveredCount of $activeOrdersCount orders fulfilled" : 'No orders in ledger',
                    'trend' => $fulfillmentRate >= 50 ? 'up' : 'neutral'
                ],
                'task_completion_rate' => [
                    'value' => $taskCompletionRate . '%',
                    'rate'  => $taskCompletionRate,
                    'delta' => $totalTasks > 0 ? "$completedTasks of $totalTasks milestones reached" : 'No tasks logged',
                    'trend' => $taskCompletionRate >= 50 ? 'up' : 'neutral'
                ],
                'avg_customer_ltv' => [
                    'value'  => $avgCustomerLtv,
                    'amount' => $avgCustomerLtv,
                    'delta'  => $totalCustomers > 0 ? "Across $totalCustomers client accounts" : 'No customer records',
                    'trend'  => $avgCustomerLtv > 0 ? 'up' : 'neutral'
                ],
                'receivables_ratio' => [
                    'value'  => $receivablesRatio . '%',
                    'amount' => $pendingReceivables,
                    'delta'  => $pendingReceivables > 0 ? "₹" . number_format($pendingReceivables) . " pending settlement" : 'Zero outstanding balance',
                    'trend'  => $pendingReceivables > 0 ? 'down' : 'up'
                ]
            ],
            'status_breakdown' => $statusBreakdown,
            'benchmarks' => [
                'avg_order_value' => [
                    'label' => 'Average Commercial Order Value',
                    'value' => $avgOrderValue,
                    'note'  => $activeOrdersCount > 0 ? "Calculated across $activeOrdersCount active commercial orders." : 'No order transaction history.'
                ],
                'customer_penetration' => [
                    'label' => 'Client Order Conversion',
                    'value' => $customerPenetrationRate . '%',
                    'note'  => $totalCustomers > 0 ? "$customersWithOrders of $totalCustomers registered clients have active orders." : 'No registered clients.'
                ],
                'team_workload' => [
                    'label' => 'Average Tasks per Team Member',
                    'value' => (string) $avgTasksPerMember,
                    'note'  => $activeTeamMembers > 0 ? "Distributed across $activeTeamMembers active team members." : 'No active team members.'
                ]
            ],
            'raw_totals' => [
                'total_orders'       => $totalOrders,
                'delivered_revenue'  => $deliveredAmount,
                'pending_receivables'=> $pendingReceivables,
                'cancelled_orders'   => $cancelledCount,
                'total_customers'    => $totalCustomers,
                'total_tasks'        => $totalTasks
            ]
        ]
    ]);
}

// ----------------------------------------------------------------------------
// TEAM MEMBER ANALYTICS (Personalized, no financial or company metrics)
// ----------------------------------------------------------------------------
if ($currentRole === 'team_member') {
    $taskDateSql = "";
    $taskParams  = [$businessId, $currentUserId];
    $taskTypes   = "ii";

    if ($fromDate !== '') {
        $taskDateSql .= " AND created_at >= ?";
        $taskParams[] = $fromDate . ' 00:00:00';
        $taskTypes   .= "s";
    }
    if ($toDate !== '') {
        $taskDateSql .= " AND created_at <= ?";
        $taskParams[] = $toDate . ' 23:59:59';
        $taskTypes   .= "s";
    }

    $tmSql = "
        SELECT 
            COUNT(*) AS total_tasks,
            COALESCE(SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END), 0) AS completed_tasks,
            COALESCE(SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END), 0) AS in_progress_tasks,
            COALESCE(SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END), 0) AS todo_tasks,
            COALESCE(SUM(CASE WHEN priority = 'High' AND status != 'done' THEN 1 ELSE 0 END), 0) AS high_priority_tasks
        FROM tasks
        WHERE business_id = ? AND assigned_to = ? $taskDateSql
    ";
    $tmStmt = $conn->prepare($tmSql);
    $tmStmt->bind_param($taskTypes, ...$taskParams);
    $tmStmt->execute();
    $tmRow = $tmStmt->get_result()->fetch_assoc();
    $tmStmt->close();

    $myTotal       = (int) $tmRow['total_tasks'];
    $myCompleted   = (int) $tmRow['completed_tasks'];
    $myInProgress  = (int) $tmRow['in_progress_tasks'];
    $myTodo        = (int) $tmRow['todo_tasks'];
    $myHighPri     = (int) $tmRow['high_priority_tasks'];

    $myCompletionRate = $myTotal > 0 ? round(($myCompleted / $myTotal) * 100, 1) : 0.0;

    $taskBreakdown = [
        ['label' => 'Completed Tasks',   'count' => $myCompleted,   'percent' => $myTotal > 0 ? round(($myCompleted / $myTotal) * 100, 1) : 0.0, 'color' => 'var(--signal)'],
        ['label' => 'In Progress Tasks', 'count' => $myInProgress,  'percent' => $myTotal > 0 ? round(($myInProgress / $myTotal) * 100, 1) : 0.0, 'color' => 'var(--accent-primary)'],
        ['label' => 'To Do Backlog',     'count' => $myTodo,        'percent' => $myTotal > 0 ? round(($myTodo / $myTotal) * 100, 1) : 0.0, 'color' => 'var(--slate)']
    ];

    sendJsonResponse(200, [
        'success' => true,
        'role'    => 'team_member',
        'data'    => [
            'business' => [
                'id'   => $businessId,
                'name' => $businessName
            ],
            'filters' => [
                'range' => $range,
                'from'  => $fromDate,
                'to'    => $toDate
            ],
            'kpis' => [
                'personal_completion_rate' => [
                    'value' => $myCompletionRate . '%',
                    'rate'  => $myCompletionRate,
                    'delta' => $myTotal > 0 ? "$myCompleted of $myTotal milestones completed" : 'No tasks assigned',
                    'trend' => $myCompletionRate >= 50 ? 'up' : 'neutral'
                ],
                'pending_tasks' => [
                    'value' => (string) ($myTodo + $myInProgress),
                    'delta' => $myHighPri > 0 ? "$myHighPri high-priority tasks in queue" : 'No high-priority blockers',
                    'trend' => $myHighPri > 0 ? 'down' : 'up'
                ],
                'completed_milestones' => [
                    'value' => (string) $myCompleted,
                    'delta' => 'Finished task milestones',
                    'trend' => 'up'
                ],
                'total_assigned' => [
                    'value' => (string) $myTotal,
                    'delta' => 'Assigned to your profile',
                    'trend' => 'neutral'
                ]
            ],
            'status_breakdown' => $taskBreakdown,
            'benchmarks' => [
                'focus_rate' => [
                    'label' => 'Active In-Progress Ratio',
                    'value' => ($myTotal > 0 ? round(($myInProgress / $myTotal) * 100, 1) : 0.0) . '%',
                    'note'  => "$myInProgress tasks currently in progress."
                ],
                'high_priority_ratio' => [
                    'label' => 'Urgent Queue Ratio',
                    'value' => ($myTotal > 0 ? round(($myHighPri / $myTotal) * 100, 1) : 0.0) . '%',
                    'note'  => "$myHighPri high-priority tasks in queue."
                ]
            ]
        ]
    ]);
}

sendJsonResponse(403, [
    'success' => false,
    'error'   => 'Unrecognized role context.'
]);
